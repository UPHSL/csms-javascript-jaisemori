import { Router } from 'express';

import { ServiceRequestController } from '../controllers/serviceRequestController.js';
import { ServiceRequestQueryService } from '../services/ServiceRequestQueryService.js';
import { ServiceRequestStatusService } from '../services/ServiceRequestStatusService.js';
import { ServiceRequestSubmissionService } from '../services/ServiceRequestSubmissionService.js';

export function createServiceRequestRouter({ residentRepository, serviceRequestRepository }) {
  const router = Router();
  const controller = new ServiceRequestController({
    queryService: new ServiceRequestQueryService(serviceRequestRepository),
    submissionService: new ServiceRequestSubmissionService(residentRepository, serviceRequestRepository),
    statusService: new ServiceRequestStatusService(serviceRequestRepository)
  });

  router.get('/service-requests', controller.list);
  router.get('/service-requests/submit', controller.showSubmissionForm);
  router.post('/service-requests', controller.submit);
  router.get('/service-requests/:id', controller.showDetails);
  router.post('/service-requests/:id/status', controller.changeStatus);

  return router;
}
