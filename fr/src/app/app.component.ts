import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { BootService } from './service/boot.service.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Document Label System';

  constructor(
    private router: Router,
    private bootService: BootService
  ) {}

  ngOnInit() {
    // İlk ziyarette boot sequence'ı göster
    if (this.bootService.shouldShowBoot() && this.router.url === '/') {
      this.router.navigate(['/boot']);
    }

    // URL değişikliklerini dinle
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd) // Type guard eklendi
    ).subscribe((event) => {
      console.log('Navigation completed:', event.url);
    });
  }
}