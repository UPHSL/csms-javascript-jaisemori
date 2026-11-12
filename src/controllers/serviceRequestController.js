import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest.js';

const textQuery = value => typeof value === 'string' ? value : '';
const formBody = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const submissionFields = ['residentId', 'serviceType', 'description', 'dateRequested'];
const pickSubmissionFields = body => Object.fromEntries(
  submissionFields.map(field => [field, formBody(body)[field] ?? ''])
);

export class ServiceRequestController {
  constructor({ queryService, submissionService, statusService }) {
    this.queryService = queryService;
    this.submissionService = submissionService;
    this.statusService = statusService;
  }

  list = (request, response) => {
    const searchTerm = textQuery(request.query.search);
    const statusFilter = textQuery(request.query.status);
    const result = this.queryService.searchServiceRequests(searchTerm, statusFilter);

    return response.status(result.success ? 200 : 400).render('service-requests/index', {
      serviceRequests: result.serviceRequests,
      searchTerm,
      statusFilter,
      statuses: Object.values(ServiceRequestStatus),
      message: textQuery(request.query.message),
      errors: result.errors
    });
  };

  showSubmissionForm = (_request, response) => response.status(200).render('service-requests/form', {
    serviceRequest: new ServiceRequest(),
    errors: []
  });

  submit = (request, response) => {
    const submitted = pickSubmissionFields(request.body);
    const result = this.submissionService.submit(new ServiceRequest(submitted));

    if (!result.success) {
      return response.status(400).render('service-requests/form', {
        serviceRequest: submitted,
        errors: result.errors
      });
    }

    return response.redirect(303, '/service-requests?message=Service%20Request%20submitted%20successfully.');
  };

  showDetails = (request, response) => {
    const serviceRequest = this.queryService.viewServiceRequest(request.params.id);
    if (!serviceRequest) return this.renderNotFound(response);

    return response.status(200).render('service-requests/details', {
      serviceRequest,
      message: textQuery(request.query.message),
      errors: []
    });
  };

  changeStatus = (request, response) => {
    const result = this.statusService.changeStatus(request.params.id, formBody(request.body).status);
    if (result.notFound) return this.renderNotFound(response);

    if (!result.success) {
      const serviceRequest = this.queryService.viewServiceRequest(request.params.id);
      if (!serviceRequest) return this.renderNotFound(response);
      return response.status(400).render('service-requests/details', {
        serviceRequest,
        message: '',
        errors: result.errors
      });
    }

    return response.redirect(
      303,
      `/service-requests/${result.serviceRequest.id}?message=Service%20Request%20status%20updated%20successfully.`
    );
  };

  renderNotFound = response => response.status(404).render('service-requests/not-found');
}
