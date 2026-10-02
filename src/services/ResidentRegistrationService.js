import { validators } from '../utils/validators.js';

export class ResidentRegistrationService {
  constructor(repository) {
    this.repository = repository;
  }

  register(resident) {
    const errors = validators.validateResident(resident);
    if (errors.length > 0) {
      return { success: false, errors };
    }
    const saved = this.repository.save(resident);
    return { success: true, resident: saved };
  }
}
