// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Arsiv } from './pages/arsiv/arsiv';  

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'arsiv', component: Arsiv },
];
