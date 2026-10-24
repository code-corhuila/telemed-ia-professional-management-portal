import { Routes } from '@angular/router';

/**
 * Route table exposed to the shell via Native Federation (`./routes`).
 *
 * The shell evaluates only this table, not the portal's app.config.ts, so any
 * provider a page needs must be declared here, at route level.
 */
export const PROFESSIONAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/professionals-page.component').then(
        (m) => m.ProfessionalsPageComponent,
      ),
  },
];
