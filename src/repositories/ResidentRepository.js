import fs from 'node:fs';
import path from 'node:path';
import { Resident } from '../models/Resident.js';

export class ResidentRepository {
  /**
   * @param {string} [filePath] - Path to the JSON storage file.
   */
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'residents.json');
    this._ensureFileExists();
  }

  /**
   * Ensures the storage directory and JSON file exist.
   */
  _ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf8');
    }
  }

  /**
   * Reads all residents from disk.
   * @returns {Array<object>}
   */
  _readData() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Writes residents array back to disk.
   * @param {Array<object>} data
   */
  _writeData(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Generates a simple auto-incremented string ID.
   * @returns {string}
   */
  _generateId(data) {
    if (data.length === 0) return '1';
    const maxId = Math.max(...data.map(item => parseInt(item.id, 10) || 0));
    return String(maxId + 1);
  }

  /**
   * Persists a resident to file and assigns an ID if unassigned.
   * @param {Resident} resident
   * @returns {Resident}
   */
  save(resident) {
    const data = this._readData();

    let assignedId = resident.id;
    if (!assignedId) {
      assignedId = this._generateId(data);
    }

    const residentRecord = {
      id: String(assignedId),
      firstName: resident.firstName,
      lastName: resident.lastName,
      address: resident.address,
      contactNumber: String(resident.contactNumber), // Preserves leading zero
      email: resident.email,
      status: resident.status
    };

    const existingIndex = data.findIndex(item => String(item.id) === String(assignedId));
    if (existingIndex >= 0) {
      data[existingIndex] = residentRecord;
    } else {
      data.push(residentRecord);
    }

    this._writeData(data);
    return new Resident(residentRecord);
  }

  /**
   * Retrieves a resident by ID.
   * @param {string|number} id
   * @returns {Resident|null}
   */
  findById(id) {
    const data = this._readData();
    const record = data.find(item => String(item.id) === String(id));
    if (!record) {
      return null;
    }
    return new Resident(record);
  }
}