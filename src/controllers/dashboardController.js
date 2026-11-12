export class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  show = (_request, response) => response.status(200).render(
    'dashboard/index',
    this.dashboardService.getSummary()
  );
}
