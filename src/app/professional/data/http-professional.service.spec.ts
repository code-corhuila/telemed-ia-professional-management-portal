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

  it('passes the failure of the shell client through', async () => {
    const result = service.listProfessionals(1);

    http.expectOne(() => true).flush(
      { error: 'INTERNAL_ERROR', message: 'boom', traceId: 'trace-1' },
      { status: 500, statusText: 'Server Error' },
    );

    await expect(result).rejects.toBeDefined();
  });
});
