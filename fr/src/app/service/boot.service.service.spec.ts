import { TestBed } from '@angular/core/testing';

import { BootServiceService } from './boot.service.service';

describe('BootServiceService', () => {
  let service: BootServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BootServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
