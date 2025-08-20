import { TestBed } from '@angular/core/testing';
import { DoomCaptchaResultServiceService } from './doom-captcha-result.service.service';



describe('DoomCaptchaResultServiceService', () => {
  let service: DoomCaptchaResultServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DoomCaptchaResultServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
