import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { PROFESSIONAL_DATA_SOURCE } from '../data/professional-data-source';
import { Professional } from '../model/professional';
import { ProfessionalRegistration } from '../model/professional-registration';
import { asApiError } from '../../shell-contract';

type Field = keyof ProfessionalRegistration;

/** A failure that is not about one field, as the shell client normalised it. */
interface Failure {
  readonly message: string;
  readonly traceId?: string;
}

const MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  email: 'Escribe un correo válido.',
  minlength: 'Debe tener al menos 8 caracteres.',
  maxlength: 'Debe tener máximo 80 caracteres.',
  pattern: 'Debe ser un número entero, 0 o mayor.',
};

/**
 * Registration of a professional by an administrator (`POST /admin/register`). Following
 * Anexo H: a label and an error per field (`aria-describedby`), the button disabled while
 * sending, and one `Idempotency-Key` per intent, reused when the same data is retried.
 */
@Component({
  selector: 'app-register-professional-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register-professional-form.component.html',
  styleUrl: './register-professional-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterProfessionalFormComponent {
  private readonly dataSource = inject(PROFESSIONAL_DATA_SOURCE);

  readonly registered = output<Professional>();

  readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    identityDocument: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    licenseNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    yearsExperience: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)],
    }),
  });

  /** Labels in the order of the contract; the password is temporary, the professional changes it. */
  readonly fields: ReadonlyArray<{
    readonly name: Field;
    readonly label: string;
    readonly type: string;
    readonly inputmode?: string;
    readonly autocomplete: string;
  }> = [
    { name: 'fullName', label: 'Nombre completo', type: 'text', autocomplete: 'off' },
    { name: 'email', label: 'Correo', type: 'email', autocomplete: 'off' },
    { name: 'identityDocument', label: 'Documento de identidad', type: 'text', autocomplete: 'off' },
    { name: 'password', label: 'Contraseña temporal', type: 'password', autocomplete: 'new-password' },
    { name: 'licenseNumber', label: 'Número de licencia', type: 'text', autocomplete: 'off' },
    { name: 'yearsExperience', label: 'Años de experiencia', type: 'text', inputmode: 'numeric', autocomplete: 'off' },
  ];

  readonly submitting = signal(false);
  readonly attempted = signal(false);
  readonly serverErrors = signal<Partial<Record<Field, string>>>({});
  readonly failure = signal<Failure | null>(null);

  /** The data and key of the last attempt that did not finish, to retry the same intent. */
  private pending: { readonly payload: string; readonly key: string } | null = null;

  errorOf(field: Field): string | null {
    const server = this.serverErrors()[field];
    if (server) {
      return server;
    }
    const control = this.form.controls[field];
    if (!this.attempted() && !control.touched) {
      return null;
    }
    return firstMessage(control.errors);
  }

  async submit(): Promise<void> {
    this.attempted.set(true);
    this.serverErrors.set({});
    this.failure.set(null);
    if (this.form.invalid || this.submitting()) {
      return;
    }
    const registration = this.registration();
    const payload = JSON.stringify(registration);
    if (this.pending?.payload !== payload) {
      this.pending = { payload, key: crypto.randomUUID() };
    }
    this.submitting.set(true);
    try {
      const professional = await this.dataSource.registerProfessional(registration, this.pending.key);
      this.pending = null;
      this.form.reset();
      this.attempted.set(false);
      this.registered.emit(professional);
    } catch (error: unknown) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private registration(): ProfessionalRegistration {
    const value = this.form.getRawValue();
    return {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      identityDocument: value.identityDocument.trim(),
      password: value.password,
      licenseNumber: value.licenseNumber.trim(),
      yearsExperience: Number(value.yearsExperience),
    };
  }

  /** Field errors go next to their field; anything else, with its reference, above the button. */
  private fail(error: unknown): void {
    const apiError = asApiError(error, 'No pudimos registrar al profesional.');
    const fields = (apiError.details ?? []).filter((detail) => detail.field in this.form.controls);
    if (fields.length > 0) {
      this.serverErrors.set(Object.fromEntries(fields.map((detail) => [detail.field, detail.message])));
      return;
    }
    this.failure.set({ message: apiError.message, traceId: apiError.traceId });
  }
}

function firstMessage(errors: ValidationErrors | null): string | null {
  const key = errors ? Object.keys(errors)[0] : undefined;
  return key ? (MESSAGES[key] ?? 'El valor no es válido.') : null;
}
