function validateResident(resident) {
  const errors = [];

  if (!resident.firstName || !resident.firstName.trim())
    errors.push('firstName is required');
  if (!resident.lastName || !resident.lastName.trim())
    errors.push('lastName is required');
  if (!resident.address || !resident.address.trim())
    errors.push('address is required');
  if (!resident.contactNumber || !String(resident.contactNumber).trim())
    errors.push('contactNumber is required');
  if (!resident.email || !resident.email.trim())
    errors.push('email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resident.email))
    errors.push('email is invalid');

  return errors;
}

export const validators = Object.freeze({ validateResident });