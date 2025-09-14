import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { DeviceComparisonPageComponent } from './device-comparison-page.component';
import { Store } from '@ngrx/store';
import { DeviceComparisonService } from '@home/components/widget/lib/comparison/device-comparison.service';

// Minimal stubs for injected services not used in this test
class DummyService {}

describe('DeviceComparisonPageComponent', () => {
  let component: DeviceComparisonPageComponent;
  let fixture: ComponentFixture<DeviceComparisonPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeviceComparisonPageComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: Store, useValue: { select: () => of(null), dispatch: () => {} } },
        DeviceComparisonService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: (window as any).EntityService || 'EntityService', useClass: DummyService },
        { provide: (window as any).DeviceService || 'DeviceService', useClass: DummyService },
        { provide: (window as any).TelemetryWebsocketService || 'TelemetryWebsocketService', useClass: DummyService },
        { provide: (window as any).AttributeService || 'AttributeService', useClass: DummyService },
        { provide: (window as any).AlarmService || 'AlarmService', useClass: DummyService },
        { provide: (window as any).MatDialog || 'MatDialog', useValue: { open: () => ({ afterClosed: () => of(null) }) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceComparisonPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // Avoid hitting real load logic in ngOnInit
    spyOn<any>(component, 'loadDevices').and.callFake(() => {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to device details on onDeviceDetails()', () => {
    const device = { deviceId: 'abc' } as any;
    component.onDeviceDetails(device);
    expect((router.navigate as any)).toHaveBeenCalledWith(['/devices', 'abc']);
  });
});
