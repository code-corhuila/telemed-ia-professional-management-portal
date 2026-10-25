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

async function setup(
  reads: Pick<ProfessionalDataSource, 'listProfessionals'> & Partial<ProfessionalDataSource>,
): Promise<{
  component: ProfessionalsPageComponent;
  fixture: ComponentFixture<ProfessionalsPageComponent>;
}> {
  await TestBed.configureTestingModule({
    imports: [ProfessionalsPageComponent],
    providers: [{ provide: PROFESSIONAL_DATA_SOURCE, useValue: withDefaults(reads) }],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProfessionalsPageComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture };
}

/** Operations a test does not give are not expected to be called. */
function withDefaults(
  given: Pick<ProfessionalDataSource, 'listProfessionals'> & Partial<ProfessionalDataSource>,
): ProfessionalDataSource {
  return {
    registerProfessional: () => Promise.reject(new Error('not used')),
    changeStatus: () => Promise.reject(new Error('not used')),
    ...given,
  };
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

    it('shows the name and e-mail of the account, and the license under it', async () => {
      const { fixture } = await setup({
        listProfessionals: () =>
          Promise.resolve(
            pageOf([professional('1', { fullName: 'Ana Gómez', email: 'ana@telemed.test' })]),
          ),
      });
      await settle(fixture);

      expect(text(fixture, '.professional-card__title')).toBe('Ana Gómez');
      const card = text(fixture, '[data-testid="professional-card"]');
      expect(card).toContain('Licencia RM-1');
      expect(card).toContain('ana@telemed.test');
    });

    it('shows the license as the title when the name did not arrive', async () => {
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1')])),
      });
      await settle(fixture);

      expect(text(fixture, '.professional-card__title')).toBe('Licencia RM-1');
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

  describe('registration', () => {
    it('opens the form, and after a registration closes it, announces it and reloads the list', async () => {
      const listProfessionals = vi
        .fn<ProfessionalDataSource['listProfessionals']>()
        .mockResolvedValueOnce(pageOf([]))
        .mockResolvedValueOnce(pageOf([professional('1')]));
      const { component, fixture } = await setup({ listProfessionals });
      await settle(fixture);
      expect(query(fixture, 'app-register-professional-form')).toBeNull();

      query(fixture, '[data-testid="register-open"]')?.click();
      fixture.detectChanges();
      expect(query(fixture, 'app-register-professional-form')).not.toBeNull();

      component.onRegistered(professional('1'));
      await settle(fixture);

      expect(query(fixture, 'app-register-professional-form')).toBeNull();
      expect(text(fixture, '[data-testid="register-success"]')).toContain('RM-1');
      expect(listProfessionals).toHaveBeenCalledTimes(2);
      expect(component.viewState()).toBe('data');
    });
  });

  describe('profile status', () => {
    it('deactivates a profile and shows the new status on its card', async () => {
      const changeStatus = vi
        .fn<ProfessionalDataSource['changeStatus']>()
        .mockResolvedValue(professional('1', { status: 'INACTIVE' }));
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1')])),
        changeStatus,
      });
      await settle(fixture);
      expect(text(fixture, '[data-testid="status-toggle"]')).toBe('Desactivar');

      query(fixture, '[data-testid="status-toggle"]')?.click();
      await settle(fixture);

      expect(changeStatus).toHaveBeenCalledWith('1', 'INACTIVE');
      expect(text(fixture, '[data-testid="professional-card"]')).toContain('Inactivo');
      expect(text(fixture, '[data-testid="status-toggle"]')).toBe('Activar');
    });

    it('keeps the name on the card after the change, which answers without it', async () => {
      const { fixture } = await setup({
        listProfessionals: () =>
          Promise.resolve(pageOf([professional('1', { fullName: 'Ana Gómez', email: 'ana@telemed.test' })])),
        changeStatus: () => Promise.resolve(professional('1', { status: 'INACTIVE' })),
      });
      await settle(fixture);

      query(fixture, '[data-testid="status-toggle"]')?.click();
      await settle(fixture);

      expect(text(fixture, '.professional-card__title')).toBe('Ana Gómez');
      expect(text(fixture, '[data-testid="professional-card"]')).toContain('Inactivo');
    });

    it('activates an inactive profile', async () => {
      const changeStatus = vi
        .fn<ProfessionalDataSource['changeStatus']>()
        .mockResolvedValue(professional('1', { status: 'ACTIVE' }));
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1', { status: 'INACTIVE' })])),
        changeStatus,
      });
      await settle(fixture);

      query(fixture, '[data-testid="status-toggle"]')?.click();
      await settle(fixture);

      expect(changeStatus).toHaveBeenCalledWith('1', 'ACTIVE');
      expect(text(fixture, '[data-testid="professional-card"]')).toContain('Activo');
    });

    it('disables the button of that profile while the change is sent', async () => {
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1')])),
        changeStatus: () => new Promise(() => {}),
      });
      await settle(fixture);

      query(fixture, '[data-testid="status-toggle"]')?.click();
      fixture.detectChanges();

      const button = query(fixture, '[data-testid="status-toggle"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent?.trim()).toBe('Guardando...');
    });

    it('shows a failed change under its card with its reference', async () => {
      const { fixture } = await setup({
        listProfessionals: () => Promise.resolve(pageOf([professional('1')])),
        changeStatus: () =>
          Promise.reject({ status: 403, message: 'the operation is not allowed for this user', traceId: 'trace-403' }),
      });
      await settle(fixture);

      query(fixture, '[data-testid="status-toggle"]')?.click();
      await settle(fixture);

      const error = query(fixture, '[data-testid="status-error"]');
      expect(error?.getAttribute('role')).toBe('alert');
      expect(error?.textContent).toContain('the operation is not allowed for this user');
      expect(error?.textContent).toContain('trace-403');
      expect(query(fixture, '[data-testid="status-toggle"]')?.getAttribute('aria-describedby')).toBe(error?.id);
      expect(text(fixture, '[data-testid="professional-card"]')).toContain('Activo');
    });
  });
});
