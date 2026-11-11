import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { asApiError } from '../../shell-contract';
import {
  PROFESSIONAL_DATA_SOURCE,
  ProfessionalDataSource,
} from '../data/professional-data-source';
import { Professional } from '../model/professional';

type ViewState = 'loading' | 'data' | 'missing' | 'error';

interface LoadFailure {
  readonly message: string;
  readonly traceId?: string;
}

/** Profile of the signed-in professional (DEC-016). Read only: an administrator manages it. */
@Component({
  selector: 'app-own-profile-page',
  standalone: true,
  templateUrl: './own-profile-page.component.html',
  styleUrl: './own-profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnProfilePageComponent implements OnInit {
  private readonly dataSource: ProfessionalDataSource = inject(PROFESSIONAL_DATA_SOURCE);

  readonly viewState = signal<ViewState>('loading');
  readonly profile = signal<Professional | null>(null);
  readonly failure = signal<LoadFailure | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.viewState.set('loading');
    this.failure.set(null);
    try {
      this.profile.set(await this.dataSource.getOwnProfessional());
      this.viewState.set('data');
    } catch (error) {
      const apiError = asApiError(error, 'No se pudo cargar tu perfil.');
      if (apiError.status === 404) {
        this.viewState.set('missing');
        return;
      }
      this.failure.set({ message: apiError.message, traceId: apiError.traceId });
      this.viewState.set('error');
    }
  }

  /** Two initials of the name, skipping a title such as "Dr.". */
  initials(name: string | undefined): string {
    const words = (name ?? '').split(/\s+/).filter((word) => word && !word.endsWith('.'));
    return words.slice(0, 2).map((word) => word[0].toUpperCase()).join('') || 'P';
  }
}
