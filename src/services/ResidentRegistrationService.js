const legacyErrorMessages = Object.freeze({
  'First name is required.': 'firstName is required',
  'Last name is required.': 'lastName is required',
  'Address is required.': 'address is required',
  'Email is required.': 'email is required',
  'Invalid email format.': 'email is invalid'
});

export class ResidentRegistrationService {
  constructor(repository) {
    this.repository = repository;
  }

  register(resident) {
    const validation = resident.validate();
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors.map(error => legacyErrorMessages[error] ?? error)
      };
    }
    const saved = this.repository.save(resident);
    return { success: true, resident: saved };
  }
}
