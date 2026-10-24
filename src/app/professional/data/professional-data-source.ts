import { InjectionToken } from '@angular/core';

import { Page } from '../model/page';
import { Professional } from '../model/professional';
import { ProfessionalRegistration } from '../model/professional-registration';

/**
 * Port the portal uses to read professionals. It is satisfied by
 * HttpProfessionalService, which calls the professional-management -api
 * through the shell's HttpClient.
 *
 * Failures reject with the error the shell client normalised (ApiError:
 * status, code, message, traceId).
 */
export interface ProfessionalDataSource {
  /** Page numbers start at 1; ordered by license number. */
  listProfessionals(page: number): Promise<Page<Professional>>;

  /**
   * Registers the account and the profile (ADMIN only). The same idempotencyKey must be
   * reused when retrying the same intent, so a retry never registers twice (Anexo H).
   */
  registerProfessional(
    registration: ProfessionalRegistration,
    idempotencyKey: string,
  ): Promise<Professional>;
}

export const PROFESSIONAL_DATA_SOURCE =
  new InjectionToken<ProfessionalDataSource>('PROFESSIONAL_DATA_SOURCE');
