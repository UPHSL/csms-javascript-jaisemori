import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Resident, ResidentStatus } from '../src/models/resident.js';

describe('Resident Domain Model (T01)', () => {
  // Test 1: Resident Creation
  it('should create a Resident with valid information', () => {
    const resident = new Resident({
      id: 'res-001',
      firstName: 'Juno',
      lastName: 'Molly',
      address: 'Chicken Feet St',
      contactNumber: '0993213312',
      email: 'juno.molly@example.com',
      status: ResidentStatus.ACTIVE
    });

    assert.ok(resident);
    assert.strictEqual(resident.id, 'res-001');
  });

  // Test 2: Resident Information Access
  it('should assign and retrieve Resident information correctly', () => {
    const resident = new Resident({
      id: 'res-002',
      firstName: 'John',
      lastName: 'Smith',
      address: '456 Maple Ave',
      contactNumber: '555-0144',
      email: 'john.smith@example.com'
    });

    assert.strictEqual(resident.firstName, 'John');
    assert.strictEqual(resident.lastName, 'Smith');
    assert.strictEqual(resident.address, '456 Maple Ave');
    assert.strictEqual(resident.contactNumber, '555-0144');
    assert.strictEqual(resident.email, 'john.smith@example.com');
  });

  // Test 3: Resident Status
  it('should represent Active resident status correctly', () => {
    const resident = new Resident({
      id: 'res-103',
      firstName: 'Alice',
      lastName: 'Johnson',
      address: '789 Oak Rd',
      contactNumber: '555-0188',
      email: 'alice@example.com'
    });

    assert.strictEqual(resident.status, ResidentStatus.ACTIVE);
  });
});