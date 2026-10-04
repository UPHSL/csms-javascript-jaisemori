import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';
import { ServiceRequestSubmissionService } from '../src/services/ServiceRequestSubmissionService.js';

const getFilePath = (name) => path.join(process.cwd(), 'data', `test_t09_${name}.json`);
const cleanup = (...filePaths) => {
  for (const filePath of filePaths) {
    try { fs.unlinkSync(filePath); } catch {}
  }
};

const activeResidentData = {
  id: '25',
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  address: '123 Mabini Street',
  contactNumber: '09932133123',
  email: 'juan@example.com',
  status: 'Active'
};

const validRequestData = {
  residentId: '25',
  serviceType: 'Barangay Clearance',
  description: 'Requesting barangay clearance for employment requirements.',
  dateRequested: '2026-10-04'
};

const buildService = (residentFile, serviceRequestFile) => {
  const residentRepository = new ResidentRepository(residentFile);
  const serviceRequestRepository = new ServiceRequestRepository(serviceRequestFile);
  const submissionService = new ServiceRequestSubmissionService(residentRepository, serviceRequestRepository);
  return { residentRepository, serviceRequestRepository, submissionService };
};

describe('T09 - Service Request Submission Tests', () => {
  it('Test 1: should submit a valid Service Request for an active Resident successfully', () => {
    const residentFile = getFilePath('resident_t1');
    const requestFile = getFilePath('request_t1');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest(validRequestData));

    assert.equal(result.success, true);
    assert.ok(result.serviceRequest);
    cleanup(residentFile, requestFile);
  });

  it('Test 2: should assign a persistence-generated ID after successful submission', () => {
    const residentFile = getFilePath('resident_t2');
    const requestFile = getFilePath('request_t2');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const request = new ServiceRequest(validRequestData);
    assert.equal(request.id, null);
    const result = submissionService.submit(request);

    assert.ok(result.serviceRequest.id);
    assert.notEqual(result.serviceRequest.id, null);
    assert.notEqual(result.serviceRequest.id, result.serviceRequest.residentId);
    cleanup(residentFile, requestFile);
  });

  it('Test 3: should persist and retrieve a submitted Service Request by ID', () => {
    const residentFile = getFilePath('resident_t3');
    const requestFile = getFilePath('request_t3');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest(validRequestData));
    const retrieved = serviceRequestRepository.findById(result.serviceRequest.id);

    assert.ok(retrieved);
    assert.equal(retrieved.id, result.serviceRequest.id);
    cleanup(residentFile, requestFile);
  });

  it('Test 4: should preserve submitted Service Request information after persistence', () => {
    const residentFile = getFilePath('resident_t4');
    const requestFile = getFilePath('request_t4');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest(validRequestData));
    const retrieved = serviceRequestRepository.findById(result.serviceRequest.id);

    assert.equal(retrieved.residentId, '25');
    assert.equal(retrieved.serviceType, 'Barangay Clearance');
    assert.equal(retrieved.description, 'Requesting barangay clearance for employment requirements.');
    assert.equal(retrieved.dateRequested, '2026-10-04');
    assert.equal(retrieved.status, ServiceRequestStatus.PENDING);
    cleanup(residentFile, requestFile);
  });

  it('Test 5: should keep a submitted Service Request status as Pending', () => {
    const residentFile = getFilePath('resident_t5');
    const requestFile = getFilePath('request_t5');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest(validRequestData));

    assert.equal(result.serviceRequest.status, ServiceRequestStatus.PENDING);
    cleanup(residentFile, requestFile);
  });

  it('Test 6: should reject blank serviceType with an identifiable validation error', () => {
    const residentFile = getFilePath('resident_t6');
    const requestFile = getFilePath('request_t6');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest({ ...validRequestData, serviceType: '   ' }));

    assert.equal(result.success, false);
    assert.equal(result.validationFailed, true);
    assert.ok(result.errors.some(error => error.includes('serviceType')));
    cleanup(residentFile, requestFile);
  });

  it('Test 7: should reject blank description with an identifiable validation error', () => {
    const residentFile = getFilePath('resident_t7');
    const requestFile = getFilePath('request_t7');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest({ ...validRequestData, description: '' }));

    assert.equal(result.success, false);
    assert.equal(result.validationFailed, true);
    assert.ok(result.errors.some(error => error.includes('description')));
    cleanup(residentFile, requestFile);
  });

  it('Test 8: should not persist an invalid Service Request', () => {
    const residentFile = getFilePath('resident_t8');
    const requestFile = getFilePath('request_t8');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    submissionService.submit(new ServiceRequest({ ...validRequestData, serviceType: '' }));

    assert.equal(serviceRequestRepository.findAll().length, 0);
    cleanup(residentFile, requestFile);
  });

  it('Test 9: should reject a structurally valid but nonexistent residentId without persistence', () => {
    const residentFile = getFilePath('resident_t9');
    const requestFile = getFilePath('request_t9');
    cleanup(residentFile, requestFile);
    const { serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);

    const result = submissionService.submit(new ServiceRequest({ ...validRequestData, residentId: '999' }));

    assert.equal(result.success, false);
    assert.equal(result.residentNotFound, true);
    assert.equal(serviceRequestRepository.findAll().length, 0);
    cleanup(residentFile, requestFile);
  });

  it('Test 10: should reject an Inactive Resident without modifying the Resident or persisting the request', () => {
    const residentFile = getFilePath('resident_t10');
    const requestFile = getFilePath('request_t10');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident({ ...activeResidentData, status: 'Inactive' }));

    const result = submissionService.submit(new ServiceRequest(validRequestData));
    const resident = residentRepository.findById('25');

    assert.equal(result.success, false);
    assert.equal(result.residentInactive, true);
    assert.equal(resident.status, 'Inactive');
    assert.equal(serviceRequestRepository.findAll().length, 0);
    cleanup(residentFile, requestFile);
  });

  it('Test 11: should reject a new Service Request with a non-Pending status', () => {
    const residentFile = getFilePath('resident_t11');
    const requestFile = getFilePath('request_t11');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest({ ...validRequestData, status: 'Completed' }));

    assert.equal(result.success, false);
    assert.equal(result.validationFailed, true);
    assert.ok(result.errors.some(error => error.includes('status')));
    assert.equal(serviceRequestRepository.findAll().length, 0);
    cleanup(residentFile, requestFile);
  });

  it('Test 12: should persist across separate Service Request repository instances', () => {
    const residentFile = getFilePath('resident_t12');
    const requestFile = getFilePath('request_t12');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest(validRequestData));
    const separateRepository = new ServiceRequestRepository(requestFile);
    const retrieved = separateRepository.findById(result.serviceRequest.id);

    assert.ok(retrieved);
    assert.equal(retrieved.description, validRequestData.description);
    cleanup(residentFile, requestFile);
  });

  it('Test 13: should not modify the Resident after successful Service Request submission', () => {
    const residentFile = getFilePath('resident_t13');
    const requestFile = getFilePath('request_t13');
    cleanup(residentFile, requestFile);
    const { residentRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    submissionService.submit(new ServiceRequest(validRequestData));
    const resident = residentRepository.findById('25');

    assert.equal(resident.id, activeResidentData.id);
    assert.equal(resident.firstName, activeResidentData.firstName);
    assert.equal(resident.lastName, activeResidentData.lastName);
    assert.equal(resident.address, activeResidentData.address);
    assert.equal(resident.contactNumber, activeResidentData.contactNumber);
    assert.equal(resident.email, activeResidentData.email);
    assert.equal(resident.status, activeResidentData.status);
    cleanup(residentFile, requestFile);
  });

  it('Date Validation Test: should reject an invalid request date without persistence', () => {
    const residentFile = getFilePath('resident_date');
    const requestFile = getFilePath('request_date');
    cleanup(residentFile, requestFile);
    const { residentRepository, serviceRequestRepository, submissionService } = buildService(residentFile, requestFile);
    residentRepository.save(new Resident(activeResidentData));

    const result = submissionService.submit(new ServiceRequest({ ...validRequestData, dateRequested: 'not-a-date' }));

    assert.equal(result.success, false);
    assert.equal(result.validationFailed, true);
    assert.ok(result.errors.some(error => error.includes('dateRequested')));
    assert.equal(serviceRequestRepository.findAll().length, 0);
    cleanup(residentFile, requestFile);
  });
});
