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
  const residentFile = path.join(process.cwd(), 'data', `test_t13_${name}_residents.json`);
  const requestDatabase = path.join(process.cwd(), 'data', `test_t13_${name}_requests.sqlite`);
  fs.rmSync(residentFile, { force: true });
  fs.rmSync(requestDatabase, { force: true });
  t.after(() => {
    fs.rmSync(residentFile, { force: true });
    fs.rmSync(requestDatabase, { force: true });
  });

  const residentRepository = new ResidentRepository(residentFile);
  const serviceRequestRepository = new ServiceRequestRepository(requestDatabase);
  const app = createApp({ residentRepository, serviceRequestRepository });
  return { app, residentRepository, serviceRequestRepository };
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
  dateRequested: '2026-11-01',
  status: ServiceRequestStatus.PENDING,
  ...overrides
}));

describe('T13 - Service Request Management Interface', () => {
  it('Test 1: renders the Service Request Management page and navigation', async t => {
    const { app } = createHarness(t, 'management_page');

    const response = await request(app).get('/service-requests');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Service Request Management/);
    assert.match(response.text, /Submit Service Request/);
    assert.match(response.text, /Search and Filter/);
    assert.match(response.text, /href="\/residents"/);
  });

  it('Test 2: lists persisted requests in T11 order with required information and actions', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'listing');
    const older = saveRequest(serviceRequestRepository, {
      residentId: '001',
      serviceType: 'Road Repair',
      description: 'Old pothole report',
      dateRequested: '2026-10-01'
    });
    const sameDateFirst = saveRequest(serviceRequestRepository, {
      serviceType: 'Medical Assistance',
      dateRequested: '2026-11-03'
    });
    const sameDateSecond = saveRequest(serviceRequestRepository, {
      serviceType: 'Water Service',
      dateRequested: '2026-11-03'
    });

    const response = await request(app).get('/service-requests');

    assert.equal(response.statusCode, 200);
    for (const value of [
      older.id, '001', 'Road Repair', '2026-10-01',
      sameDateFirst.id, 'Medical Assistance',
      sameDateSecond.id, 'Water Service', 'Pending', 'View Details', 'Start Processing', 'Cancel'
    ]) {
      assert.match(response.text, new RegExp(String(value)));
    }
    assert.ok(response.text.indexOf('Water Service') < response.text.indexOf('Medical Assistance'));
    assert.ok(response.text.indexOf('Medical Assistance') < response.text.indexOf('Road Repair'));
  });

  it('Test 3: renders an empty listing safely', async t => {
    const { app } = createHarness(t, 'empty');

    const response = await request(app).get('/service-requests');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /No Service Requests found\./);
  });

  it('Test 4: performs partial case-insensitive text search and handles no matches', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'search');
    saveRequest(serviceRequestRepository, {
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.'
    });
    saveRequest(serviceRequestRepository, {
      serviceType: 'Road Repair',
      description: 'Pothole inspection requested.'
    });

    const match = await request(app).get('/service-requests').query({ search: '  mEdIc  ' });
    const noMatch = await request(app).get('/service-requests').query({ search: 'unmatched' });

    assert.equal(match.statusCode, 200);
    assert.match(match.text, /Medical Assistance/);
    assert.doesNotMatch(match.text, /Road Repair/);
    assert.match(match.text, /value="  mEdIc  "/);
    assert.equal(noMatch.statusCode, 200);
    assert.match(noMatch.text, /No Service Requests found\./);
  });

  it('Test 5: supports All and every exact status filter', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'statuses');
    for (const status of Object.values(ServiceRequestStatus)) {
      saveRequest(serviceRequestRepository, { serviceType: `${status} Request`, status });
    }

    const all = await request(app).get('/service-requests').query({ status: '' });
    assert.equal(all.statusCode, 200);
    for (const status of Object.values(ServiceRequestStatus)) {
      assert.match(all.text, new RegExp(`${status} Request`));
      const filtered = await request(app).get('/service-requests').query({ status });
      assert.equal(filtered.statusCode, 200);
      assert.match(filtered.text, new RegExp(`${status} Request`));
      for (const other of Object.values(ServiceRequestStatus).filter(value => value !== status)) {
        assert.doesNotMatch(filtered.text, new RegExp(`${other} Request`));
      }
      assert.match(filtered.text, new RegExp(`<option value="${status}" selected>`));
    }
  });

  it('Test 6: combines text search with status filtering through T11', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'combined');
    const matching = saveRequest(serviceRequestRepository, {
      serviceType: 'Medical Assistance',
      description: 'Urgent medicine support.',
      status: ServiceRequestStatus.IN_PROGRESS
    });
    saveRequest(serviceRequestRepository, {
      serviceType: 'Medical Assistance',
      description: 'Urgent medicine support.',
      status: ServiceRequestStatus.COMPLETED
    });

    const response = await request(app).get('/service-requests').query({
      search: 'medicine',
      status: ServiceRequestStatus.IN_PROGRESS
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.text, new RegExp(`>${matching.id}<`));
    assert.match(response.text, /In Progress/);
    assert.doesNotMatch(response.text, /Completed Request/);
  });

  it('safely handles malformed repeated filters and unsupported statuses', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'malformed_filters');
    saveRequest(serviceRequestRepository);

    const repeated = await request(app).get('/service-requests?search=clear&search=road&status=Pending&status=Completed');
    const unsupported = await request(app).get('/service-requests').query({ status: 'Approved' });

    assert.equal(repeated.statusCode, 200);
    assert.match(repeated.text, /Service Request Management/);
    assert.doesNotMatch(repeated.text, /TypeError|\.trim is not a function|serviceRequestController\.js/i);
    assert.equal(unsupported.statusCode, 400);
    assert.match(unsupported.text, /Unsupported Service Request status filter\./);
  });

  it('Test 7: renders the submission form without Service Request ID or status controls', async t => {
    const { app } = createHarness(t, 'submission_form');

    const response = await request(app).get('/service-requests/submit');

    assert.equal(response.statusCode, 200);
    for (const label of ['Resident ID', 'Service Type', 'Description', 'Date Requested']) {
      assert.match(response.text, new RegExp(label));
    }
    for (const name of ['residentId', 'serviceType', 'description', 'dateRequested']) {
      assert.match(response.text, new RegExp(`name="${name}"`));
    }
    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
  });

  it('Test 8: submits through T09 with a persistence-generated ID and Pending status', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'valid_submission');
    const resident = saveResident(residentRepository);

    const response = await request(app).post('/service-requests').type('form').send({
      id: '999',
      residentId: resident.id,
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.',
      dateRequested: '2026-11-12',
      status: 'Completed'
    });

    assert.equal(response.statusCode, 303);
    assert.match(response.headers.location, /^\/service-requests\?message=/);
    const persisted = serviceRequestRepository.findAll();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].id, 1);
    assert.equal(persisted[0].status, ServiceRequestStatus.PENDING);
    assert.equal(persisted[0].residentId, resident.id);
    assert.equal(persisted[0].serviceType, 'Medical Assistance');
  });

  it('Test 9: rejects invalid submissions through T09, preserves values, and writes nothing', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'invalid_submission');
    const resident = saveResident(residentRepository);

    const response = await request(app).post('/service-requests').type('form').send({
      residentId: resident.id,
      serviceType: 'Medical Assistance',
      description: '',
      dateRequested: 'not-a-date'
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /description is required\./);
    assert.match(response.text, /dateRequested must be a valid YYYY-MM-DD date\./);
    assert.match(response.text, /value="Medical Assistance"/);
    assert.deepEqual(serviceRequestRepository.findAll(), []);
  });

  it('Test 10: displays Resident-not-found feedback without persistence', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'missing_resident');

    const response = await request(app).post('/service-requests').type('form').send({
      residentId: '999',
      serviceType: 'Road Repair',
      description: 'Pothole report.',
      dateRequested: '2026-11-12'
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Resident not found\./);
    assert.deepEqual(serviceRequestRepository.findAll(), []);
  });

  it('Test 11: displays inactive-Resident eligibility feedback without persistence', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'inactive_resident');
    const resident = saveResident(residentRepository, { status: 'Inactive' });

    const response = await request(app).post('/service-requests').type('form').send({
      residentId: resident.id,
      serviceType: 'Road Repair',
      description: 'Pothole report.',
      dateRequested: '2026-11-12'
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Resident is inactive and cannot submit a new Service Request\./);
    assert.deepEqual(serviceRequestRepository.findAll(), []);
  });

  it('Test 12: multiple failed submissions never create partial records', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'failed_persistence');
    const resident = saveResident(residentRepository);
    const invalidPayloads = [
      { residentId: resident.id, serviceType: '', description: 'Missing type', dateRequested: '2026-11-12' },
      { residentId: '888', serviceType: 'Road Repair', description: 'Missing Resident', dateRequested: '2026-11-12' }
    ];

    for (const payload of invalidPayloads) {
      const response = await request(app).post('/service-requests').type('form').send(payload);
      assert.equal(response.statusCode, 400);
    }
    assert.equal(serviceRequestRepository.findAll().length, 0);
  });

  it('Test 13: renders complete Service Request details through T11', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'details');
    const saved = saveRequest(serviceRequestRepository, {
      residentId: '00025',
      serviceType: 'Medical Assistance',
      description: 'A complete, deliberately long description that must remain visible on the details page.',
      dateRequested: '2026-11-10',
      status: ServiceRequestStatus.IN_PROGRESS
    });

    const response = await request(app).get(`/service-requests/${saved.id}`);

    assert.equal(response.statusCode, 200);
    for (const value of [saved.id, '00025', 'Medical Assistance', saved.description, '2026-11-10', 'In Progress']) {
      assert.match(response.text, new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });

  it('Test 14: handles missing and invalid Service Request IDs with controlled HTML', async t => {
    const { app } = createHarness(t, 'missing_details');

    for (const id of ['999999', 'not-a-number']) {
      const response = await request(app).get(`/service-requests/${id}`);
      assert.equal(response.statusCode, 404);
      assert.match(response.text, /Service Request not found\./);
      assert.doesNotMatch(response.text, /TypeError|serviceRequestController\.js|SQLITE/i);
    }
  });

  it('Test 15: performs both valid Pending workflow actions through T10', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'pending_actions');
    const toStart = saveRequest(serviceRequestRepository, { description: 'Start this request' });
    const toCancel = saveRequest(serviceRequestRepository, { description: 'Cancel this request' });

    const started = await request(app).post(`/service-requests/${toStart.id}/status`).type('form').send({ status: 'In Progress' });
    const cancelled = await request(app).post(`/service-requests/${toCancel.id}/status`).type('form').send({ status: 'Cancelled' });

    assert.equal(started.statusCode, 303);
    assert.equal(cancelled.statusCode, 303);
    assert.equal(serviceRequestRepository.findById(toStart.id).status, ServiceRequestStatus.IN_PROGRESS);
    assert.equal(serviceRequestRepository.findById(toCancel.id).status, ServiceRequestStatus.CANCELLED);
  });

  it('Test 16: performs both valid In Progress workflow actions through T10', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'in_progress_actions');
    const toComplete = saveRequest(serviceRequestRepository, { status: ServiceRequestStatus.IN_PROGRESS });
    const toCancel = saveRequest(serviceRequestRepository, { status: ServiceRequestStatus.IN_PROGRESS });

    const completed = await request(app).post(`/service-requests/${toComplete.id}/status`).type('form').send({ status: 'Completed' });
    const cancelled = await request(app).post(`/service-requests/${toCancel.id}/status`).type('form').send({ status: 'Cancelled' });

    assert.equal(completed.statusCode, 303);
    assert.equal(cancelled.statusCode, 303);
    assert.equal(serviceRequestRepository.findById(toComplete.id).status, ServiceRequestStatus.COMPLETED);
    assert.equal(serviceRequestRepository.findById(toCancel.id).status, ServiceRequestStatus.CANCELLED);
  });

  it('Test 17: terminal requests remain visible without workflow controls', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'terminal_states');
    const completed = saveRequest(serviceRequestRepository, { status: ServiceRequestStatus.COMPLETED });
    const cancelled = saveRequest(serviceRequestRepository, { status: ServiceRequestStatus.CANCELLED });

    for (const saved of [completed, cancelled]) {
      const details = await request(app).get(`/service-requests/${saved.id}`);
      assert.equal(details.statusCode, 200);
      assert.match(details.text, new RegExp(saved.status));
      assert.doesNotMatch(details.text, />Start Processing<|>Complete<|>Cancel</);
    }
    const listing = await request(app).get('/service-requests');
    assert.match(listing.text, /Completed/);
    assert.match(listing.text, /Cancelled/);
  });

  it('Test 18: rejects invalid and unsupported direct transitions through T10', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'invalid_transitions');
    const saved = saveRequest(serviceRequestRepository);

    const invalid = await request(app).post(`/service-requests/${saved.id}/status`).type('form').send({ status: 'Completed' });
    const unsupported = await request(app).post(`/service-requests/${saved.id}/status`).type('form').send({ status: 'Approved' });

    assert.equal(invalid.statusCode, 400);
    assert.match(invalid.text, /Cannot change Service Request status from Pending to Completed\./);
    assert.equal(unsupported.statusCode, 400);
    assert.match(unsupported.text, /Unsupported Service Request status\./);
    assert.deepEqual(serviceRequestRepository.findById(saved.id), saved);
  });

  it('Test 19: valid status changes preserve every non-status field', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'preserve_fields');
    const saved = saveRequest(serviceRequestRepository, {
      residentId: '00025',
      serviceType: 'Road Repair',
      description: 'Preserve this exact description.',
      dateRequested: '2026-11-09'
    });

    await request(app).post(`/service-requests/${saved.id}/status`).type('form').send({ status: 'In Progress' });
    const updated = serviceRequestRepository.findById(saved.id);

    assert.equal(updated.status, ServiceRequestStatus.IN_PROGRESS);
    assert.deepEqual({
      id: updated.id,
      residentId: updated.residentId,
      serviceType: updated.serviceType,
      description: updated.description,
      dateRequested: updated.dateRequested
    }, {
      id: saved.id,
      residentId: saved.residentId,
      serviceType: saved.serviceType,
      description: saved.description,
      dateRequested: saved.dateRequested
    });
  });

  it('Test 20: all GET routes are read-only and workflow mutation is POST-only', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'read_only_gets');
    const saved = saveRequest(serviceRequestRepository);
    const before = serviceRequestRepository.findAll();

    for (const url of ['/service-requests', '/service-requests/submit', `/service-requests/${saved.id}`]) {
      const response = await request(app).get(url);
      assert.equal(response.statusCode, 200);
    }
    const mutationAttempt = await request(app).get(`/service-requests/${saved.id}/status`).query({ status: 'Cancelled' });
    assert.equal(mutationAttempt.statusCode, 404);
    assert.deepEqual(serviceRequestRepository.findAll(), before);
  });

  it('handles empty submission bodies through T09 without exposing a stack trace', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'empty_submission_body');

    const response = await request(app).post('/service-requests');

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /residentId must be a positive identifier\./);
    assert.match(response.text, /serviceType is required\./);
    assert.doesNotMatch(response.text, /TypeError|serviceRequestController\.js|Cannot read propert/i);
    assert.deepEqual(serviceRequestRepository.findAll(), []);
  });

  it('handles empty workflow bodies through T10 with controlled errors and missing-ID responses', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'empty_workflow_body');
    const saved = saveRequest(serviceRequestRepository);

    const existing = await request(app).post(`/service-requests/${saved.id}/status`);
    const missing = await request(app).post('/service-requests/999999/status');

    assert.equal(existing.statusCode, 400);
    assert.match(existing.text, /Unsupported Service Request status\./);
    assert.doesNotMatch(existing.text, /TypeError|serviceRequestController\.js|Cannot read propert/i);
    assert.equal(missing.statusCode, 404);
    assert.match(missing.text, /Service Request not found\./);
    assert.deepEqual(serviceRequestRepository.findById(saved.id), saved);
  });
});
