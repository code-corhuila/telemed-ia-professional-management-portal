import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Administration page of the professional profiles. */
@Component({
  selector: 'app-professionals-page',
  standalone: true,
  templateUrl: './professionals-page.component.html',
  styleUrl: './professionals-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPageComponent {}
