import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Resident } from '../src/models/Resident.js';
import { ServiceRequest } from '../src/models/ServiceRequest.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';

const residentDatabasePath = name => path.join(process.cwd(), 'data', `test_t14_${name}_residents.sqlite`);
const requestDatabasePath = name => path.join(process.cwd(), 'data', `test_t14_${name}_requests.sqlite`);

const createResidentRepository = (t, name) => {
  const databasePath = residentDatabasePath(name);
  fs.rmSync(databasePath, { force: true });
  t.after(() => fs.rmSync(databasePath, { force: true }));
  return new ResidentRepository(databasePath);
};

const resident = overrides => new Resident({
  firstName: 'Maria',
  lastName: 'Santos',
  address: '12 Mabini Street',
  contactNumber: '09123456789',
  email: 'maria@example.com',
  status: 'Active',
  ...overrides
});

const createServiceRequestRepository = (t, name) => {
  const databasePath = requestDatabasePath(name);
  fs.rmSync(databasePath, { force: true });
  t.after(() => fs.rmSync(databasePath, { force: true }));
  return new ServiceRequestRepository(databasePath);
};

const serviceRequest = overrides => new ServiceRequest({
  residentId: '1',
  serviceType: 'Road Repair',
  description: 'Repair the damaged road surface.',
  dateRequested: '2026-01-01',
  status: 'Pending',
  ...overrides
});

