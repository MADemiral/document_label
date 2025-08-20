import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoomCaptchaComponent } from './doom-captcha.component';

describe('DoomCaptchaComponent', () => {
  let component: DoomCaptchaComponent;
  let fixture: ComponentFixture<DoomCaptchaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoomCaptchaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DoomCaptchaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
