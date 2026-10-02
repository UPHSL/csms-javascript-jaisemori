import { Resident } from '../models/Resident.js';

export class ResidentUpdateService {
  constructor(repository) {
    this.repository = repository;
  }

  updateResident(id, proposedData) {
    const existing = this.repository.findById(id);
    if (!existing) {
      return { success: false, notFound: true, resident: null, errors: [] };
    }

    const candidate = new Resident({
      id: existing.id,
      firstName: proposedData.firstName ?? existing.firstName,
      lastName: proposedData.lastName ?? existing.lastName,
      address: proposedData.address ?? existing.address,
      contactNumber: proposedData.contactNumber !== undefined
        ? String(proposedData.contactNumber)
        : existing.contactNumber,
      email: proposedData.email ?? existing.email,
      status: existing.status
    });

    const { isValid, errors } = candidate.validate();
    if (!isValid) {
      return { success: false, notFound: false, resident: null, errors };
    }

    const updated = this.repository.update(id, proposedData);
    return { success: true, notFound: false, resident: updated, errors: [] };
  }
}
