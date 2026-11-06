import { ServiceRequestStatus } from '../models/ServiceRequest.js';

const supportedStatuses = new Set(Object.values(ServiceRequestStatus));

const allowedTransitions = new Map([
  [ServiceRequestStatus.PENDING, new Set([
    ServiceRequestStatus.IN_PROGRESS,
    ServiceRequestStatus.CANCELLED
  ])],
  [ServiceRequestStatus.IN_PROGRESS, new Set([
    ServiceRequestStatus.COMPLETED,
    ServiceRequestStatus.CANCELLED
  ])],
  [ServiceRequestStatus.COMPLETED, new Set()],
  [ServiceRequestStatus.CANCELLED, new Set()]
]);

export class ServiceRequestStatusService {
  constructor(repository) {
    this.repository = repository;
  }

  changeStatus(id, targetStatus) {
    const existing = this.repository.findById(id);
    if (!existing) {
      return this._result({ notFound: true, errors: ['Service Request not found.'] });
    }

    if (!supportedStatuses.has(targetStatus)) {
      return this._result({
        unsupportedStatus: true,
        errors: ['Unsupported Service Request status.']
      });
    }

    const allowedTargets = allowedTransitions.get(existing.status);
    if (!allowedTargets?.has(targetStatus)) {
      return this._result({
        invalidTransition: true,
        errors: [`Cannot change Service Request status from ${existing.status} to ${targetStatus}.`]
      });
    }

    const updated = this.repository.updateStatus(existing.id, targetStatus);
    return this._result({ success: true, serviceRequest: updated });
  }

  _result(overrides = {}) {
    return {
      success: false,
      notFound: false,
      unsupportedStatus: false,
      invalidTransition: false,
      errors: [],
      serviceRequest: null,
      ...overrides
    };
  }
}
