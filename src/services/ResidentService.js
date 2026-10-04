export class ResidentService {
  constructor(repository) {
    this.repository = repository;
  }

  listResidents() {
    return this.repository.findAll();
  }

  searchResidents(searchTerm) {
    const term = (searchTerm ?? '').trim();
    if (!term) return this.listResidents();
    return this.repository.searchByName(term);
  }
}