describe('T14 - Dashboard Repository Queries', () => {
  it('returns zero Resident aggregate counts from empty persistence without loading all records', t => {
    const repository = createResidentRepository(t, 'empty_counts');
    repository.findAll = () => { throw new Error('aggregate query must not call findAll'); };

    assert.deepEqual(repository.getDashboardCounts(), {
      total: 0,
      active: 0,
      inactive: 0
    });
  });

  it('uses persistence-generated Resident IDs and aggregates Active and Inactive records in SQLite', t => {
    const repository = createResidentRepository(t, 'resident_counts');
    const generated = repository.save(resident());
    repository.save(resident({
      id: '40',
      firstName: 'Jose',
      email: 'jose@example.com',
      status: 'Inactive'
    }));
    repository.save(resident({
      id: '40',
      firstName: 'Jose Updated',
      email: 'jose@example.com',
      status: 'Inactive'
    }));
    repository.findAll = () => { throw new Error('aggregate query must not call findAll'); };

    assert.equal(generated.id, '1');
    assert.deepEqual(repository.getDashboardCounts(), {
      total: 2,
      active: 1,
      inactive: 1
    });
  });

  it('migrates an existing Resident JSON file in place without losing IDs or records', t => {
    const databasePath = residentDatabasePath('legacy_json_migration');
    fs.rmSync(databasePath, { force: true });
    fs.writeFileSync(databasePath, JSON.stringify([
      {
        id: '001', firstName: 'Legacy', lastName: 'One', address: 'First Street',
        contactNumber: '09111111111', email: 'one@example.com', status: 'Active'
      },
      {
        id: 'legacy-A', firstName: 'Legacy', lastName: 'Alpha', address: 'Alpha Street',
        contactNumber: '09222222222', email: 'alpha@example.com', status: 'Inactive'
      }
    ]), 'utf8');
    t.after(() => fs.rmSync(databasePath, { force: true }));

    const migrated = new ResidentRepository(databasePath);
    const reopened = new ResidentRepository(databasePath);

    assert.equal(migrated.findById('001').email, 'one@example.com');
    assert.equal(migrated.findById('legacy-A').status, 'Inactive');
    assert.equal(reopened.findAll().length, 2);
    assert.equal(reopened.save(resident({ firstName: 'New', email: 'new@example.com' })).id, '2');
  });

  it('imports the legacy default residents.json into the default SQLite database once', t => {
    const originalDirectory = process.cwd();
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 't14-default-migration-'));
    const dataDirectory = path.join(temporaryDirectory, 'data');
    fs.mkdirSync(dataDirectory);
    fs.writeFileSync(path.join(dataDirectory, 'residents.json'), JSON.stringify([
      {
        id: '75', firstName: 'Default', lastName: 'Legacy', address: 'Legacy Street',
        contactNumber: '09333333333', email: 'default@example.com', status: 'Active'
      }
    ]), 'utf8');
    process.chdir(temporaryDirectory);
    t.after(() => {
      process.chdir(originalDirectory);
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    const migrated = new ResidentRepository();
    const reopened = new ResidentRepository();

    assert.equal(migrated.findById('75').email, 'default@example.com');
    assert.equal(reopened.findAll().length, 1);
    assert.ok(fs.existsSync(path.join(dataDirectory, 'residents.json')));
    assert.ok(fs.existsSync(path.join(dataDirectory, 'residents.sqlite')));
  });

  it('preserves distinct string Resident IDs and upserts repeated explicit IDs losslessly', t => {
    const repository = createResidentRepository(t, 'string_ids');
    repository.save(resident({ id: '001', firstName: 'Leading Zero', email: 'zero@example.com' }));
    repository.save(resident({ id: '1', firstName: 'Plain One', email: 'one@example.com' }));
    repository.save(resident({ id: 'legacy-A', firstName: 'Legacy', email: 'legacy@example.com' }));
    repository.save(resident({ id: 'legacy-A', firstName: 'Legacy Updated', email: 'legacy@example.com' }));

    assert.equal(repository.findById('001').firstName, 'Leading Zero');
    assert.equal(repository.findById('1').firstName, 'Plain One');
    assert.equal(repository.findById('legacy-A').firstName, 'Legacy Updated');
    assert.equal(repository.findAll().length, 3);
    assert.equal(repository.save(resident({ firstName: 'Generated', email: 'generated@example.com' })).id, '2');
  });

  it('preserves Unicode-insensitive Resident search and legacy string-ID ordering', t => {
    const repository = createResidentRepository(t, 'unicode_and_ordering');
    repository.save(resident({ id: '2', firstName: 'Élodie', lastName: 'PEÑA', email: 'two@example.com' }));
    repository.save(resident({ id: '10', firstName: 'Élodie', lastName: 'PEÑA', email: 'ten@example.com' }));

    assert.deepEqual(repository.searchByName('élo').map(item => item.id), ['10', '2']);
    assert.deepEqual(repository.searchByName('peña').map(item => item.id), ['10', '2']);
    assert.deepEqual(repository.findAll().map(item => item.id), ['10', '2']);
  });

  it('returns zero Service Request aggregate counts from empty persistence without loading all records', t => {
    const repository = createServiceRequestRepository(t, 'empty_request_counts');
    repository.findAll = () => { throw new Error('aggregate query must not call findAll'); };
    repository.query = () => { throw new Error('aggregate query must not call query'); };

    assert.deepEqual(repository.getDashboardCounts(), {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0
    });
    assert.deepEqual(repository.findRecent(5), []);
  });

  it('aggregates all Service Request statuses and returns five recent requests in required order', t => {
    const repository = createServiceRequestRepository(t, 'request_counts_recent');
    const saved = [
      repository.save(serviceRequest({ status: 'Pending', dateRequested: '2026-01-01' })),
      repository.save(serviceRequest({ status: 'In Progress', dateRequested: '2026-01-03' })),
      repository.save(serviceRequest({ status: 'Completed', dateRequested: '2026-01-02' })),
      repository.save(serviceRequest({ status: 'Cancelled', dateRequested: '2026-01-04' })),
      repository.save(serviceRequest({ status: 'Pending', dateRequested: '2026-01-04' })),
      repository.save(serviceRequest({ status: 'Completed', dateRequested: '2025-12-31' }))
    ];
    repository.findAll = () => { throw new Error('dashboard query must not call findAll'); };
    repository.query = () => { throw new Error('dashboard query must not call query'); };

    assert.deepEqual(repository.getDashboardCounts(), {
      total: 6,
      pending: 2,
      inProgress: 1,
      completed: 2,
      cancelled: 1
    });
    assert.deepEqual(
      repository.findRecent(5).map(request => request.id),
      [saved[4].id, saved[3].id, saved[1].id, saved[2].id, saved[0].id]
    );
    assert.deepEqual(
      repository.findRecent(5).map(request => request.status),
      ['Pending', 'Cancelled', 'In Progress', 'Completed', 'Pending']
    );
    assert.equal(repository.findRecent(500).length, 5);
    assert.equal(repository.findRecent('invalid').length, 5);
  });
});
