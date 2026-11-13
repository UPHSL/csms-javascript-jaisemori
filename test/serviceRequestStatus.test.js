import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';
import { ResidentDeactivationService } from '../src/services/ResidentDeactivationService.js';
import { ServiceRequestSubmissionService } from '../src/services/ServiceRequestSubmissionService.js';
import { ServiceRequestStatusService } from '../src/services/ServiceRequestStatusService.js';

const getResidentFile = (name) => path.join(process.cwd(), 'data', `test_t10_${name}_residents.json`);
const getRequestDatabase = (name) => path.join(process.cwd(), 'data', `test_t10_${name}_requests.sqlite`);
const cleanup = (...files) => {
  for (const file of files) {
    try { fs.unlinkSync(file); } catch {}
  }
};

const residentData = {
  id: '25',
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  address: '123 Mabini Street',
  contactNumber: '09932133123',
  email: 'juan@example.com',
  status: 'Active'
};

const requestData = {
  residentId: '25',
  serviceType: 'Barangay Clearance',
  description: 'Requesting barangay clearance for employment requirements.',
  dateRequested: '2026-11-06'
};

const createHarness = (name) => {
  const residentFile = getResidentFile(name);
  const requestDatabase = getRequestDatabase(name);
  cleanup(residentFile, requestDatabase);

  const residentRepository = new ResidentRepository(residentFile);
  const requestRepository = new ServiceRequestRepository(requestDatabase);
  const submissionService = new ServiceRequestSubmissionService(residentRepository, requestRepository);
  const statusService = new ServiceRequestStatusService(requestRepository);
  residentRepository.save(new Resident(residentData));

  return {
    residentFile,
    requestDatabase,
    residentRepository,
    requestRepository,
    submissionService,
    statusService,
    submit(overrides = {}) {
      return submissionService.submit(new ServiceRequest({ ...requestData, ...overrides })).serviceRequest;
    }
  };
};

describe('T10 - Service Request Status Management Tests', () => {
  it('Test 1: Pending to In Progress succeeds and persists', () => {
    const h = createHarness('t1');
    const request = h.submit();

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    assert.equal(result.success, true);
    assert.equal(result.serviceRequest.status, 'In Progress');
    assert.equal(h.requestRepository.findById(request.id).status, 'In Progress');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 2: Pending to Cancelled succeeds and persists', () => {
    const h = createHarness('t2');
    const request = h.submit();

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.CANCELLED);

    assert.equal(result.success, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Cancelled');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 3: In Progress to Completed succeeds after a legitimate transition', () => {
    const h = createHarness('t3');
    const request = h.submit();
    h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.COMPLETED);

    assert.equal(result.success, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Completed');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 4: In Progress to Cancelled succeeds', () => {
    const h = createHarness('t4');
    const request = h.submit();
    h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.CANCELLED);

    assert.equal(result.success, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Cancelled');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 5: Pending to Completed is rejected and remains Pending', () => {
    const h = createHarness('t5');
    const request = h.submit();

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.COMPLETED);

    assert.equal(result.success, false);
    assert.equal(result.invalidTransition, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Pending');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 6: In Progress to Pending is rejected and remains In Progress', () => {
    const h = createHarness('t6');
    const request = h.submit();
    h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.PENDING);

    assert.equal(result.success, false);
    assert.equal(result.invalidTransition, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'In Progress');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 7: Completed is terminal', () => {
    const h = createHarness('t7');
    const request = h.submit();
    h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);
    h.statusService.changeStatus(request.id, ServiceRequestStatus.COMPLETED);

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.CANCELLED);

    assert.equal(result.success, false);
    assert.equal(result.invalidTransition, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Completed');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 8: Cancelled is terminal', () => {
    const h = createHarness('t8');
    const request = h.submit();
    h.statusService.changeStatus(request.id, ServiceRequestStatus.CANCELLED);

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    assert.equal(result.success, false);
    assert.equal(result.invalidTransition, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Cancelled');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 9: unsupported status is rejected without persistence changes', () => {
    const h = createHarness('t9');
    const request = h.submit();

    const result = h.statusService.changeStatus(request.id, 'Approved');

    assert.equal(result.success, false);
    assert.equal(result.unsupportedStatus, true);
    assert.equal(h.requestRepository.findById(request.id).status, 'Pending');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 10: nonexistent request returns not found and creates nothing', () => {
    const h = createHarness('t10');
    const existing = h.submit();
    const before = h.requestRepository.findAll().length;

    const result = h.statusService.changeStatus(999, ServiceRequestStatus.IN_PROGRESS);

    assert.equal(result.success, false);
    assert.equal(result.notFound, true);
    assert.equal(h.requestRepository.findAll().length, before);
    assert.equal(h.requestRepository.findById(existing.id).status, 'Pending');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 11: valid transition preserves all request information except status', () => {
    const h = createHarness('t11');
    const request = h.submit();

    h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);
    const persisted = h.requestRepository.findById(request.id);

    assert.equal(persisted.id, request.id);
    assert.equal(persisted.residentId, request.residentId);
    assert.equal(persisted.serviceType, request.serviceType);
    assert.equal(persisted.description, request.description);
    assert.equal(persisted.dateRequested, request.dateRequested);
    assert.equal(persisted.status, 'In Progress');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 12: invalid transition preserves every persisted field', () => {
    const h = createHarness('t12');
    const request = h.submit();

    h.statusService.changeStatus(request.id, ServiceRequestStatus.COMPLETED);
    const persisted = h.requestRepository.findById(request.id);

    assert.deepEqual(persisted, request);
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Test 13: same-status transition is rejected without persistence changes', () => {
    const h = createHarness('t13');
    const request = h.submit();

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.PENDING);

    assert.equal(result.success, false);
    assert.equal(result.invalidTransition, true);
    assert.deepEqual(h.requestRepository.findById(request.id), request);
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('processes an existing request after its Resident becomes Inactive', () => {
    const h = createHarness('inactive_resident');
    const request = h.submit();
    new ResidentDeactivationService(h.residentRepository).deactivateResident('25');

    const result = h.statusService.changeStatus(request.id, ServiceRequestStatus.IN_PROGRESS);

    assert.equal(result.success, true);
    assert.equal(result.serviceRequest.status, 'In Progress');
    assert.equal(h.residentRepository.findById('25').status, 'Inactive');
    cleanup(h.residentFile, h.requestDatabase);
  });

  it('Student-Designed Test: changing one request leaves another request unchanged', () => {
    const h = createHarness('student');
    const first = h.submit({ description: 'First request' });
    const second = h.submit({ description: 'Second request' });

    h.statusService.changeStatus(first.id, ServiceRequestStatus.IN_PROGRESS);
    const persistedSecond = h.requestRepository.findById(second.id);

    assert.equal(h.requestRepository.findById(first.id).status, 'In Progress');
    assert.equal(persistedSecond.status, 'Pending');
    assert.equal(persistedSecond.description, 'Second request');
    cleanup(h.residentFile, h.requestDatabase);
  });
});
