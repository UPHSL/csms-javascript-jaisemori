export class ResidentDeactivationService {
  constructor(repository) {
    this.repository = repository;
  }

  deactivateResident(id) {
    const existing = this.repository.findById(id);
    if (!existing) {
      return { success: false, notFound: true, alreadyInactive: false, resident: null };
    }
    if (existing.status === 'Inactive') {
      return { success: true, notFound: false, alreadyInactive: true, resident: existing };
    }
    const updated = this.repository.deactivate(id);
    return { success: true, notFound: false, alreadyInactive: false, resident: updated };
  }
}
