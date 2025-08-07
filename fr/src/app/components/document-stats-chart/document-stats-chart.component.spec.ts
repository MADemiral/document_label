import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentStatsChartComponent } from './document-stats-chart.component';

describe('DocumentStatsChartComponent', () => {
  let component: DocumentStatsChartComponent;
  let fixture: ComponentFixture<DocumentStatsChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentStatsChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DocumentStatsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
