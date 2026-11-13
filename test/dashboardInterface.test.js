import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { Resident } from '../src/models/Resident.js';
import { ServiceRequest } from '../src/models/ServiceRequest.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';

const createHarness = (t, name) => {
  const residentPath = path.join(process.cwd(), 'data', `test_t14_${name}_residents.sqlite`);
  const requestPath = path.join(process.cwd(), 'data', `test_t14_${name}_requests.sqlite`);
  fs.rmSync(residentPath, { force: true });
  fs.rmSync(requestPath, { force: true });
  t.after(() => {
    fs.rmSync(residentPath, { force: true });
    fs.rmSync(requestPath, { force: true });
  });
  const residentRepository = new ResidentRepository(residentPath);
  const serviceRequestRepository = new ServiceRequestRepository(requestPath);
  return {
    residentRepository,
    serviceRequestRepository,
    app: createApp({ residentRepository, serviceRequestRepository })
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
  serviceType: 'Road Repair',
  description: 'Repair the damaged road surface.',
  dateRequested: '2026-01-01',
  status: 'Pending',
  ...overrides
}));

const assertMetric = (html, metric, value) => {
  assert.match(html, new RegExp(`data-metric="${metric}"[^>]*>\\s*${value}\\s*<`));
};

describe('T14 - CSMS Dashboard', () => {
  it('Test 1: dashboard loads successfully with management navigation', async t => {
    const { app } = createHarness(t, 'loads');
    const response = await request(app).get('/dashboard');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /CSMS Dashboard/);
    assert.match(response.text, /href="\/dashboard"/);
    assert.match(response.text, /href="\/residents"/);
    assert.match(response.text, /href="\/service-requests"/);
    assert.match(response.text, /CSMS v1\.0\.0/);
  });

  it('renders the professional civic dashboard shell without changing its read-only context', async t => {
    const { app } = createHarness(t, 'professional_shell');
    const response = await request(app).get('/dashboard');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /class="app-header"/);
    assert.match(response.text, /class="dashboard-hero"/);
    assert.match(response.text, /class="dashboard-content"/);
    assert.match(response.text, /Read-only overview/);
    assert.match(response.text, /aria-label="Primary navigation"/);
    assert.match(response.text, /href="\/service-requests\/submit"/);
  });

  it('serves scoped dashboard styles with accessible small text and focus colors', async t => {
    const { app } = createHarness(t, 'professional_styles');
    const response = await request(app).get('/css/style.css');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /\.dashboard-page \.metric-icon-blue/);
    assert.match(response.text, /\.dashboard-page \.dashboard-action/);
    assert.match(response.text, /\.dashboard-page \.section-description[^}]*#52637a/s);
    assert.match(response.text, /outline:\s*3px solid #1d4ed8/);
  });

  it('Test 2: empty dashboard displays every zero count and a safe empty state', async t => {
    const { app } = createHarness(t, 'empty');
    const response = await request(app).get('/dashboard');

    for (const metric of [
      'resident-total', 'resident-active', 'resident-inactive',
      'request-total', 'request-pending', 'request-in-progress',
      'request-completed', 'request-cancelled', 'request-open'
    ]) assertMetric(response.text, metric, 0);
    assert.match(response.text, /No Service Requests have been submitted yet\./);
  });

  it('Test 3: displays the correct total Resident count', async t => {
    const { app, residentRepository } = createHarness(t, 'resident_total');
    saveResident(residentRepository);
    saveResident(residentRepository, { firstName: 'Jose', email: 'jose@example.com' });

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'resident-total', 2);
  });

  it('Test 4: displays correct Active and Inactive Resident counts', async t => {
    const { app, residentRepository } = createHarness(t, 'resident_statuses');
    saveResident(residentRepository);
    saveResident(residentRepository, { firstName: 'Jose', email: 'jose@example.com', status: 'Inactive' });

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'resident-active', 1);
    assertMetric(response.text, 'resident-inactive', 1);
  });

  it('Test 5: displays the correct total Service Request count', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'request_total');
    saveRequest(serviceRequestRepository);
    saveRequest(serviceRequestRepository, { status: 'Completed' });

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'request-total', 2);
  });

  it('Test 6: displays correct counts for all four Service Request statuses', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'request_statuses');
    for (const status of ['Pending', 'In Progress', 'Completed', 'Cancelled']) {
      saveRequest(serviceRequestRepository, { status });
    }

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'request-pending', 1);
    assertMetric(response.text, 'request-in-progress', 1);
    assertMetric(response.text, 'request-completed', 1);
    assertMetric(response.text, 'request-cancelled', 1);
  });

  it('Test 7: Service Request total reconciles with the four supported status counts', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'request_reconcile');
    for (const status of ['Pending', 'Pending', 'In Progress', 'Completed', 'Cancelled']) {
      saveRequest(serviceRequestRepository, { status });
    }

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'request-total', 5);
    assertMetric(response.text, 'request-pending', 2);
    assertMetric(response.text, 'request-in-progress', 1);
    assertMetric(response.text, 'request-completed', 1);
    assertMetric(response.text, 'request-cancelled', 1);
  });

  it('Test 8: Open Service Requests equals Pending plus In Progress', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'open_count');
    for (const status of ['Pending', 'Pending', 'In Progress', 'Completed', 'Cancelled']) {
      saveRequest(serviceRequestRepository, { status });
    }

    const response = await request(app).get('/dashboard');
    assertMetric(response.text, 'request-open', 3);
  });

  it('Test 9: Resident deactivation is reflected without changing the total', async t => {
    const { app, residentRepository } = createHarness(t, 'deactivation');
    const resident = saveResident(residentRepository);

    await request(app).post(`/residents/${resident.id}/deactivate`).expect(303);
    const response = await request(app).get('/dashboard');

    assertMetric(response.text, 'resident-total', 1);
    assertMetric(response.text, 'resident-active', 0);
    assertMetric(response.text, 'resident-inactive', 1);
  });

  it('Test 10: Pending to In Progress transition updates dashboard status counts', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'transition_progress');
    const serviceRequest = saveRequest(serviceRequestRepository);

    await request(app).post(`/service-requests/${serviceRequest.id}/status`)
      .type('form').send({ status: 'In Progress' }).expect(303);
    const response = await request(app).get('/dashboard');

    assertMetric(response.text, 'request-pending', 0);
    assertMetric(response.text, 'request-in-progress', 1);
    assertMetric(response.text, 'request-open', 1);
  });

  it('Test 11: terminal transition reduces Open count without changing total', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'transition_terminal');
    const serviceRequest = saveRequest(serviceRequestRepository, { status: 'In Progress' });

    await request(app).post(`/service-requests/${serviceRequest.id}/status`)
      .type('form').send({ status: 'Completed' }).expect(303);
    const response = await request(app).get('/dashboard');

    assertMetric(response.text, 'request-total', 1);
    assertMetric(response.text, 'request-completed', 1);
    assertMetric(response.text, 'request-open', 0);
  });

  it('Test 12: recent requests display no more than five rows with T13 View actions', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'recent_limit');
    const saved = Array.from({ length: 7 }, (_, index) => saveRequest(serviceRequestRepository, {
      serviceType: `Request ${index + 1}`,
      dateRequested: `2026-01-0${index + 1}`
    }));

    const response = await request(app).get('/dashboard');
    const viewLinks = response.text.match(/href="\/service-requests\/\d+"/g) ?? [];

    assert.equal(viewLinks.length, 5);
    assert.match(response.text, new RegExp(`href="/service-requests/${saved[6].id}"`));
    assert.doesNotMatch(response.text, new RegExp(`href="/service-requests/${saved[0].id}"`));
  });

  it('Test 13: recent requests use dateRequested DESC then ID DESC ordering', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'recent_order');
    const older = saveRequest(serviceRequestRepository, { serviceType: 'Older', dateRequested: '2026-01-01' });
    const firstSameDate = saveRequest(serviceRequestRepository, { serviceType: 'First Same Date', dateRequested: '2026-01-03' });
    const secondSameDate = saveRequest(serviceRequestRepository, { serviceType: 'Second Same Date', dateRequested: '2026-01-03' });

    const response = await request(app).get('/dashboard');
    const secondPosition = response.text.indexOf(`service-requests/${secondSameDate.id}`);
    const firstPosition = response.text.indexOf(`service-requests/${firstSameDate.id}`);
    const olderPosition = response.text.indexOf(`service-requests/${older.id}`);

    assert.ok(secondPosition < firstPosition);
    assert.ok(firstPosition < olderPosition);
  });

  it('Test 14: Completed and Cancelled requests appear in recent results', async t => {
    const { app, serviceRequestRepository } = createHarness(t, 'recent_terminal');
    const completed = saveRequest(serviceRequestRepository, { status: 'Completed', serviceType: 'Completed Work' });
    const cancelled = saveRequest(serviceRequestRepository, { status: 'Cancelled', serviceType: 'Cancelled Work' });

    const response = await request(app).get('/dashboard');
    assert.match(response.text, /Completed Work/);
    assert.match(response.text, /Cancelled Work/);
    assert.match(response.text, new RegExp(`href="/service-requests/${completed.id}"`));
    assert.match(response.text, new RegExp(`href="/service-requests/${cancelled.id}"`));
  });

  it('Test 15: repeated Dashboard GET requests do not modify persistence', async t => {
    const { app, residentRepository, serviceRequestRepository } = createHarness(t, 'read_only');
    saveResident(residentRepository);
    saveRequest(serviceRequestRepository);
    const residentsBefore = residentRepository.findAll();
    const requestsBefore = serviceRequestRepository.findAll();

    await request(app).get('/dashboard').expect(200);
    await request(app).get('/dashboard').expect(200);
    await request(app).get('/dashboard').expect(200);

    assert.deepEqual(residentRepository.findAll(), residentsBefore);
    assert.deepEqual(serviceRequestRepository.findAll(), requestsBefore);
  });
});
