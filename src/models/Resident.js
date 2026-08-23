export const ResidentStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
};

export class Resident {
  constructor({ id, firstName, lastName, address, contactNumber, email, status = ResidentStatus.ACTIVE }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.address = address;
    this.contactNumber = contactNumber;
    this.email = email;
    this.status = status;
  }
}