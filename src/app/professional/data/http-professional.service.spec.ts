import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HttpProfessionalService } from './http-professional.service';

const professional = {
  id: 'c0000000-0000-4000-8000-000000000001',
  identityUserId: 'c1000000-0000-4000-8000-000000000001',
  licenseNumber: 'RM-12345',
  professionalType: 'GENERAL_PRACTITIONER',
  status: 'ACTIVE',
  yearsExperience: 7,
};

describe('HttpProfessionalService', () => {
  let service: HttpProfessionalService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // In the shell, HttpClient comes with its interceptor; the portal never provides one.
      providers: [HttpProfessionalService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HttpProfessionalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the gateway route for one page of twenty professionals', async () => {
    const result = service.listProfessionals(2);

    const request = http.expectOne(
      (candidate) => candidate.url === '/api/v1/professionals',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('20');
    request.flush({
      data: [professional],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });

    await expect(result).resolves.toEqual({
      data: [professional],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
  });

  it('rejects a status the contract does not define', async () => {
    const result = service.listProfessionals(1);

    http.expectOne(() => true).flush({
      data: [{ ...professional, status: 'SUSPENDED' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    await expect(result).rejects.toThrow('Unknown professional status: SUSPENDED.');
  });

  it('rejects a professional type the contract does not define', async () => {
    const result = service.listProfessionals(1);

    http.expectOne(() => true).flush({
      data: [{ ...professional, professionalType: 'SPECIALIST' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    await expect(result).rejects.toThrow('Unknown professional type: SPECIALIST.');
  });

  it('registers through the admin route with the idempotency key of the intent', async () => {
    const registration = {
      fullName: 'Ana Gómez',
      email: 'ana@telemed.test',
      identityDocument: '1075000001',
      password: 'temporary-pass-1',
      licenseNumber: 'RM-12345',
      yearsExperience: 7,
    };
    const result = service.registerProfessional(registration, 'intent-0001');

    const request = http.expectOne('/api/v1/professionals/admin/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('intent-0001');
    expect(request.request.body).toEqual(registration);
    request.flush(professional, { status: 201, statusText: 'Created' });

    await expect(result).resolves.toEqual(professional);
  });

  it('accepts the 200 of a repeated key as the same registration', async () => {
    const result = service.registerProfessional(
      {
        fullName: 'Ana Gómez',
        email: 'ana@telemed.test',
        identityDocument: '1075000001',
        password: 'temporary-pass-1',
        licenseNumber: 'RM-12345',
        yearsExperience: 7,
      },
      'intent-0001',
    );

    http.expectOne('/api/v1/professionals/admin/register').flush(professional);

    await expect(result).resolves.toEqual(professional);
  });

  it('changes the status with a patch on the professional', async () => {
    const result = service.changeStatus(professional.id, 'INACTIVE');

    const request = http.expectOne(`/api/v1/professionals/${professional.id}/status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'INACTIVE' });
    request.flush({ ...professional, status: 'INACTIVE' });

    await expect(result).resolves.toEqual({ ...professional, status: 'INACTIVE' });
  });

  it('passes the failure of the shell client through', async () => {
    const result = service.listProfessionals(1);

    http.expectOne(() => true).flush(
      { error: 'INTERNAL_ERROR', message: 'boom', traceId: 'trace-1' },
      { status: 500, statusText: 'Server Error' },
    );

    await expect(result).rejects.toBeDefined();
  });
});
