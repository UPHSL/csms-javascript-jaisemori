import fs from 'node:fs';
import path from 'node:path';
import { ServiceRequest, ServiceRequestStatus } from '../models/ServiceRequest.js';

export class ServiceRequestRepository {
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'service_requests.json');
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

  _toServiceRequest(record) {
    if (!record) return null;
    return new ServiceRequest(record);
  }

  save(serviceRequest) {
    const data = this._readData();
    const assignedId = this._generateId(data);
    const serviceRequestRecord = {
      id: assignedId,
      residentId: String(serviceRequest.residentId),
      serviceType: serviceRequest.serviceType || '',
      description: serviceRequest.description || '',
      dateRequested: serviceRequest.dateRequested || '',
      status: serviceRequest.status || ServiceRequestStatus.PENDING
    };

    data.push(serviceRequestRecord);
    this._writeData(data);
    return this._toServiceRequest(serviceRequestRecord);
  }

  findById(id) {
    if (id === null || id === undefined) return null;
    const data = this._readData();
    const record = data.find(item => String(item.id) === String(id));
    return this._toServiceRequest(record);
  }

  findAll() {
    return this._readData().map(record => this._toServiceRequest(record));
  }
}
