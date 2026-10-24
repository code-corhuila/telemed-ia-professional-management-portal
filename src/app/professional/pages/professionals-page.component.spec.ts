import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  PROFESSIONAL_DATA_SOURCE,
  ProfessionalDataSource,
} from '../data/professional-data-source';
import { Page } from '../model/page';
import { Professional } from '../model/professional';
import { ProfessionalsPageComponent } from './professionals-page.component';

function professional(id: string, overrides: Partial<Professional> = {}): Professional {
  return {
    id,
    identityUserId: `account-${id}`,
    licenseNumber: `RM-${id}`,
    professionalType: 'GENERAL_PRACTITIONER',
    status: 'ACTIVE',
    yearsExperience: 7,
    ...overrides,
  };
}

function pageOf(
  data: readonly Professional[],
  page = 1,
  totalPages = 1,
  total = data.length,
): Page<Professional> {
  return { data, meta: { page, limit: 20, total, totalPages } };
}

async function setup(reads: Pick<ProfessionalDataSource, 'listProfessionals'>): Promise<{
  component: ProfessionalsPageComponent;
  fixture: ComponentFixture<ProfessionalsPageComponent>;
}> {
  await TestBed.configureTestingModule({
    imports: [ProfessionalsPageComponent],
    providers: [{ provide: PROFESSIONAL_DATA_SOURCE, useValue: withoutRegistration(reads) }],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProfessionalsPageComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture };
}

/** The list never registers; a call to it would be a bug of these tests. */
function withoutRegistration(
  reads: Pick<ProfessionalDataSource, 'listProfessionals'>,
): ProfessionalDataSource {
  return { ...reads, registerProfessional: () => Promise.reject(new Error('not used')) };
}

async function settle(fixture: ComponentFixture<ProfessionalsPageComponent>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function query(
  fixture: ComponentFixture<ProfessionalsPageComponent>,
  selector: string,
): HTMLElement | null {
  return fixture.nativeElement.querySelector(selector) as HTMLElement | null;
}

function text(fixture: ComponentFixture<ProfessionalsPageComponent>, selector: string): string {
  return query(fixture, selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('ProfessionalsPageComponent', () => {
  describe('view states (Anexo H)', () => {
    it('starts loading', async () => {
      const { component, fixture } = await setup({ listProfessionals: () => new Promise(() => {}) });

      expect(component.viewState()).toBe('loading');
      expect(query(fixture, '[data-testid="professionals-loading"]')).not.toBeNull();
    });

    it('shows the empty state when there are no professionals', async () => {
      const { component, fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([])),
      });
      await settle(fixture);

      expect(component.viewState()).toBe('empty');
      expect(query(fixture, '[data-testid="professionals-empty"]')).not.toBeNull();
    });

    it('shows the first page with its total', async () => {
      const listProfessionals = vi.fn(() =>
        Promise.resolve(pageOf([professional('1'), professional('2')], 1, 1, 2)),
      );
      const { component, fixture } = await setup({ listProfessionals });
      await settle(fixture);

      expect(listProfessionals).toHaveBeenCalledWith(1);
      expect(component.viewState()).toBe('data');
      expect(fixture.nativeElement.querySelectorAll('[data-testid="professional-card"]').length).toBe(2);
      expect(text(fixture, '[data-testid="professionals-counter"]')).toBe('2 profesionales');
    });

    it('shows the error with its reference and loads again on retry', async () => {
      const listProfessionals = vi
        .fn<ProfessionalDataSource['listProfessionals']>()
        .mockRejectedValueOnce({ status: 503, message: 'El servicio no está disponible.', traceId: 'trace-9' })
        .mockResolvedValueOnce(pageOf([professional('1')]));
      const { component, fixture } = await setup({ listProfessionals });
      await settle(fixture);

      expect(component.viewState()).toBe('error');
      expect(text(fixture, '[data-testid="professionals-error"]')).toContain('El servicio no está disponible.');
      expect(text(fixture, '[data-testid="professionals-error"]')).toContain('trace-9');

      query(fixture, '[data-testid="professionals-retry"]')?.click();
      await settle(fixture);

      expect(component.viewState()).toBe('data');
    });
  });

  describe('a professional card', () => {
    it('shows the license, the experience, the type and the status', async () => {
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1', { yearsExperience: 7 })])),
      });
      await settle(fixture);

      const card = text(fixture, '[data-testid="professional-card"]');
      expect(card).toContain('RM-1');
      expect(card).toContain('7 años de experiencia');
      expect(card).toContain('Médico general');
      expect(card).toContain('Activo');
    });

    it('uses the singular for one year and marks an inactive profile', async () => {
      const { fixture } = await setup({
        listProfessionals: () =>
          Promise.resolve(pageOf([professional('1', { yearsExperience: 1, status: 'INACTIVE' })])),
      });
      await settle(fixture);

      const card = text(fixture, '[data-testid="professional-card"]');
      expect(card).toContain('1 año de experiencia');
      expect(card).toContain('Inactivo');
      expect(query(fixture, '.chip--inactive')).not.toBeNull();
    });

    it('says one professional in singular', async () => {
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1')])),
      });
      await settle(fixture);

      expect(text(fixture, '[data-testid="professionals-counter"]')).toBe('1 profesional');
    });
  });

  describe('more pages', () => {
    it('appends the next page and hides the button on the last one', async () => {
      const listProfessionals = vi
        .fn<ProfessionalDataSource['listProfessionals']>()
        .mockResolvedValueOnce(pageOf([professional('1')], 1, 2, 2))
        .mockResolvedValueOnce(pageOf([professional('2')], 2, 2, 2));
      const { component, fixture } = await setup({ listProfessionals });
      await settle(fixture);

      query(fixture, '[data-testid="professionals-load-more"]')?.click();
      await settle(fixture);

      expect(listProfessionals).toHaveBeenLastCalledWith(2);
      expect(component.professionals().map((item) => item.id)).toEqual(['1', '2']);
      expect(query(fixture, '[data-testid="professionals-load-more"]')).toBeNull();
    });

    it('disables the button while the next page is loading', async () => {
      const listProfessionals = vi
        .fn<ProfessionalDataSource['listProfessionals']>()
        .mockResolvedValueOnce(pageOf([professional('1')], 1, 2, 2))
        .mockReturnValueOnce(new Promise(() => {}));
      const { fixture } = await setup({ listProfessionals });
      await settle(fixture);

      query(fixture, '[data-testid="professionals-load-more"]')?.click();
      fixture.detectChanges();

      const button = query(fixture, '[data-testid="professionals-load-more"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Cargando...');
    });

    it('ignores an older answer that arrives after a newer request', async () => {
      let answerFirstLoad: (page: Page<Professional>) => void = () => {};
      const listProfessionals = vi
        .fn<ProfessionalDataSource['listProfessionals']>()
        .mockReturnValueOnce(new Promise((resolve) => (answerFirstLoad = resolve)))
        .mockResolvedValueOnce(pageOf([professional('new')]));
      const { component, fixture } = await setup({ listProfessionals });

      await component.retryLoad();
      answerFirstLoad(pageOf([professional('old')]));
      await settle(fixture);

      expect(component.professionals().map((item) => item.id)).toEqual(['new']);
    });
  });
});
