/**
 * Service Request domain model.
 */
export const ServiceRequestStatus = {
  PENDING: 'Pending'
};

export class ServiceRequest {
  constructor({ id = null, residentId = null, serviceType = '', description = '', dateRequested = '', status = ServiceRequestStatus.PENDING } = {}) {
    this.id = id;
    this.residentId = residentId;
    this.serviceType = serviceType;
    this.description = description;
    this.dateRequested = dateRequested;
    this.status = status;
  }
}
