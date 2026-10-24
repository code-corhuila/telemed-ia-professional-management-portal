import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  PROFESSIONAL_DATA_SOURCE,
  ProfessionalDataSource,
} from '../data/professional-data-source';
import { Professional } from '../model/professional';
import { RegisterProfessionalFormComponent } from './register-professional-form.component';

const registered: Professional = {
  id: 'c0000000-0000-4000-8000-000000000031',
  identityUserId: 'c1000000-0000-4000-8000-000000000031',
  licenseNumber: 'RM-12345',
  professionalType: 'GENERAL_PRACTITIONER',
  status: 'ACTIVE',
  yearsExperience: 7,
};

type Register = ProfessionalDataSource['registerProfessional'];

async function setup(register: Register): Promise<{
  fixture: ComponentFixture<RegisterProfessionalFormComponent>;
  form: RegisterProfessionalFormComponent;
}> {
  await TestBed.configureTestingModule({
    imports: [RegisterProfessionalFormComponent],
    providers: [
      {
        provide: PROFESSIONAL_DATA_SOURCE,
        useValue: {
          listProfessionals: () => Promise.reject(new Error('not used')),
          registerProfessional: register,
          changeStatus: () => Promise.reject(new Error('not used')),
        } satisfies ProfessionalDataSource,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(RegisterProfessionalFormComponent);
  fixture.detectChanges();
  return { fixture, form: fixture.componentInstance };
}

function root(fixture: ComponentFixture<RegisterProfessionalFormComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function type(fixture: ComponentFixture<RegisterProfessionalFormComponent>, id: string, value: string): void {
  const input = root(fixture).querySelector(`#${id}`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function fillValid(fixture: ComponentFixture<RegisterProfessionalFormComponent>): void {
  type(fixture, 'professional-fullName', 'Ana Gómez');
  type(fixture, 'professional-email', 'ana@telemed.test');
  type(fixture, 'professional-identityDocument', '1075000001');
  type(fixture, 'professional-password', 'temporary-pass-1');
  type(fixture, 'professional-licenseNumber', 'RM-12345');
  type(fixture, 'professional-yearsExperience', '7');
}

async function submit(fixture: ComponentFixture<RegisterProfessionalFormComponent>): Promise<void> {
  (root(fixture).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function errorOf(fixture: ComponentFixture<RegisterProfessionalFormComponent>, field: string): string {
  return root(fixture).querySelector(`#professional-${field}-error`)?.textContent?.trim() ?? '';
}

describe('RegisterProfessionalFormComponent', () => {
  it('names every empty field next to it and sends nothing', async () => {
    const register = vi.fn<Register>();
    const { fixture } = await setup(register);

    await submit(fixture);

    for (const field of ['fullName', 'email', 'identityDocument', 'password', 'licenseNumber', 'yearsExperience']) {
      expect(errorOf(fixture, field)).toBe('Este campo es obligatorio.');
      const input = root(fixture).querySelector(`#professional-${field}`) as HTMLInputElement;
      expect(input.getAttribute('aria-describedby')).toBe(`professional-${field}-error`);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
    expect(register).not.toHaveBeenCalled();
  });

  it('checks the e-mail, the password length, the license length and the experience', async () => {
    const register = vi.fn<Register>();
    const { fixture } = await setup(register);
    fillValid(fixture);
    type(fixture, 'professional-email', 'not-an-email');
    type(fixture, 'professional-password', 'short');
    type(fixture, 'professional-licenseNumber', 'A'.repeat(81));
    type(fixture, 'professional-yearsExperience', '-1');

    await submit(fixture);

    expect(errorOf(fixture, 'email')).toBe('Escribe un correo válido.');
    expect(errorOf(fixture, 'password')).toBe('Debe tener al menos 8 caracteres.');
    expect(errorOf(fixture, 'licenseNumber')).toBe('Debe tener máximo 80 caracteres.');
    expect(errorOf(fixture, 'yearsExperience')).toBe('Debe ser un número entero, 0 o mayor.');
    expect(register).not.toHaveBeenCalled();
  });

  it('registers with the typed values and announces the professional', async () => {
    const register = vi.fn<Register>().mockResolvedValue(registered);
    const { fixture, form } = await setup(register);
    const announced = vi.fn();
    form.registered.subscribe(announced);
    fillValid(fixture);

    await submit(fixture);

    expect(register).toHaveBeenCalledWith(
      {
        fullName: 'Ana Gómez',
        email: 'ana@telemed.test',
        identityDocument: '1075000001',
        password: 'temporary-pass-1',
        licenseNumber: 'RM-12345',
        yearsExperience: 7,
      },
      expect.any(String),
    );
    expect(announced).toHaveBeenCalledWith(registered);
  });

  it('disables the button while the registration is being sent', async () => {
    const { fixture } = await setup(() => new Promise(() => {}));
    fillValid(fixture);

    await submit(fixture);

    const button = root(fixture).querySelector('[data-testid="register-submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Registrando...');
  });

  it('reuses the key to retry the same data and takes a new one when the data changes', async () => {
    const register = vi
      .fn<Register>()
      .mockRejectedValueOnce({ status: 0, code: 'TIMEOUT', message: 'The request took too long.' })
      .mockRejectedValueOnce({ status: 0, code: 'TIMEOUT', message: 'The request took too long.' })
      .mockResolvedValueOnce(registered);
    const { fixture } = await setup(register);
    fillValid(fixture);

    await submit(fixture);
    await submit(fixture);
    type(fixture, 'professional-licenseNumber', 'RM-99999');
    await submit(fixture);

    const keys = register.mock.calls.map((call) => call[1]);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('shows the field errors the api reports next to their fields', async () => {
    const { fixture } = await setup(() =>
      Promise.reject({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'the request has invalid fields',
        details: [{ field: 'email', message: 'must be an e-mail address' }],
        traceId: 'trace-400',
      }),
    );
    fillValid(fixture);

    await submit(fixture);

    expect(errorOf(fixture, 'email')).toBe('must be an e-mail address');
  });

  it('shows a conflict or an unavailable identity service with its reference', async () => {
    const { fixture } = await setup(() =>
      Promise.reject({
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'a required service is unavailable, try again later',
        traceId: 'trace-503',
      }),
    );
    fillValid(fixture);

    await submit(fixture);

    const alert = root(fixture).querySelector('[data-testid="register-error"]');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('a required service is unavailable, try again later');
    expect(alert?.textContent).toContain('trace-503');
  });
});
