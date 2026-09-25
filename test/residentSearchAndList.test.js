import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ResidentService } from '../src/services/ResidentService.js';

const getFilePath = (name) => path.join(process.cwd(), 'data', `test_t05_${name}.json`);
const cleanup = (fp) => { try { fs.unlinkSync(fp); } catch {} };

const make = (overrides = {}) => new Resident({
  id: null,
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  address: '123 Main St',
  contactNumber: '09171234567',
  email: 'juan@example.com',
  status: 'Active',
  ...overrides
});

describe('T05 - Resident Search and Listing Tests', () => {

  it('Test 1: should list all residents in the repository', () => {
    const fp = getFilePath('t1');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos' }));
    repo.save(make({ id: '2', firstName: 'Ben', lastName: 'Reyes' }));
    const result = svc.listResidents();
    assert.equal(result.length, 2);
    cleanup(fp);
  });

  it('Test 2: should return empty array when repository has no residents', () => {
    const fp = getFilePath('t2');
    cleanup(fp);
    const svc = new ResidentService(new ResidentRepository(fp));
    assert.deepEqual(svc.listResidents(), []);
    cleanup(fp);
  });

  it('Test 3: should sort residents by lastName ASC, firstName ASC, id ASC', () => {
    const fp = getFilePath('t3');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Zoe', lastName: 'Bautista' }));
    repo.save(make({ id: '2', firstName: 'Ana', lastName: 'Aquino' }));
    repo.save(make({ id: '3', firstName: 'Ben', lastName: 'Aquino' }));
    const result = svc.listResidents();
    assert.equal(result[0].lastName, 'Aquino');
    assert.equal(result[0].firstName, 'Ana');
    assert.equal(result[1].firstName, 'Ben');
    assert.equal(result[2].lastName, 'Bautista');
    cleanup(fp);
  });

  it('Test 4: should match residents by partial first name (case-insensitive)', () => {
    const fp = getFilePath('t4');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Maria', lastName: 'Santos' }));
    repo.save(make({ id: '2', firstName: 'Mario', lastName: 'Reyes' }));
    repo.save(make({ id: '3', firstName: 'Jose', lastName: 'Cruz' }));
    const result = svc.searchResidents('mar');
    assert.equal(result.length, 2);
    assert.ok(result.every(r => r.firstName.toLowerCase().startsWith('mar')));
    cleanup(fp);
  });

  it('Test 5: should match residents by partial last name (case-insensitive)', () => {
    const fp = getFilePath('t5');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos' }));
    repo.save(make({ id: '2', firstName: 'Ben', lastName: 'Santillan' }));
    repo.save(make({ id: '3', firstName: 'Carlo', lastName: 'Reyes' }));
    const result = svc.searchResidents('SAN');
    assert.equal(result.length, 2);
    cleanup(fp);
  });

  it('Test 6: should return all residents when search term is blank or whitespace', () => {
    const fp = getFilePath('t6');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos' }));
    repo.save(make({ id: '2', firstName: 'Ben', lastName: 'Reyes' }));
    assert.equal(svc.searchResidents('').length, 2);
    assert.equal(svc.searchResidents('   ').length, 2);
    cleanup(fp);
  });

  it('Test 7: should return empty array when no residents match the search term', () => {
    const fp = getFilePath('t7');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos' }));
    const result = svc.searchResidents('zzznomatch');
    assert.deepEqual(result, []);
    cleanup(fp);
  });

  it('Test 8: should preserve leading zeros in contactNumber', () => {
    const fp = getFilePath('t8');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos', contactNumber: '09171234567' }));
    const result = svc.listResidents();
    assert.equal(result[0].contactNumber, '09171234567');
    cleanup(fp);
  });

  it('Test 9: should include both Active and Inactive residents in listing', () => {
    const fp = getFilePath('t9');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Ana', lastName: 'Santos', status: 'Active' }));
    repo.save(make({ id: '2', firstName: 'Ben', lastName: 'Reyes', status: 'Inactive' }));
    const result = svc.listResidents();
    assert.equal(result.length, 2);
    assert.ok(result.some(r => r.status === 'Active'));
    assert.ok(result.some(r => r.status === 'Inactive'));
    cleanup(fp);
  });

  it('Test 10: should not return duplicate residents for a matching search term', () => {
    const fp = getFilePath('t10');
    cleanup(fp);
    const repo = new ResidentRepository(fp);
    const svc = new ResidentService(repo);
    repo.save(make({ id: '1', firstName: 'Anna', lastName: 'Annalisa' }));
    const result = svc.searchResidents('ann');
    assert.equal(result.length, 1);
    cleanup(fp);
  });

});
