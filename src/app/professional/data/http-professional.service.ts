import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Page } from '../model/page';
import {
  PROFESSIONAL_STATUSES,
  PROFESSIONAL_TYPES,
  Professional,
  ProfessionalStatus,
  ProfessionalType,
} from '../model/professional';
import { ProfessionalDataSource } from './professional-data-source';

/** Public route of the gateway (Anexo H): only the shell knows its host. */
const PROFESSIONALS = '/api/v1/professionals';

/** Professionals per page; the contract allows 1 to 100. */
const PAGE_SIZE = 20;

interface ProfessionalResponse {
  readonly id: string;
  readonly identityUserId: string;
  readonly licenseNumber: string;
  readonly professionalType: string;
  readonly status: string;
  readonly yearsExperience: number;
}

/**
 * Adapter of the professional-management -api, contract
 * `07-api/contracts/openapi/professional-service.yaml`. It uses the HttpClient of
 * the shell, whose interceptor adds the token and the correlation id, applies the
 * timeout and normalises errors; the portal never provides its own client.
 */
@Injectable()
export class HttpProfessionalService implements ProfessionalDataSource {
  private readonly http = inject(HttpClient);

  async listProfessionals(page: number): Promise<Page<Professional>> {
    const response = await firstValueFrom(
      this.http.get<Page<ProfessionalResponse>>(PROFESSIONALS, {
        params: { page, limit: PAGE_SIZE },
      }),
    );
    return { data: response.data.map(toProfessional), meta: response.meta };
  }
}

function toProfessional(response: ProfessionalResponse): Professional {
  return {
    id: response.id,
    identityUserId: response.identityUserId,
    licenseNumber: response.licenseNumber,
    professionalType: oneOf<ProfessionalType>(PROFESSIONAL_TYPES, response.professionalType, 'type'),
    status: oneOf<ProfessionalStatus>(PROFESSIONAL_STATUSES, response.status, 'status'),
    yearsExperience: response.yearsExperience,
  };
}

function oneOf<T extends string>(allowed: readonly T[], value: string, field: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Unknown professional ${field}: ${value}.`);
  }
  return value as T;
}
