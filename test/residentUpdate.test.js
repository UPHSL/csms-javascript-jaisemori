import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ResidentUpdateService } from '../src/services/ResidentUpdateService.js';
import { ResidentService } from '../src/services/ResidentService.js';

const getFilePath = (name) => path.join(process.cwd(), 'data', `test_t06_${name}.json`);
const cleanup = (fp) => { try { fs.unlinkSync(fp); } catch {} };

const baseResident = {
  id: '1',
  firstName: 'Juno',
  lastName: 'Molly',
  address: 'Chicken Feet St',
  contactNumber: '09932133123',
  email: 'juno@example.com',
  status: 'Active'
};

describe('T06 - Resident Update Tests', () => {

  it('Test 1: should successfully update permitted fields of a valid resident', () => {
    const fp = getFilePath('t1');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('1', { firstName: 'June', address: 'New St' });
    assert.equal(result.success, true);
    assert.ok(result.resident);
    assert.equal(result.resident.firstName, 'June');
    assert.equal(result.resident.address, 'New St');
    cleanup(fp);
  });

  it('Test 2: should preserve the original resident ID after update', () => {
    const fp = getFilePath('t2');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('1', { firstName: 'June' });
    assert.equal(result.success, true);
    assert.equal(result.resident.id, '1');
    cleanup(fp);
  });

  it('Test 3: should persist updated information to the database', () => {
    const fp = getFilePath('t3');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    svc.updateResident('1', {
      firstName: 'June',
      lastName: 'Molina',
      address: 'New St',
      contactNumber: '09181234567',
      email: 'june@example.com'
    });

    const retrieved = repo.findById('1');
    assert.equal(retrieved.firstName, 'June');
    assert.equal(retrieved.lastName, 'Molina');
    assert.equal(retrieved.address, 'New St');
    assert.equal(retrieved.contactNumber, '09181234567');
    assert.equal(retrieved.email, 'june@example.com');
    cleanup(fp);
  });

  it('Test 4: should preserve resident status after update', () => {
    const fp = getFilePath('t4');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident({ ...baseResident, status: 'Inactive' }));
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('1', { firstName: 'June' });
    assert.equal(result.success, true);
    assert.equal(result.resident.status, 'Inactive');
    cleanup(fp);
  });

  it('Test 5: should fail update when proposed data is invalid', () => {
    const fp = getFilePath('t5');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('1', { firstName: '   ' });
    assert.equal(result.success, false);
    assert.equal(result.notFound, false);
    assert.ok(result.errors.length > 0);
    cleanup(fp);
  });

  it('Test 6: should not modify persisted record when update is invalid', () => {
    const fp = getFilePath('t6');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    svc.updateResident('1', { firstName: '   ' });

    const retrieved = repo.findById('1');
    assert.equal(retrieved.firstName, 'Juno');
    cleanup(fp);
  });

  it('Test 7: should return notFound when updating a nonexistent resident', () => {
    const fp = getFilePath('t7');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('999', { firstName: 'Ghost' });
    assert.equal(result.success, false);
    assert.equal(result.notFound, true);
    assert.equal(result.resident, null);
    cleanup(fp);
  });

  it('Test 8: should not create a new record when updating a nonexistent resident', () => {
    const fp = getFilePath('t8');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    svc.updateResident('999', { firstName: 'Ghost' });

    const all = repo.findAll();
    assert.equal(all.length, 1);
    cleanup(fp);
  });

  it('Test 9: should reflect updated resident in T05 search and listing', () => {
    const fp = getFilePath('t9');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const updateSvc = new ResidentUpdateService(repo);
    const listSvc = new ResidentService(repo);

    updateSvc.updateResident('1', { firstName: 'June', lastName: 'Molina' });

    const found = listSvc.searchResidents('Molina');
    assert.equal(found.length, 1);
    assert.equal(found[0].firstName, 'June');

    const all = listSvc.listResidents();
    assert.equal(all[0].lastName, 'Molina');
    cleanup(fp);
  });

  it('Test 10: should preserve leading zero in contactNumber after update', () => {
    const fp = getFilePath('t10');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    repo.save(new Resident(baseResident));
    const svc = new ResidentUpdateService(repo);

    const result = svc.updateResident('1', { contactNumber: '09181234567' });
    assert.equal(result.success, true);
    assert.equal(result.resident.contactNumber, '09181234567');

    const retrieved = repo.findById('1');
    assert.equal(retrieved.contactNumber, '09181234567');
    cleanup(fp);
  });

});
