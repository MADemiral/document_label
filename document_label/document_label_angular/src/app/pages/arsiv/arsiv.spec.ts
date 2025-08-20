import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Arsiv } from './arsiv';

describe('Arsiv', () => {
  let component: Arsiv;
  let fixture: ComponentFixture<Arsiv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Arsiv]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Arsiv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
