import { Router } from 'express';

import { ResidentController } from '../controllers/residentController.js';
import { ResidentService } from '../services/ResidentService.js';

export function createResidentRouter({ residentRepository }) {
  const router = Router();
  const controller = new ResidentController({
    residentService: new ResidentService(residentRepository)
  });

  router.get('/residents', controller.list);

  return router;
}
