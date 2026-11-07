import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ServiceRequest, ServiceRequestStatus } from '../src/models/ServiceRequest.js';
import { ServiceRequestRepository } from '../src/repositories/ServiceRequestRepository.js';
import { ServiceRequestQueryService } from '../src/services/ServiceRequestQueryService.js';

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

describe('T11 - Search and View Service Requests', () => {
  const createService = (t, name) => {
    const repository = createRepository(t, `service_${name}`);
    return {
      repository,
      service: new ServiceRequestQueryService(repository)
    };
  };

  it('Test 1: lists all persisted Service Requests', t => {
    const { repository, service } = createService(t, 'list_all');
    saveRequest(repository, { description: 'First persisted request' });
    saveRequest(repository, { description: 'Second persisted request' });

    assert.equal(service.listServiceRequests().length, 2);
  });

  it('Test 2: returns an empty list when no Service Requests exist', t => {
    const { service } = createService(t, 'empty');

    assert.deepEqual(service.listServiceRequests(), []);
  });

  it('Test 3: orders every listing by dateRequested DESC then id DESC', t => {
    const { repository, service } = createService(t, 'order');
    const oldest = saveRequest(repository, { dateRequested: '2026-09-01' });
    const sameDateFirst = saveRequest(repository, { dateRequested: '2026-09-20' });
    const sameDateSecond = saveRequest(repository, { dateRequested: '2026-09-20' });

    assert.deepEqual(
      service.listServiceRequests().map(request => request.id),
      [sameDateSecond.id, sameDateFirst.id, oldest.id]
    );
  });

  it('Test 4: views one persisted Service Request by ID with every field', t => {
    const { repository, service } = createService(t, 'view');
    const saved = saveRequest(repository, {
      residentId: '00025',
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.',
      dateRequested: '2026-10-03',
      status: ServiceRequestStatus.CANCELLED
    });

    assert.deepEqual(service.viewServiceRequest(saved.id), saved);
  });

  it('Test 5: returns null for an unknown ID without creating a record', t => {
    const { repository, service } = createService(t, 'unknown');
    const existing = saveRequest(repository);

    assert.equal(service.viewServiceRequest(999999), null);
    assert.deepEqual(repository.findAll().map(request => request.id), [existing.id]);
  });

  it('Test 6: searches serviceType partially and case-insensitively', t => {
    const { repository, service } = createService(t, 'service_type');
    const matching = saveRequest(repository, { serviceType: 'Barangay Clearance' });
    saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Medicine support requested.'
    });

    const result = service.searchServiceRequests('  cLeAr  ');

    assert.equal(result.success, true);
    assert.deepEqual(result.serviceRequests.map(request => request.id), [matching.id]);
  });

  it('Test 7: searches description partially and case-insensitively', t => {
    const { repository, service } = createService(t, 'description');
    const matching = saveRequest(repository, { description: 'Employment certification is required.' });
    saveRequest(repository, { description: 'Medicine support requested.' });

    assert.deepEqual(
      service.searchServiceRequests('CERTIF').serviceRequests.map(request => request.id),
      [matching.id]
    );
  });

  it('Test 8: treats blank, whitespace, null, and undefined text as an unfiltered listing', t => {
    const { repository, service } = createService(t, 'blank');
    saveRequest(repository, { dateRequested: '2026-09-01' });
    saveRequest(repository, { dateRequested: '2026-09-02' });
    const expected = service.listServiceRequests();

    for (const term of ['', '   ', null, undefined]) {
      assert.deepEqual(service.searchServiceRequests(term).serviceRequests, expected);
    }
  });

  it('Test 9: returns an empty result when no text matches', t => {
    const { repository, service } = createService(t, 'no_match');
    saveRequest(repository);

    assert.deepEqual(service.searchServiceRequests('not present').serviceRequests, []);
  });

  it('Test 10: filters by an exact supported status', t => {
    const { repository, service } = createService(t, 'status');
    saveRequest(repository, { status: ServiceRequestStatus.PENDING });
    const completed = saveRequest(repository, { status: ServiceRequestStatus.COMPLETED });

    assert.deepEqual(
      service.searchServiceRequests('', ServiceRequestStatus.COMPLETED).serviceRequests.map(request => request.id),
      [completed.id]
    );
  });

  it('Test 11: supports all four statuses and treats whitespace status as no filter', t => {
    const { repository, service } = createService(t, 'all_statuses');
    for (const status of Object.values(ServiceRequestStatus)) {
      saveRequest(repository, { status });
    }

    for (const status of Object.values(ServiceRequestStatus)) {
      assert.deepEqual(
        service.searchServiceRequests('', status).serviceRequests.map(request => request.status),
        [status]
      );
    }
    assert.equal(service.searchServiceRequests('', '   ').serviceRequests.length, 4);
  });

  it('Test 12: combines text matching either field with status using AND', t => {
    const { repository, service } = createService(t, 'combined');
    const matching = saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Urgent medicine support.',
      status: ServiceRequestStatus.IN_PROGRESS
    });
    saveRequest(repository, {
      serviceType: 'Medical Assistance',
      description: 'Urgent medicine support.',
      status: ServiceRequestStatus.COMPLETED
    });
    saveRequest(repository, {
      serviceType: 'Barangay Clearance',
      description: 'Employment requirement.',
      status: ServiceRequestStatus.IN_PROGRESS
    });

    assert.deepEqual(
      service.searchServiceRequests('medicine', ServiceRequestStatus.IN_PROGRESS)
        .serviceRequests.map(request => request.id),
      [matching.id]
    );
  });

  it('Test 13: returns no duplicate when serviceType and description both match', t => {
    const { repository, service } = createService(t, 'duplicate');
    const matching = saveRequest(repository, {
      serviceType: 'Clearance Service',
      description: 'Clearance copy requested.'
    });

    assert.deepEqual(
      service.searchServiceRequests('clearance').serviceRequests.map(request => request.id),
      [matching.id]
    );
  });

  it('Test 14: rejects an unsupported status without querying or changing persistence', t => {
    const { repository, service } = createService(t, 'unsupported');
    const saved = saveRequest(repository);
    const originalQuery = repository.query.bind(repository);
    let queryCalls = 0;
    repository.query = (...args) => {
      queryCalls += 1;
      return originalQuery(...args);
    };

    const result = service.searchServiceRequests('clearance', 'Approved');

    assert.deepEqual(result, {
      success: false,
      unsupportedStatus: true,
      errors: ['Unsupported Service Request status filter.'],
      serviceRequests: []
    });
    assert.equal(queryCalls, 0);
    assert.deepEqual(repository.findById(saved.id), saved);
  });

  it('Student-Designed Test: search remains read-only and preserves filtered ordering', t => {
    const { repository, service } = createService(t, 'read_only');
    const older = saveRequest(repository, {
      description: 'Medicine support one',
      dateRequested: '2026-09-01',
      status: ServiceRequestStatus.PENDING
    });
    const newer = saveRequest(repository, {
      description: 'Medicine support two',
      dateRequested: '2026-09-20',
      status: ServiceRequestStatus.PENDING
    });
    const before = repository.findAll();

    const result = service.searchServiceRequests('medicine', ServiceRequestStatus.PENDING);

    assert.deepEqual(result.serviceRequests.map(request => request.id), [newer.id, older.id]);
    assert.deepEqual(repository.findAll(), before);
  });
});
