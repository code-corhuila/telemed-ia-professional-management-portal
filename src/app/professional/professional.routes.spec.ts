import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  Component,
  EnvironmentInjector,
  Provider,
  createEnvironmentInjector,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { HttpProfessionalService } from './data/http-professional.service';
import { PROFESSIONAL_DATA_SOURCE } from './data/professional-data-source';
import { PROFESSIONAL_ROUTES } from './professional.routes';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
class TestHostComponent {}

/**
 * The shell loads only this route table through loadRemoteModule('./routes'),
 * without the portal's app.config.ts, so it is mounted here the same way.
 */
describe('PROFESSIONAL_ROUTES (consumed in isolation, as the shell does)', () => {
  it('renders the professionals page at the portal root', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      // The shell provides HttpClient with its interceptor; the portal never does.
      providers: [provideRouter(PROFESSIONAL_ROUTES), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Profesionales');
  });

  it('serves the real API adapter from the route providers', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    // The router builds the same child injector from the route providers.
    const routeScope = createEnvironmentInjector(
      PROFESSIONAL_ROUTES[0].providers as Provider[],
      TestBed.inject(EnvironmentInjector),
    );

    expect(routeScope.get(PROFESSIONAL_DATA_SOURCE)).toBeInstanceOf(HttpProfessionalService);
  });
});
