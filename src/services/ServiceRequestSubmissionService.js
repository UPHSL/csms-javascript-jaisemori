import { ServiceRequestStatus } from '../models/ServiceRequest.js';
import { ServiceRequestValidator } from '../validators/ServiceRequestValidator.js';

export class ServiceRequestSubmissionService {
  constructor(residentRepository, serviceRequestRepository, validator = new ServiceRequestValidator()) {
    this.residentRepository = residentRepository;
    this.serviceRequestRepository = serviceRequestRepository;
    this.validator = validator;
  }

  submit(serviceRequest) {
    const validation = this.validator.validate(serviceRequest);
    if (!validation.isValid) {
      return {
        success: false,
        validationFailed: true,
        residentNotFound: false,
        residentInactive: false,
        errors: validation.errors,
        serviceRequest: null
      };
    }

    const resident = this.residentRepository.findById(serviceRequest.residentId);
    if (!resident) {
      return {
        success: false,
        validationFailed: false,
        residentNotFound: true,
        residentInactive: false,
        errors: ['Resident not found.'],
        serviceRequest: null
      };
    }

    if (resident.status !== 'Active') {
      return {
        success: false,
        validationFailed: false,
        residentNotFound: false,
        residentInactive: true,
        errors: ['Resident is inactive and cannot submit a new Service Request.'],
        serviceRequest: null
      };
    }

    serviceRequest.status = ServiceRequestStatus.PENDING;
    const saved = this.serviceRequestRepository.save(serviceRequest);
    return {
      success: true,
      validationFailed: false,
      residentNotFound: false,
      residentInactive: false,
      errors: [],
      serviceRequest: saved
    };
  }
}
