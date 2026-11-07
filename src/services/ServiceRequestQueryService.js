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
    const hasStatusFilter = status !== null && status !== undefined && status !== '';

    if (hasStatusFilter && !supportedStatuses.has(status)) {
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
        status: hasStatusFilter ? status : null
      })
    };
  }
}
