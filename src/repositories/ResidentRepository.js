import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { Resident } from '../models/Resident.js';

const normalizeName = value => String(value ?? '').toLowerCase();

export class ResidentRepository {
  constructor(databasePath) {
    const usesDefaultPath = databasePath === undefined;
    this.databasePath = databasePath || path.join(process.cwd(), 'data', 'residents.sqlite');

    if (!usesDefaultPath) {
      const inPlaceRecords = this._readLegacyJson(this.databasePath);
      if (inPlaceRecords) {
        this._migrateJsonInPlace(inPlaceRecords);
        return;
      }
    }

    const legacyDefaultPath = path.join(process.cwd(), 'data', 'residents.json');
    const defaultRecords = usesDefaultPath && !fs.existsSync(this.databasePath)
      ? this._readLegacyJson(legacyDefaultPath)
      : null;
    this._initializeDatabase();
    if (defaultRecords) this._importLegacyRecords(defaultRecords);
  }

  _openDatabase(options = {}) {
    const database = new DatabaseSync(this.databasePath, options);
    database.exec('PRAGMA busy_timeout = 5000');
    return database;
  }

  _readLegacyJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const contents = fs.readFileSync(filePath, 'utf8').trim();
    if (!contents.startsWith('[')) return null;
    const records = JSON.parse(contents || '[]');
    if (!Array.isArray(records)) throw new TypeError('Legacy Resident data must be an array.');
    return records;
  }

  _migrateJsonInPlace(records) {
    const backupPath = `${this.databasePath}.legacy-backup-${process.pid}`;
    fs.renameSync(this.databasePath, backupPath);
    try {
      this._initializeDatabase();
      this._importLegacyRecords(records);
      fs.rmSync(backupPath, { force: true });
    } catch (error) {
      fs.rmSync(this.databasePath, { force: true });
      fs.renameSync(backupPath, this.databasePath);
      throw error;
    }
  }

  _initializeDatabase() {
    const directory = path.dirname(this.databasePath);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

    const database = this._openDatabase();
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS residents (
          row_id INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT UNIQUE,
          first_name TEXT NOT NULL,
          first_name_search TEXT NOT NULL,
          last_name TEXT NOT NULL,
          last_name_search TEXT NOT NULL,
          address TEXT NOT NULL,
          contact_number TEXT NOT NULL,
          email TEXT NOT NULL,
          status TEXT NOT NULL
        );

        CREATE TRIGGER IF NOT EXISTS residents_generate_id
        AFTER INSERT ON residents
        WHEN NEW.id IS NULL
        BEGIN
          UPDATE residents
          SET id = CAST((
            SELECT COALESCE(MAX(
              CASE
                WHEN id <> '' AND id NOT GLOB '*[^0-9]*' THEN CAST(id AS INTEGER)
                ELSE 0
              END
            ), 0) + 1
            FROM residents
            WHERE row_id <> NEW.row_id
          ) AS TEXT)
          WHERE row_id = NEW.row_id;
        END;
      `);
    } finally {
      database.close();
    }
  }

  _recordValues(resident) {
    const firstName = resident.firstName || '';
    const lastName = resident.lastName || '';
    return [
      firstName,
      normalizeName(firstName),
      lastName,
      normalizeName(lastName),
      resident.address || '',
      String(resident.contactNumber ?? ''),
      resident.email || '',
      resident.status || 'Active'
    ];
  }

  _importLegacyRecords(records) {
    const database = this._openDatabase();
    const statement = database.prepare(`
      INSERT INTO residents (
        id, first_name, first_name_search, last_name, last_name_search,
        address, contact_number, email, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        first_name_search = excluded.first_name_search,
        last_name = excluded.last_name,
        last_name_search = excluded.last_name_search,
        address = excluded.address,
        contact_number = excluded.contact_number,
        email = excluded.email,
        status = excluded.status
    `);

    try {
      database.exec('BEGIN IMMEDIATE');
      for (const record of records) {
        statement.run(String(record.id), ...this._recordValues(record));
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    } finally {
      database.close();
    }
  }

  _toResident(record) {
    if (!record) return null;
    return new Resident({
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      address: record.address,
      contactNumber: record.contact_number,
      email: record.email,
      status: record.status
    });
  }

  _sort(records) {
    return [...records].sort((a, b) =>
      a.lastName.localeCompare(b.lastName)
      || a.firstName.localeCompare(b.firstName)
      || String(a.id).localeCompare(String(b.id))
    );
  }

  save(resident) {
    const database = this._openDatabase();
    try {
      const hasId = resident.id !== null
        && resident.id !== undefined
        && String(resident.id).trim() !== '';
      const values = this._recordValues(resident);

      if (!hasId) {
        const result = database.prepare(`
          INSERT INTO residents (
            id, first_name, first_name_search, last_name, last_name_search,
            address, contact_number, email, status
          ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(...values);
        const record = database.prepare(`
          SELECT id, first_name, last_name, address, contact_number, email, status
          FROM residents WHERE row_id = ?
        `).get(result.lastInsertRowid);
        return this._toResident(record);
      }

      database.prepare(`
        INSERT INTO residents (
          id, first_name, first_name_search, last_name, last_name_search,
          address, contact_number, email, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          first_name = excluded.first_name,
          first_name_search = excluded.first_name_search,
          last_name = excluded.last_name,
          last_name_search = excluded.last_name_search,
          address = excluded.address,
          contact_number = excluded.contact_number,
          email = excluded.email,
          status = excluded.status
      `).run(String(resident.id), ...values);
      return this.findById(resident.id);
    } finally {
      database.close();
    }
  }

  findById(id) {
    if (id === null || id === undefined) return null;
    const database = this._openDatabase({ readOnly: true });
    try {
      const record = database.prepare(`
        SELECT id, first_name, last_name, address, contact_number, email, status
        FROM residents
        WHERE id = ?
      `).get(String(id));
      return this._toResident(record);
    } finally {
      database.close();
    }
  }

  findAll() {
    const database = this._openDatabase({ readOnly: true });
    try {
      const records = database.prepare(`
        SELECT id, first_name, last_name, address, contact_number, email, status
        FROM residents
      `).all().map(record => this._toResident(record));
      return this._sort(records);
    } finally {
      database.close();
    }
  }

  searchByName(searchTerm) {
    const escapedTerm = normalizeName(searchTerm)
      .replaceAll('\\', '\\\\')
      .replaceAll('%', '\\%')
      .replaceAll('_', '\\_');
    const pattern = `%${escapedTerm}%`;
    const database = this._openDatabase({ readOnly: true });
    try {
      const records = database.prepare(`
        SELECT id, first_name, last_name, address, contact_number, email, status
        FROM residents
        WHERE first_name_search LIKE ? ESCAPE '\\'
           OR last_name_search LIKE ? ESCAPE '\\'
      `).all(pattern, pattern).map(record => this._toResident(record));
      return this._sort(records);
    } finally {
      database.close();
    }
  }

  update(id, updatedData) {
    const existing = this.findById(id);
    if (!existing) return null;
    const firstName = updatedData.firstName ?? existing.firstName;
    const lastName = updatedData.lastName ?? existing.lastName;
    const database = this._openDatabase();
    try {
      database.prepare(`
        UPDATE residents
        SET first_name = ?, first_name_search = ?, last_name = ?, last_name_search = ?,
            address = ?, contact_number = ?, email = ?
        WHERE id = ?
      `).run(
        firstName,
        normalizeName(firstName),
        lastName,
        normalizeName(lastName),
        updatedData.address ?? existing.address,
        updatedData.contactNumber !== undefined ? String(updatedData.contactNumber) : existing.contactNumber,
        updatedData.email ?? existing.email,
        String(id)
      );
      return this.findById(id);
    } finally {
      database.close();
    }
  }

  deactivate(id) {
    const database = this._openDatabase();
    try {
      const result = database.prepare(`
        UPDATE residents SET status = 'Inactive' WHERE id = ?
      `).run(String(id));
      if (Number(result.changes) === 0) return null;
      return this.findById(id);
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
          SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) AS inactive
        FROM residents
      `).get();
      return {
        total: Number(counts.total),
        active: Number(counts.active),
        inactive: Number(counts.inactive)
      };
    } finally {
      database.close();
    }
  }
}
