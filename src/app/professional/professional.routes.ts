import { Routes } from '@angular/router';

import { HttpProfessionalService } from './data/http-professional.service';
import { PROFESSIONAL_DATA_SOURCE } from './data/professional-data-source';

/**
 * Route table exposed to the shell via Native Federation (`./routes`).
 *
 * The shell evaluates only this table, not the portal's app.config.ts, so any
 * provider a page needs must be declared here, at route level.
 */
export const PROFESSIONAL_ROUTES: Routes = [
  {
    path: '',
    providers: [
      // Uses the HttpClient of the shell (Anexo H); the portal never provides one.
      HttpProfessionalService,
      { provide: PROFESSIONAL_DATA_SOURCE, useExisting: HttpProfessionalService },
    ],
    loadComponent: () =>
      import('./pages/professionals-page.component').then(
        (m) => m.ProfessionalsPageComponent,
      ),
  },
];
