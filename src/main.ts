import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { VektorWorkspaceComponent } from './app/features/dashboard/vektor-workspace/vektor-workspace';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VektorWorkspaceComponent],
  template: `<app-vektor-workspace></app-vektor-workspace>`
})
export class App {}

bootstrapApplication(App, {
  providers: [provideHttpClient()]
}).catch(err => console.error(err));