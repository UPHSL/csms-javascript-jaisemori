/**
 * Resident domain model.
 */
export const ResidentStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
};

export class Resident {
  constructor({ id, firstName, lastName, address, contactNumber, email, status = ResidentStatus.ACTIVE } = {}) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.address = address;
    this.contactNumber = contactNumber;
    this.email = email;
    this.status = status;
  }

  /**
   * Validates resident information against T02 business rules.
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];

    // First Name validation
    if (!this.firstName || typeof this.firstName !== 'string' || this.firstName.trim() === '') {
      errors.push('First name is required.');
    }

    // Last Name validation
    if (!this.lastName || typeof this.lastName !== 'string' || this.lastName.trim() === '') {
      errors.push('Last name is required.');
    }

    // Address validation
    if (!this.address || typeof this.address !== 'string' || this.address.trim() === '') {
      errors.push('Address is required.');
    }

    // Contact Number validation (Format: 09XXXXXXXXX)
    const contactRegex = /^09\d{9}$/;
    if (!this.contactNumber || typeof this.contactNumber !== 'string' || !contactRegex.test(this.contactNumber)) {
      errors.push('Invalid contact number format.');
    }

    // Email validation (basic email rules)
    if (!this.email || typeof this.email !== 'string') {
      errors.push('Email is required.');
    } else {
      const emailParts = this.email.split('@');
      if (emailParts.length !== 2) {
        errors.push('Invalid email format.');
      } else {
        const [localPart, domainPart] = emailParts;
        if (!localPart || !domainPart) {
          errors.push('Invalid email format.');
        } else {
          const domainParts = domainPart.split('.');
          if (domainParts.length < 2 || domainParts.some(part => part === '')) {
            errors.push('Invalid email format.');
          }
        }
      }
    }

    // Resident Status validation (Active or Inactive only)
    const validStatuses = [ResidentStatus.ACTIVE, ResidentStatus.INACTIVE];
    if (!this.status || !validStatuses.includes(this.status)) {
      errors.push('Unsupported resident status.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}