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

});
