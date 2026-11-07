import { ServiceRequestStatus } from '../models/ServiceRequest.js';

const supportedStatuses = new Set(Object.values(ServiceRequestStatus));

export class ServiceRequestQueryService {
  constructor(serviceRequestRepository) {
    this.serviceRequestRepository = serviceRequestRepository;
  }

  listServiceRequests() {
    return this.serviceRequestRepository.findAll();
  }

  viewServiceRequest(id) {
    return this.serviceRequestRepository.findById(id);
  }

  searchServiceRequests(searchTerm = '', status = null) {
    const normalizedSearchTerm = typeof searchTerm === 'string'
      ? searchTerm.trim()
      : '';
    const normalizedStatus = typeof status === 'string'
      ? status.trim()
      : status;

    if (normalizedStatus && !supportedStatuses.has(normalizedStatus)) {
      return {
        success: false,
        unsupportedStatus: true,
        errors: ['Unsupported Service Request status filter.'],
        serviceRequests: []
      };
    }

    return {
      success: true,
      unsupportedStatus: false,
      errors: [],
      serviceRequests: this.serviceRequestRepository.query({
        searchTerm: normalizedSearchTerm,
        status: normalizedStatus || null
      })
    };
  }
}
