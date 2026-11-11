import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  PROFESSIONAL_DATA_SOURCE,
  ProfessionalDataSource,
} from '../data/professional-data-source';
import { Professional } from '../model/professional';
import { OwnProfilePageComponent } from './own-profile-page.component';

const own: Professional = {
  id: 'c0000000-0000-4000-8000-000000000001',
  identityUserId: 'c1000000-0000-4000-8000-000000000001',
  fullName: 'Dr. Andres Navegador',
  email: 'andres@telemed.test',
  licenseNumber: 'RM-WEB-1',
  professionalType: 'GENERAL_PRACTITIONER',
  status: 'ACTIVE',
  yearsExperience: 9,
};

async function render(getOwnProfessional: ProfessionalDataSource['getOwnProfessional']): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [OwnProfilePageComponent],
    providers: [
      {
        provide: PROFESSIONAL_DATA_SOURCE,
        useValue: { getOwnProfessional } as Partial<ProfessionalDataSource>,
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(OwnProfilePageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OwnProfilePageComponent', () => {
  it('shows the name, e-mail, license, experience and status of the professional', async () => {
    const page = await render(vi.fn().mockResolvedValue(own));

    const text = page.textContent ?? '';
    expect(text).toContain('Mi perfil');
    expect(text).toContain('Dr. Andres Navegador');
    expect(text).toContain('andres@telemed.test');
    expect(text).toContain('RM-WEB-1');
    expect(text).toContain('9 años');
    expect(text).toContain('Médico general');
    expect(text).toContain('Activo');
  });

  it('says the profile does not exist yet when the API answers 404', async () => {
    const page = await render(
      vi.fn().mockRejectedValue({ status: 404, code: 'NOT_FOUND', message: 'not found' }),
    );

    expect(page.querySelector('[data-testid="own-profile-missing"]')).not.toBeNull();
  });

  it('shows the error with its trace id and lets the user retry', async () => {
    const getOwn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'down', traceId: 't-1' })
      .mockResolvedValueOnce(own);
    const page = await render(getOwn);

    expect(page.textContent).toContain('t-1');
    (page.querySelector('[data-testid="own-profile-retry"]') as HTMLButtonElement).click();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve));

    expect(getOwn).toHaveBeenCalledTimes(2);
  });
});
