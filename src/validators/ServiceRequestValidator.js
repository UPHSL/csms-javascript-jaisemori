import { ServiceRequestStatus } from '../models/ServiceRequest.js';

export class ServiceRequestValidator {
  validate(serviceRequest) {
    const errors = [];

    if (serviceRequest.id !== null && serviceRequest.id !== undefined && String(serviceRequest.id).trim() !== '') {
      errors.push('id must be unassigned before submission.');
    }

    if (!this._hasValidResidentId(serviceRequest.residentId)) {
      errors.push('residentId must be a positive identifier.');
    }

    if (!this._hasText(serviceRequest.serviceType)) {
      errors.push('serviceType is required.');
    }

    if (!this._hasText(serviceRequest.description)) {
      errors.push('description is required.');
    }

    if (!this._isValidDate(serviceRequest.dateRequested)) {
      errors.push('dateRequested must be a valid YYYY-MM-DD date.');
    }

    if (serviceRequest.status !== ServiceRequestStatus.PENDING) {
      errors.push('status must be Pending for a new Service Request.');
    }

    return { isValid: errors.length === 0, errors };
  }

  _hasText(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  _hasValidResidentId(value) {
    if (value === null || value === undefined || String(value).trim() === '') return false;
    const numericId = Number(value);
    return Number.isInteger(numericId) && numericId > 0;
  }

  _isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.toISOString().slice(0, 10) === value;
  }
}
