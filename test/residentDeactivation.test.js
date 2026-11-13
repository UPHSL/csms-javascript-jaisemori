import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ResidentDeactivationService } from '../src/services/ResidentDeactivationService.js';
import { ResidentService } from '../src/services/ResidentService.js';

const getFilePath = (name) => path.join(process.cwd(), 'data', `test_t07_${name}.json`);
const cleanup = (fp) => { try { fs.unlinkSync(fp); } catch {} };

const base = {
  id: '1',
  firstName: 'Juno',
  lastName: 'Molly',
  address: 'Chicken Feet St',
  contactNumber: '09932133123',
  email: 'juno@example.com',
  status: 'Active'
};

describe('T07 - Resident Deactivation Tests', () => {

  it('Test 1: should successfully deactivate an active resident', () => {
    const fp = getFilePath('t1');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    const result = svc.deactivateResident('1');
    assert.equal(result.success, true);
    assert.equal(result.notFound, false);
    assert.equal(result.alreadyInactive, false);
    assert.ok(result.resident);
    cleanup(fp);
  });

  it('Test 2: should persist Inactive status to storage after deactivation', () => {
    const fp = getFilePath('t2');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    svc.deactivateResident('1');
    const retrieved = repo.findById('1');
    assert.equal(retrieved.status, 'Inactive');
    cleanup(fp);
  });

  it('Test 3: should preserve the resident ID after deactivation', () => {
    const fp = getFilePath('t3');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    const result = svc.deactivateResident('1');
    assert.equal(result.resident.id, '1');
    cleanup(fp);
  });

  it('Test 4: should preserve all resident fields after deactivation', () => {
    const fp = getFilePath('t4');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    svc.deactivateResident('1');
    const r = repo.findById('1');
    assert.equal(r.firstName, 'Juno');
    assert.equal(r.lastName, 'Molly');
    assert.equal(r.address, 'Chicken Feet St');
    assert.equal(r.contactNumber, '09932133123');
    assert.equal(r.email, 'juno@example.com');
    cleanup(fp);
  });

  it('Test 5: should keep deactivated resident retrievable via findById', () => {
    const fp = getFilePath('t5');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    svc.deactivateResident('1');
    const retrieved = repo.findById('1');
    assert.ok(retrieved);
    assert.equal(retrieved.status, 'Inactive');
    cleanup(fp);
  });

  it('Test 6: should include deactivated resident in findAll and searchByName', () => {
    const fp = getFilePath('t6');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const deactivationSvc = new ResidentDeactivationService(repo);
    const listSvc = new ResidentService(repo);

    deactivationSvc.deactivateResident('1');

    const all = listSvc.listResidents();
    assert.equal(all.length, 1);
    assert.equal(all[0].status, 'Inactive');

    const found = listSvc.searchResidents('Juno');
    assert.equal(found.length, 1);
    assert.equal(found[0].status, 'Inactive');
    cleanup(fp);
  });

  it('Test 7: should handle already-inactive resident safely with alreadyInactive: true', () => {
    const fp = getFilePath('t7');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident({ ...base, status: 'Inactive' }));
    const svc = new ResidentDeactivationService(repo);

    const result = svc.deactivateResident('1');
    assert.equal(result.success, true);
    assert.equal(result.alreadyInactive, true);
    assert.equal(result.resident.id, '1');

    const all = repo.findAll();
    assert.equal(all.length, 1);
    cleanup(fp);
  });

  it('Test 8: should return notFound for a nonexistent resident ID', () => {
    const fp = getFilePath('t8');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentDeactivationService(repo);

    const result = svc.deactivateResident('999');
    assert.equal(result.success, false);
    assert.equal(result.notFound, true);
    assert.equal(result.resident, null);
    cleanup(fp);
  });

  it('Test 9: should not change record count when deactivating a nonexistent resident', () => {
    const fp = getFilePath('t9');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    const svc = new ResidentDeactivationService(repo);

    svc.deactivateResident('999');
    assert.equal(repo.findAll().length, 1);
    cleanup(fp);
  });

  it('Test 10: should not affect other residents when deactivating one', () => {
    const fp = getFilePath('t10');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(base));
    repo.save(new Resident({ ...base, id: '2', firstName: 'Ana', email: 'ana@example.com' }));
    const svc = new ResidentDeactivationService(repo);

    svc.deactivateResident('1');

    const residentB = repo.findById('2');
    assert.equal(residentB.status, 'Active');
    assert.equal(residentB.firstName, 'Ana');
    cleanup(fp);
  });

});
