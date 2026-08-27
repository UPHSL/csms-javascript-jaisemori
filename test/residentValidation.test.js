    import { describe, it } from 'node:test';
    import assert from 'node:assert';
    import { Resident, ResidentStatus } from '../src/models/Resident.js';

    describe('T02 - Resident Validation Tests', () => {

    // Test 1: Valid Resident Information
    it('Test 1: should pass validation for valid resident information', () => {
        const resident = new Resident({
        id: 'res-001',
        firstName: 'Juno',
        lastName: 'Molly',
        address: 'Chicken Feet St',
        contactNumber: '09932133123',
        email: 'juno@example.com',
        status: ResidentStatus.ACTIVE
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.errors.length, 0);
    });

    // Test 2: Missing First Name
    it('Test 2: should reject missing or empty first name', () => {
        const resident = new Resident({
        id: 'res-002',
        firstName: '',
        lastName: 'Dela Cruz',
        address: 'Barangay Santo Tomas',
        contactNumber: '09171234567',
        email: 'juan@example.com'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some(err => err.includes('First name')));
    });

    // Test 3: Missing Last Name
    it('Test 3: should reject missing or empty last name', () => {
        const resident = new Resident({
        id: 'res-003',
        firstName: 'Juan',
        lastName: '',
        address: 'Barangay Santo Tomas',
        contactNumber: '09171234567',
        email: 'juan@example.com'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some(err => err.includes('Last name')));
    });

    // Test 4: Missing Address
    it('Test 4: should reject missing or empty address', () => {
        const resident = new Resident({
        id: 'res-004',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        address: '',
        contactNumber: '09171234567',
        email: 'juan@example.com'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some(err => err.includes('Address')));
    });

    // Test 5: Whitespace-Only Required Information
    it('Test 5: should reject required fields containing only whitespace', () => {
        const resident = new Resident({
        id: 'res-005',
        firstName: '   ',
        lastName: 'Dela Cruz',
        address: 'Barangay Santo Tomas',
        contactNumber: '09171234567',
        email: 'juan@example.com'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some(err => err.includes('First name')));
    });

    // Test 6: Invalid Contact Number
    it('Test 6: should reject invalid contact numbers', () => {
        const invalidNumbers = ['9171234567', '0917123456', '091712345678', '0917ABC4567', '08171234567'];

        for (const contactNumber of invalidNumbers) {
        const resident = new Resident({
            id: 'res-006',
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            address: 'Barangay Santo Tomas',
            contactNumber,
            email: 'juan@example.com'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false, `Failed to reject invalid contact number: ${contactNumber}`);
        }
    });

    // Test 7: Invalid Email
    it('Test 7: should reject invalid email format', () => {
        const invalidEmails = ['juan', 'juan@', '@example.com', 'juan.example.com', 'juan@example', 'juan@@example.com'];

        for (const email of invalidEmails) {
        const resident = new Resident({
            id: 'res-007',
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            address: 'Barangay Santo Tomas',
            contactNumber: '09171234567',
            email
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false, `Failed to reject invalid email: ${email}`);
        }
    });

    // Test 8: Supported Resident Status
    it('Test 8: should accept supported Resident statuses (Active and Inactive)', () => {
        const activeResident = new Resident({
        id: 'res-008a',
        firstName: 'Maria',
        lastName: 'Santos',
        address: '123 Main St',
        contactNumber: '09181234567',
        email: 'maria@example.com',
        status: ResidentStatus.ACTIVE
        });

        const inactiveResident = new Resident({
        id: 'res-008b',
        firstName: 'Maria',
        lastName: 'Santos',
        address: '123 Main St',
        contactNumber: '09181234567',
        email: 'maria@example.com',
        status: ResidentStatus.INACTIVE
        });

        assert.strictEqual(activeResident.validate().isValid, true);
        assert.strictEqual(inactiveResident.validate().isValid, true);
    });

    // Test 9: Unsupported Resident Status
    it('Test 9: should reject unsupported resident status', () => {
        const resident = new Resident({
        id: 'res-009',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        address: 'Barangay Santo Tomas',
        contactNumber: '09171234567',
        email: 'juan@example.com',
        status: 'Unknown'
        });

        const result = resident.validate();
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some(err => err.includes('status')));
    });

    });