import { Routes } from '@angular/router';
import { MainAppComponent } from './components/main-app/main-app.component';
import { BootSequenceComponent } from './components/boot-sequence/boot-sequence.component';

export const routes: Routes = [
  { path: 'boot', component: BootSequenceComponent },
  { path: 'app', component: MainAppComponent },
  { path: '', redirectTo: '/app', pathMatch: 'full' },
  { path: '**', redirectTo: '/app' }
];