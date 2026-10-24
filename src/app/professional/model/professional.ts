/** Every professional is a general practitioner (DEC-005). */
export const PROFESSIONAL_TYPES = ['GENERAL_PRACTITIONER'] as const;
export type ProfessionalType = (typeof PROFESSIONAL_TYPES)[number];

/** Status of the profile, independent from the account and from appointments. */
export const PROFESSIONAL_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ProfessionalStatus = (typeof PROFESSIONAL_STATUSES)[number];

/**
 * `Professional` of `07-api/contracts/openapi/professional-service.yaml`, with the
 * same field names. Name and e-mail live in the identity domain, not here.
 */
export interface Professional {
  readonly id: string;
  readonly identityUserId: string;
  readonly licenseNumber: string;
  readonly professionalType: ProfessionalType;
  readonly status: ProfessionalStatus;
  readonly yearsExperience: number;
}
