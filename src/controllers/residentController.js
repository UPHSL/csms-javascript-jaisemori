import { Resident } from '../models/Resident.js';

const editableFields = ['firstName', 'lastName', 'address', 'contactNumber', 'email'];

const pickEditableFields = body => Object.fromEntries(
  editableFields.map(field => [field, body[field] ?? ''])
);

export class ResidentController {
  constructor({ residentService, registrationService, updateService, deactivationService }) {
    this.residentService = residentService;
    this.registrationService = registrationService;
    this.updateService = updateService;
    this.deactivationService = deactivationService;
  }

  list = (request, response) => {
    const searchTerm = typeof request.query.search === 'string' ? request.query.search : '';
    const residents = this.residentService.searchResidents(searchTerm);

    response.status(200).render('residents/index', {
      residents,
      searchTerm,
      message: request.query.message ?? ''
    });
  };

  showRegistrationForm = (_request, response) => {
    response.status(200).render('residents/form', {
      mode: 'register',
      resident: new Resident(),
      errors: []
    });
  };

  register = (request, response) => {
    const submitted = pickEditableFields(request.body);
    const result = this.registrationService.register(new Resident(submitted));

    if (!result.success) {
      return response.status(400).render('residents/form', {
        mode: 'register',
        resident: submitted,
        errors: result.errors
      });
    }

    return response.redirect(303, '/residents?message=Resident%20registered%20successfully.');
  };

  showEditForm = (request, response) => {
    const resident = this.residentService.findResidentById(request.params.id);
    if (!resident) return this.renderNotFound(response);

    return response.status(200).render('residents/form', {
      mode: 'edit',
      resident,
      errors: []
    });
  };

  update = (request, response) => {
    const submitted = pickEditableFields(request.body);
    const result = this.updateService.updateResident(request.params.id, submitted);

    if (result.notFound) return this.renderNotFound(response);
    if (!result.success) {
      const persisted = this.residentService.findResidentById(request.params.id);
      return response.status(400).render('residents/form', {
        mode: 'edit',
        resident: { ...persisted, ...submitted },
        errors: result.errors
      });
    }

    return response.redirect(303, '/residents?message=Resident%20information%20updated%20successfully.');
  };

  deactivate = (request, response) => {
    const result = this.deactivationService.deactivateResident(request.params.id);
    if (result.notFound) return this.renderNotFound(response);

    const message = result.alreadyInactive
      ? 'Resident%20is%20already%20Inactive.'
      : 'Resident%20deactivated%20successfully.';
    return response.redirect(303, `/residents?message=${message}`);
  };

  renderNotFound = response => response.status(404).render('residents/not-found');
}
