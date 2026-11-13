import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { Resident } from '../src/models/Resident.js';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';

const createHarness = (t, name) => {
  const residentDatabase = path.join(process.cwd(), 'data', `test_t15_${name}_residents.sqlite`);
  const requestDatabase = path.join(process.cwd(), 'data', `test_t15_${name}_requests.sqlite`);
  fs.rmSync(residentDatabase, { force: true });
  fs.rmSync(requestDatabase, { force: true });
  t.after(() => {
    fs.rmSync(residentDatabase, { force: true });
    fs.rmSync(requestDatabase, { force: true });
  });

  const residentRepository = new ResidentRepository(residentDatabase);
  const serviceRequestRepository = new ServiceRequestRepository(requestDatabase);
  return {
    app: createApp({ residentRepository, serviceRequestRepository }),
    residentRepository,
    serviceRequestRepository
  };
};

const saveResident = (repository, overrides = {}) => repository.save(new Resident({
  firstName: 'Maria',
  lastName: 'Santos',
  address: '12 Mabini Street',
  contactNumber: '09123456789',
  email: 'maria@example.com',
  status: 'Active',
  ...overrides
}));

const saveRequest = (repository, overrides = {}) => repository.save(new ServiceRequest({
  residentId: '1',
  serviceType: 'Barangay Clearance',
  description: 'Clearance requested for employment.',
  dateRequested: '2026-11-13',
  status: ServiceRequestStatus.PENDING,
  ...overrides
}));

describe('T15 - System Hardening and Regression Testing', () => {
  it('Hardening Test 1 - malformed numeric aliases cannot read or mutate a Service Request', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'malformed_id');
    const saved = saveRequest(serviceRequestRepository);

    const details = await request(app).get('/service-requests/1e0');
    const mutation = await request(app)
      .post('/service-requests/1e0/status')
      .type('form')
      .send({ status: ServiceRequestStatus.IN_PROGRESS });

    assert.equal(details.statusCode, 404);
    assert.equal(mutation.statusCode, 404);
    assert.deepEqual(serviceRequestRepository.findById(saved.id), saved);
    assert.equal(serviceRequestRepository.findAll().length, 1);
  });

  it('Hardening Test 2 - repeated rejected transitions preserve the complete persisted record', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'rejected_mutations');
    const saved = saveRequest(serviceRequestRepository, {
      residentId: '00042',
      serviceType: 'Medical Assistance',
      description: 'Preserve every field after rejected transitions.',
      dateRequested: '2026-11-12'
    });

    for (const status of [ServiceRequestStatus.COMPLETED, 'Approved', ServiceRequestStatus.PENDING]) {
      const response = await request(app)
        .post(`/service-requests/${saved.id}/status`)
        .type('form')
        .send({ status });
      assert.equal(response.statusCode, 400);
      assert.deepEqual(serviceRequestRepository.findById(saved.id), saved);
    }
  });

  it('Hardening Test 3 - combined GET access across modules leaves both databases unchanged', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'read_only');
    const resident = saveResident(residentRepository);
    const serviceRequest = saveRequest(serviceRequestRepository, { residentId: resident.id });
    const residentsBefore = residentRepository.findAll();
    const requestsBefore = serviceRequestRepository.findAll();

    for (const url of [
      '/health',
      '/dashboard',
      '/residents',
      '/residents?search=Maria',
      `/residents/${resident.id}/edit`,
      '/service-requests?search=clearance&status=Pending',
      `/service-requests/${serviceRequest.id}`
    ]) {
      const response = await request(app).get(url);
      assert.equal(response.statusCode, 200, `${url} should load successfully`);
    }

    assert.deepEqual(residentRepository.findAll(), residentsBefore);
    assert.deepEqual(serviceRequestRepository.findAll(), requestsBefore);
  });

  it('Hardening Test 4 - deactivation updates Dashboard counts and blocks new requests without deleting history', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'cross_feature');
    const resident = saveResident(residentRepository);
    const historicalRequest = saveRequest(serviceRequestRepository, {
      residentId: resident.id,
      serviceType: 'Historical Request',
      description: 'This request must survive Resident deactivation.'
    });

    const deactivation = await request(app).post(`/residents/${resident.id}/deactivate`);
    const dashboard = await request(app).get('/dashboard');
    const rejectedSubmission = await request(app).post('/service-requests').type('form').send({
      residentId: resident.id,
      serviceType: 'Road Repair',
      description: 'Pothole report after deactivation.',
      dateRequested: '2026-11-13'
    });

    assert.equal(deactivation.statusCode, 303);
    assert.equal(dashboard.statusCode, 200);
    assert.match(dashboard.text, /data-metric="resident-total">1</);
    assert.match(dashboard.text, /data-metric="resident-active">0</);
    assert.match(dashboard.text, /data-metric="resident-inactive">1</);
    assert.match(dashboard.text, /data-metric="request-total">1</);
    assert.match(dashboard.text, /data-metric="request-pending">1</);
    assert.equal(rejectedSubmission.statusCode, 400);
    assert.match(rejectedSubmission.text, /Resident is inactive/);
    assert.equal(residentRepository.findById(resident.id).status, 'Inactive');
    assert.equal(residentRepository.findAll().length, 1);
    assert.deepEqual(serviceRequestRepository.findById(historicalRequest.id), historicalRequest);
    assert.equal(serviceRequestRepository.findAll().length, 1);
  });

  it('Hardening Test 5 - Completed and Cancelled states reject every transition and remain queryable', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'terminal_repeatability');
    const saved = saveRequest(serviceRequestRepository, {
      serviceType: 'Terminal Boundary Case',
      status: ServiceRequestStatus.IN_PROGRESS
    });
    const cancelled = saveRequest(serviceRequestRepository, {
      serviceType: 'Cancelled Boundary Case',
      status: ServiceRequestStatus.CANCELLED
    });

    const completion = await request(app)
      .post(`/service-requests/${saved.id}/status`)
      .type('form')
      .send({ status: ServiceRequestStatus.COMPLETED });
    assert.equal(completion.statusCode, 303);
    const completed = serviceRequestRepository.findById(saved.id);

    for (const [terminalRequest, snapshot] of [[completed, completed], [cancelled, cancelled]]) {
      for (const status of Object.values(ServiceRequestStatus)) {
        const rejected = await request(app)
          .post(`/service-requests/${terminalRequest.id}/status`)
          .type('form')
          .send({ status });
        assert.equal(rejected.statusCode, 400);
        assert.deepEqual(serviceRequestRepository.findById(terminalRequest.id), snapshot);
      }
    }

    const filtered = await request(app)
      .get('/service-requests')
      .query({ search: 'terminal', status: ServiceRequestStatus.COMPLETED });
    const details = await request(app).get(`/service-requests/${saved.id}`);
    const cancelledResults = await request(app)
      .get('/service-requests')
      .query({ search: 'cancelled boundary', status: ServiceRequestStatus.CANCELLED });
    assert.equal(filtered.statusCode, 200);
    assert.match(filtered.text, /Terminal Boundary Case/);
    assert.equal(cancelledResults.statusCode, 200);
    assert.match(cancelledResults.text, /Cancelled Boundary Case/);
    assert.equal(details.statusCode, 200);
    assert.match(details.text, /Completed/);
  });
});
