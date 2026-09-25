# Community Services Management System

A Node.js and Express.js web application for managing community residents and
service requests.

## System Capabilities

- Resident domain model with validation rules
- Resident persistence (create and retrieve by ID)
- Resident registration with input validation
- Health check endpoint
- HTTP 404 handling
- EJS-based web interface

## Technology Stack

- Node.js 24 LTS
- JavaScript (ES modules)
- Express 5
- EJS
- npm
- Node.js built-in test runner
- Supertest

## Project Structure

```
src/
  config/         Application configuration
  controllers/    Route handler functions
  middleware/     Express middleware (e.g. 404 handler)
  models/         Domain models (Resident, ServiceRequest)
  repositories/   Data persistence layer
  routes/         Express route definitions
  services/       Business logic layer
  utils/          Shared utilities (validators)
  views/          EJS templates
test/             Automated test suites
data/             JSON flat-file storage
public/           Static assets
```

## Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <your-repository>
```

### 2. Verify Node.js version

```bash
node --version
```

Required major version: `24`

### 3. Install dependencies

```bash
npm ci
```

### 4. Run the application

```bash
npm start
```

Open in browser:

```
http://127.0.0.1:3000
```

Health endpoint:

```
http://127.0.0.1:3000/health
```

### 5. Run in development watch mode

```bash
npm run dev
```

### 6. Run automated tests

```bash
npm test
```

All test suites must pass with zero failures.
