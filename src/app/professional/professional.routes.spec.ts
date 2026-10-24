import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

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
      providers: [provideRouter(PROFESSIONAL_ROUTES)],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent?.trim()).toBe('Profesionales');
  });
});
