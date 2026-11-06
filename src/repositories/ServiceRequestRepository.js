import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ServiceRequest } from '../models/ServiceRequest.js';

export class ServiceRequestRepository {
  constructor(databasePath) {
    this.databasePath = databasePath || path.join(process.cwd(), 'data', 'service_requests.sqlite');
    this._initializeDatabase();
  }

  _openDatabase(options = {}) {
    return new DatabaseSync(this.databasePath, options);
  }

  _initializeDatabase() {
    const directory = path.dirname(this.databasePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const database = this._openDatabase();
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS service_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resident_id TEXT NOT NULL,
          service_type TEXT NOT NULL,
          description TEXT NOT NULL,
          date_requested TEXT NOT NULL,
          status TEXT NOT NULL
        )
      `);
    } finally {
      database.close();
    }
  }

  _toServiceRequest(record) {
    if (!record) return null;
    return new ServiceRequest({
      id: Number(record.id),
      residentId: record.resident_id,
      serviceType: record.service_type,
      description: record.description,
      dateRequested: record.date_requested,
      status: record.status
    });
  }

  save(serviceRequest) {
    const database = this._openDatabase();
    try {
      const result = database.prepare(`
        INSERT INTO service_requests (
          resident_id,
          service_type,
          description,
          date_requested,
          status
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        String(serviceRequest.residentId),
        serviceRequest.serviceType,
        serviceRequest.description,
        serviceRequest.dateRequested,
        serviceRequest.status
      );

      return this.findById(Number(result.lastInsertRowid));
    } finally {
      database.close();
    }
  }

  findById(id) {
    if (id === null || id === undefined) return null;

    const database = this._openDatabase({ readOnly: true });
    try {
      const record = database.prepare(`
        SELECT id, resident_id, service_type, description, date_requested, status
        FROM service_requests
        WHERE id = ?
      `).get(Number(id));
      return this._toServiceRequest(record);
    } finally {
      database.close();
    }
  }

  findAll() {
    const database = this._openDatabase({ readOnly: true });
    try {
      const records = database.prepare(`
        SELECT id, resident_id, service_type, description, date_requested, status
        FROM service_requests
        ORDER BY id
      `).all();
      return records.map(record => this._toServiceRequest(record));
    } finally {
      database.close();
    }
  }

  updateStatus(id, status) {
    const database = this._openDatabase();
    try {
      const result = database.prepare(`
        UPDATE service_requests
        SET status = ?
        WHERE id = ?
      `).run(status, Number(id));

      if (Number(result.changes) === 0) return null;
      return this.findById(id);
    } finally {
      database.close();
    }
  }
}
