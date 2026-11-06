import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';
import { ResidentRegistrationService } from '../src/services/ResidentRegistrationService.js';

const getTestFilePath = (name) => path.join(process.cwd(), 'data', `test_t04_${name}.json`);
const cleanup = (filePath) => { try { fs.unlinkSync(filePath); } catch {} };

const validData = {
  id: null,
  firstName: 'Juno',
  lastName: 'Molly',
  address: 'Chicken Feet St',
  contactNumber: '09932133123',
  email: 'juno@example.com'
};

describe('T04 - Resident Registration Tests', () => {

  it('Test 1: should register a valid Resident successfully', () => {
    const filePath = getTestFilePath('t1');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident(validData));
    assert.equal(result.success, true);
    assert.ok(result.resident);
    cleanup(filePath);
  });

  it('Test 2: should assign a persistence-generated ID upon registration', () => {
    const filePath = getTestFilePath('t2');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident(validData));
    assert.equal(result.success, true);
    assert.ok(result.resident.id);
    assert.notEqual(result.resident.id, null);
    cleanup(filePath);
  });

  it('Test 3: should persist the Resident so it is retrievable by ID', () => {
    const filePath = getTestFilePath('t3');
    cleanup(filePath);
    const repo = new ResidentRepository(filePath);
    const service = new ResidentRegistrationService(repo);
    const result = service.register(new Resident(validData));
    const retrieved = repo.findById(result.resident.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, result.resident.id);
    cleanup(filePath);
  });

  it('Test 4: should preserve all Resident fields including leading zero on contactNumber', () => {
    const filePath = getTestFilePath('t4');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident({ ...validData, status: 'Active' }));
    const r = result.resident;
    assert.equal(r.firstName, 'Juno');
    assert.equal(r.lastName, 'Molly');
    assert.equal(r.address, 'Chicken Feet St');
    assert.equal(r.contactNumber, '09932133123');
    assert.equal(r.email, 'juno@example.com');
    assert.equal(r.status, 'Active');
    cleanup(filePath);
  });

  it('Test 5: should default status to Active when not provided', () => {
    const filePath = getTestFilePath('t5');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident(validData));
    assert.equal(result.resident.status, 'Active');
    cleanup(filePath);
  });

  it('Test 6: should fail registration when Resident data is invalid', () => {
    const filePath = getTestFilePath('t6');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident({ ...validData, firstName: '   ' }));
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    cleanup(filePath);
  });

  it('Test 7: should not write invalid Resident to the database file', () => {
    const filePath = getTestFilePath('t7');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    service.register(new Resident({ ...validData, firstName: '   ' }));
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(data.length, 0);
    cleanup(filePath);
  });

  it('Test 8: should return validation error details on failed registration', () => {
    const filePath = getTestFilePath('t8');
    cleanup(filePath);
    const service = new ResidentRegistrationService(new ResidentRepository(filePath));
    const result = service.register(new Resident({ ...validData, firstName: '   ', email: 'bad-email' }));
    assert.equal(result.success, false);
    assert.ok(Array.isArray(result.errors));
    assert.ok(result.errors.some(e => e.includes('firstName')));
    assert.ok(result.errors.some(e => e.includes('email')));
    cleanup(filePath);
  });

});
