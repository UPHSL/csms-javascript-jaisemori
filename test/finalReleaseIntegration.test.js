import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { it } from 'node:test';

import request from 'supertest';

import { createApp } from '../src/app.js';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';

it('completed eligible Resident request persists and reconciles across query and release Dashboard', async t => {
  const residentDatabase = path.join(process.cwd(), 'data', 'test_t16_final_residents.sqlite');
  const requestDatabase = path.join(process.cwd(), 'data', 'test_t16_final_requests.sqlite');
  fs.rmSync(residentDatabase, { force: true });
  fs.rmSync(requestDatabase, { force: true });
  t.after(() => {
    fs.rmSync(residentDatabase, { force: true });
    fs.rmSync(requestDatabase, { force: true });
  });

  const residentRepository = new ResidentRepository(residentDatabase);
  const serviceRequestRepository = new ServiceRequestRepository(requestDatabase);
  const app = createApp({ residentRepository, serviceRequestRepository });

  const registration = await request(app).post('/residents').type('form').send({
    firstName: 'Lina',
    lastName: 'Reyes',
    address: '18 Rizal Avenue',
    contactNumber: '09171234567',
    email: 'lina.reyes@example.com'
  });
  assert.equal(registration.statusCode, 303);

  const resident = residentRepository.findAll()[0];
  assert.equal(resident.status, 'Active');

  const submission = await request(app).post('/service-requests').type('form').send({
    residentId: resident.id,
    serviceType: 'Final Release Assistance',
    description: 'Verify the complete CSMS release workflow.',
    dateRequested: '2026-11-13'
  });
  assert.equal(submission.statusCode, 303);

  const submitted = serviceRequestRepository.findAll()[0];
  assert.equal(submitted.residentId, resident.id);
  assert.equal(submitted.status, ServiceRequestStatus.PENDING);

  const started = await request(app)
    .post(`/service-requests/${submitted.id}/status`)
    .type('form')
    .send({ status: ServiceRequestStatus.IN_PROGRESS });
  const completed = await request(app)
    .post(`/service-requests/${submitted.id}/status`)
    .type('form')
    .send({ status: ServiceRequestStatus.COMPLETED });
  assert.equal(started.statusCode, 303);
  assert.equal(completed.statusCode, 303);

  const query = await request(app)
    .get('/service-requests')
    .query({ search: 'final release', status: ServiceRequestStatus.COMPLETED });
  const dashboard = await request(app).get('/dashboard');

  assert.equal(query.statusCode, 200);
  assert.match(query.text, /Final Release Assistance/);
  assert.match(query.text, /Completed/);
  assert.equal(dashboard.statusCode, 200);
  assert.match(dashboard.text, /data-release-version="1\.0\.0"/);
  assert.match(dashboard.text, /data-metric="resident-total">1</);
  assert.match(dashboard.text, /data-metric="resident-active">1</);
  assert.match(dashboard.text, /data-metric="request-total">1</);
  assert.match(dashboard.text, /data-metric="request-open">0</);
  assert.match(dashboard.text, /data-metric="request-completed">1</);

  const persistedResident = new ResidentRepository(residentDatabase).findById(resident.id);
  const persistedRequest = new ServiceRequestRepository(requestDatabase).findById(submitted.id);
  assert.deepEqual(persistedResident, resident);
  assert.deepEqual(persistedRequest, new ServiceRequest({
    ...submitted,
    status: ServiceRequestStatus.COMPLETED
  }));
});
