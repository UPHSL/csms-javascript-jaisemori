import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';

describe('T08 - Service Request Domain Model Tests', () => {
  it('Test 1: should create a Service Request with sensible information', () => {
    const serviceRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Barangay Clearance',
      description: 'Request for employment requirement',
      dateRequested: '2026-10-04'
    });

    assert.ok(serviceRequest);
  });

  it('Test 2: should assign and retrieve Service Request information correctly', () => {
    const serviceRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Barangay Clearance',
      description: 'Request for employment requirement',
      dateRequested: '2026-10-04'
    });

    assert.equal(serviceRequest.residentId, 25);
    assert.equal(serviceRequest.serviceType, 'Barangay Clearance');
    assert.equal(serviceRequest.description, 'Request for employment requirement');
    assert.equal(serviceRequest.dateRequested, '2026-10-04');
  });

  it('Test 3: should preserve the supplied resident ID', () => {
    const serviceRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Certificate Request',
      description: 'Requesting a residency certificate',
      dateRequested: '2026-10-05'
    });

    assert.equal(serviceRequest.residentId, 25);
  });

  it('Test 4: should leave the Service Request ID unassigned before persistence', () => {
    const serviceRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Community Assistance',
      description: 'Requesting assistance details',
      dateRequested: '2026-10-06'
    });

    assert.equal(serviceRequest.id, null);
  });

  it('Test 5: should default a new Service Request status to Pending', () => {
    const serviceRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Permit Request',
      description: 'Requesting a permit',
      dateRequested: '2026-10-07'
    });

    assert.equal(serviceRequest.status, ServiceRequestStatus.PENDING);
  });

  it('Test 6: should keep Service Request information independent between objects', () => {
    const firstRequest = new ServiceRequest({
      residentId: 25,
      serviceType: 'Barangay Clearance',
      description: 'Employment requirement',
      dateRequested: '2026-10-08'
    });
    const secondRequest = new ServiceRequest({
      residentId: 30,
      serviceType: 'Community Assistance',
      description: 'Medical assistance request',
      dateRequested: '2026-10-09'
    });

    assert.equal(firstRequest.residentId, 25);
    assert.equal(firstRequest.serviceType, 'Barangay Clearance');
    assert.equal(firstRequest.description, 'Employment requirement');
    assert.equal(firstRequest.dateRequested, '2026-10-08');

    assert.equal(secondRequest.residentId, 30);
    assert.equal(secondRequest.serviceType, 'Community Assistance');
    assert.equal(secondRequest.description, 'Medical assistance request');
    assert.equal(secondRequest.dateRequested, '2026-10-09');
  });
});
