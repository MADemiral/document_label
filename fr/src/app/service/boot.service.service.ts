import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BootService {
  private bootCompletedSubject = new BehaviorSubject<boolean>(false);
  public bootCompleted$ = this.bootCompletedSubject.asObservable();

  private hasBootedBefore = false;

  constructor() {
    // Check if user has seen boot sequence before (session based)
    this.hasBootedBefore = sessionStorage.getItem('hasBootedBefore') === 'true';
  }

  shouldShowBoot(): boolean {
    // Show boot sequence only on first visit in session or if forced
    return !this.hasBootedBefore || this.isForceBootEnabled();
  }

  completeBootSequence() {
    this.bootCompletedSubject.next(true);
    sessionStorage.setItem('hasBootedBefore', 'true');
    this.hasBootedBefore = true;
  }

  forceBootSequence() {
    sessionStorage.removeItem('hasBootedBefore');
    this.hasBootedBefore = false;
  }

  private isForceBootEnabled(): boolean {
    // Developer mode or special parameter (?boot=true)
    return new URLSearchParams(window.location.search).has('boot');
  }

  resetBootSequence() {
    // Manuel reset için
    sessionStorage.removeItem('hasBootedBefore');
    this.hasBootedBefore = false;
    this.bootCompletedSubject.next(false);
  }
}