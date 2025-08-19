import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BootSequenceComponent } from './boot-sequence.component';

describe('BootSequenceComponent', () => {
  let component: BootSequenceComponent;
  let fixture: ComponentFixture<BootSequenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BootSequenceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BootSequenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
