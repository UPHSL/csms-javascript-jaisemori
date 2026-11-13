import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ServiceRequest } from '../models/ServiceRequest.js';

const normalizeIdentifier = value => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export class ServiceRequestRepository {
  constructor(databasePath) {
    this.databasePath = databasePath || path.join(process.cwd(), 'data', 'service_requests.sqlite');
    this._initializeDatabase();
  }

  _openDatabase(options = {}) {
    const database = new DatabaseSync(this.databasePath, options);
    database.exec('PRAGMA busy_timeout = 5000');
    return database;
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
    const normalizedId = normalizeIdentifier(id);
    if (normalizedId === null) return null;

    const database = this._openDatabase({ readOnly: true });
    try {
      const record = database.prepare(`
        SELECT id, resident_id, service_type, description, date_requested, status
        FROM service_requests
        WHERE id = ?
      `).get(normalizedId);
      return this._toServiceRequest(record);
    } finally {
      database.close();
    }
  }

  findAll() {
    return this.query();
  }

  query({ searchTerm = '', status = null } = {}) {
    const database = this._openDatabase({ readOnly: true });
    try {
      const conditions = [];
      const parameters = [];
      const normalizedTerm = typeof searchTerm === 'string'
        ? searchTerm.trim().toLowerCase()
        : '';

      if (normalizedTerm) {
        const escapedTerm = normalizedTerm
          .replaceAll('\\', '\\\\')
          .replaceAll('%', '\\%')
          .replaceAll('_', '\\_');
        const pattern = `%${escapedTerm}%`;

        conditions.push(`(
          LOWER(service_type) LIKE ? ESCAPE '\\'
          OR LOWER(description) LIKE ? ESCAPE '\\'
        )`);
        parameters.push(pattern, pattern);
      }

      if (status !== null && status !== undefined && status !== '') {
        conditions.push('status = ?');
        parameters.push(status);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';
      const records = database.prepare(`
        SELECT id, resident_id, service_type, description, date_requested, status
        FROM service_requests
        ${whereClause}
        ORDER BY date_requested DESC, id DESC
      `).all(...parameters);
      return records.map(record => this._toServiceRequest(record));
    } finally {
      database.close();
    }
  }

  getDashboardCounts() {
    const database = this._openDatabase({ readOnly: true });
    try {
      const counts = database.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM service_requests
      `).get();
      return {
        total: Number(counts.total),
        pending: Number(counts.pending),
        inProgress: Number(counts.in_progress),
        completed: Number(counts.completed),
        cancelled: Number(counts.cancelled)
      };
    } finally {
      database.close();
    }
  }

  findRecent(limit = 5) {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 5)
      : 5;
    const database = this._openDatabase({ readOnly: true });
    try {
      return database.prepare(`
        SELECT id, resident_id, service_type, description, date_requested, status
        FROM service_requests
        ORDER BY date_requested DESC, id DESC
        LIMIT ?
      `).all(safeLimit).map(record => this._toServiceRequest(record));
    } finally {
      database.close();
    }
  }

  updateStatus(id, status) {
    const normalizedId = normalizeIdentifier(id);
    if (normalizedId === null) return null;

    const database = this._openDatabase();
    try {
      const result = database.prepare(`
        UPDATE service_requests
        SET status = ?
        WHERE id = ?
      `).run(status, normalizedId);

      if (Number(result.changes) === 0) return null;
      return this.findById(normalizedId);
    } finally {
      database.close();
    }
  }
}
