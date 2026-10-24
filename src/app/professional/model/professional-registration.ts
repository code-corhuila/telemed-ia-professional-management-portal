/**
 * Body of `POST /admin/register` (professional-service.yaml): the account the identity
 * domain creates and the profile of this domain. Type and status are not sent: every new
 * profile is an active general practitioner (DEC-005).
 */
export interface ProfessionalRegistration {
  readonly fullName: string;
  readonly email: string;
  readonly identityDocument: string;
  readonly password: string;
  readonly licenseNumber: string;
  readonly yearsExperience: number;
}
