import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';

const createHarness = (t, name) => {
  const filePath = path.join(process.cwd(), 'data', `test_t12_${name}.json`);
  fs.rmSync(filePath, { force: true });
  t.after(() => fs.rmSync(filePath, { force: true }));
  const repository = new ResidentRepository(filePath);
  return { repository, app: createApp({ residentRepository: repository }) };
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

describe('T12 - Resident Management Interface', () => {
  it('Test 1: renders the Resident Management page', async t => {
    const { app } = createHarness(t, 'management_page');

    const response = await request(app).get('/residents');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Resident Management/);
    assert.match(response.text, /Register Resident/);
    assert.match(response.text, /Search Residents/);
    assert.match(response.text, /CSMS v1\.0\.0/);
    assert.match(response.text, /class="management-page"/);
    assert.match(response.text, /<header class="app-header">/);
    assert.match(response.text, /<nav class="app-nav" aria-label="Primary navigation">/);
    assert.match(response.text, /href="\/residents" aria-current="page"/);
    assert.doesNotMatch(response.text, /class="section-nav"/);
  });

  it('Test 2: lists persisted Residents in T05 order with all required information', async t => {
    const { app, repository } = createHarness(t, 'listing');
    const zed = saveResident(repository, {
      firstName: 'Zed',
      lastName: 'Andres',
      address: '9 First Street',
      contactNumber: '09987654321',
      email: 'zed@example.com'
    });
    const maria = saveResident(repository);

    const response = await request(app).get('/residents');

    assert.equal(response.statusCode, 200);
    for (const value of [
      zed.id, 'Zed', 'Andres', '9 First Street', '09987654321', 'zed@example.com',
      maria.id, 'Maria', 'Santos', '12 Mabini Street', '09123456789', 'maria@example.com',
      'Active', 'Edit', 'Deactivate'
    ]) {
      assert.match(response.text, new RegExp(value));
    }
    assert.ok(response.text.indexOf('Zed') < response.text.indexOf('Maria'));
  });

  it('Test 3: partial case-insensitive search includes matches and excludes non-matches', async t => {
    const { app, repository } = createHarness(t, 'search');
    saveResident(repository, { firstName: 'Maria', lastName: 'Santos' });
    saveResident(repository, {
      firstName: 'Jose',
      lastName: 'Reyes',
      email: 'jose@example.com'
    });

    const response = await request(app).get('/residents').query({ search: '  sAn  ' });

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Maria/);
    assert.match(response.text, /Santos/);
    assert.doesNotMatch(response.text, /Jose/);
    assert.doesNotMatch(response.text, /Reyes/);
  });

  it('Test 4: blank search displays all Residents and no-match search renders a friendly message', async t => {
    const { app, repository } = createHarness(t, 'blank_search');
    saveResident(repository, { firstName: 'Maria', lastName: 'Santos' });
    saveResident(repository, {
      firstName: 'Jose',
      lastName: 'Reyes',
      email: 'jose@example.com'
    });

    const blank = await request(app).get('/residents').query({ search: '   ' });
    const noMatch = await request(app).get('/residents').query({ search: 'Nobody' });

    assert.match(blank.text, /Maria/);
    assert.match(blank.text, /Jose/);
    assert.equal(noMatch.statusCode, 200);
    assert.match(noMatch.text, /No Residents found\./);
  });

  it('handles repeated search parameters without exposing an internal error', async t => {
    const { app, repository } = createHarness(t, 'repeated_search');
    saveResident(repository);

    const response = await request(app).get('/residents?search=Maria&search=Santos');

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Resident Management/);
    assert.match(response.text, /Maria/);
    assert.doesNotMatch(response.text, /TypeError|\.trim is not a function|residentController\.js/i);
  });

  it('Test 5: registration form renders all required fields without ID or status inputs', async t => {
    const { app } = createHarness(t, 'registration_form');

    const response = await request(app).get('/residents/register');

    assert.equal(response.statusCode, 200);
    for (const label of ['First Name', 'Last Name', 'Address', 'Contact Number', 'Email']) {
      assert.match(response.text, new RegExp(label));
    }
    for (const name of ['firstName', 'lastName', 'address', 'contactNumber', 'email']) {
      assert.match(response.text, new RegExp(`name="${name}"`));
    }
    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
  });

  it('Test 6: valid registration persists an auto-ID Active Resident and redirects to listing', async t => {
    const { app, repository } = createHarness(t, 'valid_registration');

    const response = await request(app).post('/residents').type('form').send({
      id: '999',
      firstName: 'Lina',
      lastName: 'Cruz',
      address: '8 Rizal Avenue',
      contactNumber: '09112223333',
      email: 'lina@example.com',
      status: 'Inactive'
    });

    assert.equal(response.statusCode, 303);
    assert.match(response.headers.location, /^\/residents\?message=/);
    const residents = repository.findAll();
    assert.equal(residents.length, 1);
    assert.equal(residents[0].id, '1');
    assert.equal(residents[0].status, 'Active');
    const listing = await request(app).get(response.headers.location);
    assert.match(listing.text, /Resident registered successfully\./);
    assert.match(listing.text, /Lina/);
  });

  it('Test 7: invalid registration shows authoritative feedback, preserves values, and writes nothing', async t => {
    const { app, repository } = createHarness(t, 'invalid_registration');

    const response = await request(app).post('/residents').type('form').send({
      firstName: 'Lina',
      lastName: 'Cruz',
      address: '8 Rizal Avenue',
      contactNumber: 'invalid',
      email: 'lina@example.com'
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Invalid contact number format\./);
    assert.match(response.text, /value="Lina"/);
    assert.deepEqual(repository.findAll(), []);
  });

  it('Test 8: edit form shows persisted editable values and read-only ID/status', async t => {
    const { app, repository } = createHarness(t, 'edit_form');
    const resident = saveResident(repository, { status: 'Inactive' });

    const response = await request(app).get(`/residents/${resident.id}/edit`);

    assert.equal(response.statusCode, 200);
    for (const value of ['Maria', 'Santos', '12 Mabini Street', '09123456789', 'maria@example.com']) {
      assert.match(response.text, new RegExp(`value="${value}"`));
    }
    assert.match(response.text, new RegExp(`Resident ID[\\s\\S]*${resident.id}`));
    assert.match(response.text, /Status[\s\S]*Inactive/);
    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
  });

  it('Test 9: valid update persists allowed fields while preserving ID and status', async t => {
    const { app, repository } = createHarness(t, 'valid_update');
    const resident = saveResident(repository, { status: 'Inactive' });

    const response = await request(app).post(`/residents/${resident.id}`).type('form').send({
      id: '999',
      firstName: 'Marina',
      lastName: 'Santos',
      address: '44 Updated Street',
      contactNumber: '09998887777',
      email: 'marina@example.com',
      status: 'Active'
    });

    assert.equal(response.statusCode, 303);
    const updated = repository.findById(resident.id);
    assert.equal(updated.id, resident.id);
    assert.equal(updated.status, 'Inactive');
    assert.equal(updated.firstName, 'Marina');
    assert.equal(updated.address, '44 Updated Street');
    assert.match(response.headers.location, /Resident%20information%20updated%20successfully\./);
  });

  it('Test 10: invalid update shows feedback and leaves persisted information unchanged', async t => {
    const { app, repository } = createHarness(t, 'invalid_update');
    const resident = saveResident(repository);

    const response = await request(app).post(`/residents/${resident.id}`).type('form').send({
      firstName: 'Maria',
      lastName: 'Santos',
      address: '12 Mabini Street',
      contactNumber: 'bad',
      email: 'attempted@example.com'
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Invalid contact number format\./);
    assert.match(response.text, /value="attempted@example\.com"/);
    assert.match(response.text, /Status[\s\S]*Active/);
    assert.deepEqual(repository.findById(resident.id), resident);
  });

  it('Test 11: nonexistent edit request returns a controlled HTML not-found response', async t => {
    const { app, repository } = createHarness(t, 'missing_resident');

    const response = await request(app).get('/residents/999/edit');

    assert.equal(response.statusCode, 404);
    assert.match(response.text, /Resident not found/);
    assert.doesNotMatch(response.text, /Error:|stack|ENOENT/i);
    assert.deepEqual(repository.findAll(), []);
  });

  it('Test 12: deactivation changes only status and keeps the Resident persisted and listable', async t => {
    const { app, repository } = createHarness(t, 'deactivation');
    const resident = saveResident(repository);

    const response = await request(app).post(`/residents/${resident.id}/deactivate`);

    assert.equal(response.statusCode, 303);
    assert.match(response.headers.location, /Resident%20deactivated%20successfully\./);
    const deactivated = repository.findById(resident.id);
    assert.deepEqual(deactivated, new Resident({ ...resident, status: 'Inactive' }));
    assert.equal(repository.findAll().length, 1);
    const listing = await request(app).get(response.headers.location);
    assert.match(listing.text, /Maria/);
    assert.match(listing.text, /Inactive/);
  });

  it('Test 13: an Inactive Resident remains searchable and has no actionable Deactivate control', async t => {
    const { app, repository } = createHarness(t, 'inactive_visibility');
    const resident = saveResident(repository, { status: 'Inactive' });

    const response = await request(app).get('/residents').query({ search: 'sAnToS' });

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Maria/);
    assert.match(response.text, /Inactive/);
    assert.match(response.text, /Already Inactive/);
    assert.doesNotMatch(response.text, new RegExp(`action="/residents/${resident.id}/deactivate"`));
  });

  it('Test 14: listing, search, registration form, and edit form GET requests are read-only', async t => {
    const { app, repository } = createHarness(t, 'get_safety');
    const resident = saveResident(repository);
    const before = repository.findAll();

    for (const url of [
      '/residents',
      '/residents?search=Maria',
      '/residents/register',
      `/residents/${resident.id}/edit`,
      `/residents/${resident.id}/deactivate`
    ]) {
      await request(app).get(url);
      assert.deepEqual(repository.findAll(), before, `${url} modified persistence`);
    }
  });

  it('handles repeated deactivation safely through the T07 idempotent behavior', async t => {
    const { app, repository } = createHarness(t, 'repeated_deactivation');
    const resident = saveResident(repository);

    await request(app).post(`/residents/${resident.id}/deactivate`);
    const response = await request(app).post(`/residents/${resident.id}/deactivate`);

    assert.equal(response.statusCode, 303);
    assert.match(response.headers.location, /Resident%20is%20already%20Inactive\./);
    assert.equal(repository.findAll().length, 1);
    assert.equal(repository.findById(resident.id).status, 'Inactive');
  });

  it('returns a controlled not-found page for direct deactivation of a missing Resident', async t => {
    const { app, repository } = createHarness(t, 'missing_deactivation');

    const response = await request(app).post('/residents/999/deactivate');

    assert.equal(response.statusCode, 404);
    assert.match(response.text, /Resident not found/);
    assert.doesNotMatch(response.text, /Error:|stack|ENOENT/i);
    assert.deepEqual(repository.findAll(), []);
  });

});
