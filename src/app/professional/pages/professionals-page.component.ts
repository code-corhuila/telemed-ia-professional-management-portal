import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  PROFESSIONAL_DATA_SOURCE,
  ProfessionalDataSource,
} from '../data/professional-data-source';
import { RegisterProfessionalFormComponent } from '../components/register-professional-form.component';
import { Professional, ProfessionalStatus } from '../model/professional';
import { asApiError } from '../../shell-contract';

type ViewState = 'loading' | 'error' | 'empty' | 'data';

/** A failed load, as the shell client normalised it. */
interface LoadFailure {
  readonly message: string;
  readonly traceId?: string;
}

/** Administration page of the professional profiles. */
@Component({
  selector: 'app-professionals-page',
  standalone: true,
  imports: [RegisterProfessionalFormComponent],
  templateUrl: './professionals-page.component.html',
  styleUrl: './professionals-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPageComponent {
  private readonly dataSource: ProfessionalDataSource = inject(PROFESSIONAL_DATA_SOURCE);

  readonly viewState = signal<ViewState>('loading');
  readonly professionals = signal<readonly Professional[]>([]);
  readonly total = signal(0);
  readonly loadingMore = signal(false);
  readonly failure = signal<LoadFailure | null>(null);
  readonly formOpen = signal(false);
  /** The profile whose status is being changed, so only its button waits. */
  readonly changingId = signal<string | null>(null);
  readonly statusFailure = signal<(LoadFailure & { readonly professionalId: string }) | null>(null);
  /** License of the last professional registered, announced above the list. */
  readonly lastRegistered = signal<string | null>(null);

  private readonly page = signal(1);
  private readonly totalPages = signal(1);
  readonly hasMore = computed(() => this.page() < this.totalPages());

  /** Only the answer of the newest request is shown (Anexo H). */
  private latestRequest = 0;

  constructor() {
    void this.load();
  }

  async retryLoad(): Promise<void> {
    await this.load();
  }

  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }
    const request = ++this.latestRequest;
    this.loadingMore.set(true);
    try {
      const next = await this.dataSource.listProfessionals(this.page() + 1);
      if (request !== this.latestRequest) {
        return;
      }
      this.professionals.update((current) => [...current, ...next.data]);
      this.page.set(next.meta.page);
      this.totalPages.set(next.meta.totalPages);
      this.total.set(next.meta.total);
    } catch (error: unknown) {
      if (request === this.latestRequest) {
        this.fail(error);
      }
    } finally {
      this.loadingMore.set(false);
    }
  }

  toggleForm(): void {
    this.formOpen.update((open) => !open);
    this.lastRegistered.set(null);
  }

  /** The new professional appears in its place by license order, so the list is read again. */
  async onRegistered(professional: Professional): Promise<void> {
    this.formOpen.set(false);
    this.lastRegistered.set(professional.licenseNumber);
    await this.load();
  }

  async toggleStatus(professional: Professional): Promise<void> {
    if (this.changingId() !== null) {
      return;
    }
    const next: ProfessionalStatus = professional.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.changingId.set(professional.id);
    this.statusFailure.set(null);
    try {
      const changed = await this.dataSource.changeStatus(professional.id, next);
      // The change answers without the account's name, so the card keeps the one it has.
      this.professionals.update((items) =>
        items.map((item) =>
          item.id === changed.id
            ? { ...changed, fullName: changed.fullName ?? item.fullName, email: changed.email ?? item.email }
            : item,
        ),
      );
    } catch (error: unknown) {
      this.statusFailure.set({ ...toFailure(error), professionalId: professional.id });
    } finally {
      this.changingId.set(null);
    }
  }

  experience(years: number): string {
    return `${years} ${years === 1 ? 'año' : 'años'} de experiencia`;
  }

  private async load(): Promise<void> {
    const request = ++this.latestRequest;
    this.viewState.set('loading');
    this.failure.set(null);
    try {
      const first = await this.dataSource.listProfessionals(1);
      if (request !== this.latestRequest) {
        return;
      }
      this.professionals.set(first.data);
      this.page.set(first.meta.page);
      this.totalPages.set(first.meta.totalPages);
      this.total.set(first.meta.total);
      this.viewState.set(first.data.length === 0 ? 'empty' : 'data');
    } catch (error: unknown) {
      if (request === this.latestRequest) {
        this.fail(error);
      }
    }
  }

  private fail(error: unknown): void {
    this.failure.set(toFailure(error));
    this.viewState.set('error');
  }
}

function toFailure(error: unknown): LoadFailure {
  const { message, traceId } = asApiError(error, 'No pudimos cargar los profesionales.');
  return { message, traceId };
}
