import { Resident } from '../models/Resident.js';

const editableFields = ['firstName', 'lastName', 'address', 'contactNumber', 'email'];

const pickEditableFields = body => Object.fromEntries(
  editableFields.map(field => [field, body[field] ?? ''])
);

export class ResidentController {
  constructor({ residentService, registrationService, updateService, residentRepository }) {
    this.residentService = residentService;
    this.registrationService = registrationService;
    this.updateService = updateService;
    this.residentRepository = residentRepository;
  }

  list = (request, response) => {
    const searchTerm = request.query.search ?? '';
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
    const resident = this.residentRepository.findById(request.params.id);
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
      const persisted = this.residentRepository.findById(request.params.id);
      return response.status(400).render('residents/form', {
        mode: 'edit',
        resident: { ...persisted, ...submitted },
        errors: result.errors
      });
    }

    return response.redirect(303, '/residents?message=Resident%20information%20updated%20successfully.');
  };

  renderNotFound = response => response.status(404).render('residents/not-found');
}
