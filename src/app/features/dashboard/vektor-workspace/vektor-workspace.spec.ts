import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VektorWorkspace } from './vektor-workspace';

describe('VektorWorkspace', () => {
  let component: VektorWorkspace;
  let fixture: ComponentFixture<VektorWorkspace>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VektorWorkspace],
    }).compileComponents();

    fixture = TestBed.createComponent(VektorWorkspace);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
