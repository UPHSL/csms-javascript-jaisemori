import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';

const databasePath = name => path.join(process.cwd(), 'data', `test_t11_${name}.sqlite`);

const createRepository = (t, name) => {
  const file = databasePath(name);
  fs.rmSync(file, { force: true });
  t.after(() => fs.rmSync(file, { force: true }));
  return new ServiceRequestRepository(file);
};

const saveRequest = (repository, overrides = {}) => repository.save(new ServiceRequest({
  residentId: '25',
  serviceType: 'Barangay Clearance',
  description: 'Clearance requested for employment.',
  dateRequested: '2026-09-15',
  status: ServiceRequestStatus.PENDING,
  ...overrides
}));

describe('T11 - Service Request Persistent Query Tests', () => {
  it('lists every persisted request in date DESC then ID DESC order', t => {
    const repository = createRepository(t, 'repository_order');
    const first = saveRequest(repository, { dateRequested: '2026-09-15' });
    const second = saveRequest(repository, { dateRequested: '2026-09-18' });
    const third = saveRequest(repository, { dateRequested: '2026-09-18' });
    const fourth = saveRequest(repository, { dateRequested: '2026-09-10' });

    const results = repository.findAll();

    assert.deepEqual(results.map(request => request.id), [third.id, second.id, first.id, fourth.id]);
  });

  it('returns an empty array when persistence has no requests', t => {
    const repository = createRepository(t, 'repository_empty');

    assert.deepEqual(repository.findAll(), []);
  });

  it('partially and case-insensitively searches service type', t => {
    const repository = createRepository(t, 'repository_service_type');
    const matching = saveRequest(repository, { serviceType: 'Barangay Clearance' });
    saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.'
    });

    const results = repository.query({ searchTerm: 'cLeAr' });

    assert.deepEqual(results.map(request => request.id), [matching.id]);
  });

  it('partially and case-insensitively searches description and returns empty for no match', t => {
    const repository = createRepository(t, 'repository_description');
    const matching = saveRequest(repository, { description: 'Employment certification is required.' });
    saveRequest(repository, { description: 'Assistance for medicine.' });

    assert.deepEqual(repository.query({ searchTerm: 'EMPLOY' }).map(request => request.id), [matching.id]);
    assert.deepEqual(repository.query({ searchTerm: 'unmatched text' }), []);
  });

  it('filters by status and combines text OR fields with status using AND', t => {
    const repository = createRepository(t, 'repository_combined');
    const both = saveRequest(repository, {
      serviceType: 'Barangay Clearance',
      status: ServiceRequestStatus.PENDING
    });
    saveRequest(repository, {
      serviceType: 'Barangay Clearance',
      status: ServiceRequestStatus.COMPLETED
    });
    saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.',
      status: ServiceRequestStatus.PENDING
    });
    saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.',
      status: ServiceRequestStatus.CANCELLED
    });

    assert.deepEqual(
      repository.query({ status: ServiceRequestStatus.PENDING }).map(request => request.status),
      [ServiceRequestStatus.PENDING, ServiceRequestStatus.PENDING]
    );
    assert.deepEqual(
      repository.query({ searchTerm: 'clearance', status: ServiceRequestStatus.PENDING }).map(request => request.id),
      [both.id]
    );
  });

  it('returns one row when both searchable fields match', t => {
    const repository = createRepository(t, 'repository_duplicate');
    const matching = saveRequest(repository, {
      serviceType: 'Clearance Service',
      description: 'Clearance copy requested.'
    });

    const results = repository.query({ searchTerm: 'clearance' });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, matching.id);
  });

  it('keeps all lifecycle states queryable and preserves filtered ordering', t => {
    const repository = createRepository(t, 'repository_states');
    const pendingOld = saveRequest(repository, {
      dateRequested: '2026-09-01',
      status: ServiceRequestStatus.PENDING
    });
    const pendingNew = saveRequest(repository, {
      dateRequested: '2026-09-20',
      status: ServiceRequestStatus.PENDING
    });
    saveRequest(repository, { status: ServiceRequestStatus.IN_PROGRESS });
    saveRequest(repository, { status: ServiceRequestStatus.COMPLETED });
    saveRequest(repository, { status: ServiceRequestStatus.CANCELLED });

    const allStatuses = new Set(repository.query().map(request => request.status));
    const pending = repository.query({ status: ServiceRequestStatus.PENDING });

    assert.deepEqual(allStatuses, new Set(Object.values(ServiceRequestStatus)));
    assert.deepEqual(pending.map(request => request.id), [pendingNew.id, pendingOld.id]);
  });

  it('binds quoted and SQL-looking text and treats LIKE wildcard characters literally', t => {
    const repository = createRepository(t, 'repository_literals');
    const percent = saveRequest(repository, {
      serviceType: '100% Support',
      description: "Resident's request; DROP TABLE records;"
    });
    const underscore = saveRequest(repository, {
      serviceType: 'Code_A',
      description: 'Backslash \\ reference'
    });
    saveRequest(repository, { serviceType: 'Ordinary service', description: 'Ordinary description' });

    assert.deepEqual(repository.query({ searchTerm: "Resident's" }).map(request => request.id), [percent.id]);
    assert.deepEqual(repository.query({ searchTerm: '%' }).map(request => request.id), [percent.id]);
    assert.deepEqual(repository.query({ searchTerm: '_' }).map(request => request.id), [underscore.id]);
    assert.deepEqual(repository.query({ searchTerm: '\\' }).map(request => request.id), [underscore.id]);
    assert.equal(repository.findAll().length, 3);
  });
});
