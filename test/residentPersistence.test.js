import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { Resident, ResidentStatus } from '../src/models/Resident.js';
import { ResidentRepository } from '../src/repositories/ResidentRepository.js';

const getTestFilePath = (testName) => path.join(process.cwd(), 'data', `test_${testName}.json`);

const cleanup = (filePath) => {
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
};

describe('T03 - Resident Persistence Tests', () => {

  // Test 1: Persist a Resident
  it('Test 1: should store a valid Resident successfully', () => {
    const filePath = getTestFilePath('t1');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const resident = new Resident({
      id: '1',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com'
    });

    const saved = repo.save(resident);
    assert.ok(saved);
    assert.strictEqual(saved.firstName, 'Juno');
    cleanup(filePath);
  });

  // Test 2: Resident Receives an Identifier
  it('Test 2: should assign a usable identifier to a newly persisted Resident', () => {
    const filePath = getTestFilePath('t2');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const resident = new Resident({
      id: null,
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com'
    });

    const saved = repo.save(resident);
    assert.ok(saved.id);
    assert.notStrictEqual(saved.id, null);
    cleanup(filePath);
  });

  // Test 3: Retrieve Resident by Identifier
  it('Test 3: should retrieve a stored Resident using its identifier', () => {
    const filePath = getTestFilePath('t3');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const resident = new Resident({
      id: '100',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com'
    });

    repo.save(resident);
    const retrieved = repo.findById('100');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, '100');
    assert.strictEqual(retrieved.firstName, 'Juno');
    cleanup(filePath);
  });

  // Test 4: Resident Information Is Preserved
  it('Test 4: should preserve all Resident information fields upon retrieval', () => {
    const filePath = getTestFilePath('t4');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const original = new Resident({
      id: '200',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com',
      status: ResidentStatus.ACTIVE
    });

    repo.save(original);
    const retrieved = repo.findById('200');

    assert.strictEqual(retrieved.firstName, 'Juno');
    assert.strictEqual(retrieved.lastName, 'Molly');
    assert.strictEqual(retrieved.address, 'Chicken Feet St');
    assert.strictEqual(retrieved.contactNumber, '09932133123');
    assert.strictEqual(retrieved.email, 'juno@example.com');
    assert.strictEqual(retrieved.status, ResidentStatus.ACTIVE);
    cleanup(filePath);
  });

  // Test 5: Active Status Is Preserved
  it('Test 5: should preserve Active status upon persistence and retrieval', () => {
    const filePath = getTestFilePath('t5');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const resident = new Resident({
      id: '300',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com'
    });

    repo.save(resident);
    const retrieved = repo.findById('300');
    assert.strictEqual(retrieved.status, ResidentStatus.ACTIVE);
    cleanup(filePath);
  });

  // Test 6: Missing Resident Is Handled
  it('Test 6: should return null safely when requesting a non-existent identifier', () => {
    const filePath = getTestFilePath('t6');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const result = repo.findById('999999');
    assert.strictEqual(result, null);
    cleanup(filePath);
  });

  // Test 7: Persistence Is Not Limited to One Repository Object
  it('Test 7: should retrieve stored records using a separate repository instance', () => {
    const filePath = getTestFilePath('t7');
    cleanup(filePath);

    const repo1 = new ResidentRepository(filePath);
    const resident = new Resident({
      id: '500',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com'
    });
    repo1.save(resident);

    const repo2 = new ResidentRepository(filePath);
    const retrieved = repo2.findById('500');

    assert.ok(retrieved);
    assert.strictEqual(retrieved.firstName, 'Juno');
    cleanup(filePath);
  });

  // Student-Designed Test
  it('Student-Designed Test: should update an existing resident record when saving with an existing ID', () => {
    const filePath = getTestFilePath('t8');
    cleanup(filePath);

    const repo = new ResidentRepository(filePath);
    const initialResident = new Resident({
      id: '700',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com',
      status: ResidentStatus.ACTIVE
    });
    repo.save(initialResident);

    const updatedResident = new Resident({
      id: '700',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'New Chicken Feet St',
      contactNumber: '09932133123',
      email: 'juno@example.com',
      status: ResidentStatus.ACTIVE
    });
    repo.save(updatedResident);

    const retrieved = repo.findById('700');
    assert.strictEqual(retrieved.address, 'New Chicken Feet St');
    cleanup(filePath);
  });
});