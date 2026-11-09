import { Router } from 'express';

import { ResidentController } from '../controllers/residentController.js';
import { ResidentDeactivationService } from '../services/ResidentDeactivationService.js';
import { ResidentRegistrationService } from '../services/ResidentRegistrationService.js';
import { ResidentService } from '../services/ResidentService.js';
import { ResidentUpdateService } from '../services/ResidentUpdateService.js';

export function createResidentRouter({ residentRepository }) {
  const router = Router();
  const controller = new ResidentController({
    residentService: new ResidentService(residentRepository),
    registrationService: new ResidentRegistrationService(residentRepository),
    updateService: new ResidentUpdateService(residentRepository),
    deactivationService: new ResidentDeactivationService(residentRepository)
  });

  router.get('/residents', controller.list);
  router.get('/residents/register', controller.showRegistrationForm);
  router.post('/residents', controller.register);
  router.get('/residents/:id/edit', controller.showEditForm);
  router.post('/residents/:id', controller.update);
  router.post('/residents/:id/deactivate', controller.deactivate);

  return router;
}
