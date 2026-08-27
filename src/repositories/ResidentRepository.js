import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../models/Resident.js';

export class ResidentRepository {
  /**
   * @param {string} [filePath]
   */
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'residents.json');
    this._ensureFileExists();
  }

  _ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf8');
    }
  }

  _readData() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch {
      return [];
    }
  }

  _writeData(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  _generateId(data) {
    if (!data || data.length === 0) return '1';
    const maxId = Math.max(...data.map(item => parseInt(item.id, 10) || 0));
    return String(maxId + 1);
  }

  _toResident(record) {
    if (!record) return null;
    return new Resident(record);
  }

  save(resident) {
    const data = this._readData();

    let assignedId = resident.id;
    if (assignedId === null || assignedId === undefined || String(assignedId).trim() === '') {
      assignedId = this._generateId(data);
    }

    const residentRecord = {
      id: String(assignedId),
      firstName: resident.firstName || '',
      lastName: resident.lastName || '',
      address: resident.address || '',
      contactNumber: String(resident.contactNumber ?? ''),
      email: resident.email || '',
      status: resident.status || 'Active'
    };

    const existingIndex = data.findIndex(item => String(item.id) === String(assignedId));
    if (existingIndex >= 0) {
      data[existingIndex] = residentRecord;
    } else {
      data.push(residentRecord);
    }

    this._writeData(data);
    return this._toResident(residentRecord);
  }

  findById(id) {
    if (id === null || id === undefined) return null;
    const data = this._readData();
    const record = data.find(item => String(item.id) === String(id));
    if (!record) {
      return null;
    }
    return this._toResident(record);
  }
}