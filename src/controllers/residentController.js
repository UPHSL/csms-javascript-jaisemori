export class ResidentController {
  constructor({ residentService }) {
    this.residentService = residentService;
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
}
