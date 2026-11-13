import { Router } from 'express';

import { DashboardController } from '../controllers/dashboardController.js';
import { DashboardService } from '../services/DashboardService.js';

export function createDashboardRouter({ residentRepository, serviceRequestRepository }) {
  const router = Router();
  const controller = new DashboardController(
    new DashboardService(residentRepository, serviceRequestRepository)
  );

  router.get('/dashboard', controller.show);
  return router;
}
