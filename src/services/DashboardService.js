export class DashboardService {
  constructor(residentRepository, serviceRequestRepository) {
    this.residentRepository = residentRepository;
    this.serviceRequestRepository = serviceRequestRepository;
  }

  getSummary() {
    const residents = this.residentRepository.getDashboardCounts();
    const serviceRequests = this.serviceRequestRepository.getDashboardCounts();

    return {
      residents,
      serviceRequests,
      openServiceRequests: serviceRequests.pending + serviceRequests.inProgress,
      recentServiceRequests: this.serviceRequestRepository.findRecent(5)
    };
  }
}
