import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { notFound } from "./middleware/notFound.js";
import { ResidentRepository } from "./repositories/ResidentRepository.js";
import { ServiceRequestRepository } from "./repositories/ServiceRequestRepository.js";
import mainRoutes from "./routes/index.js";
import { createDashboardRouter } from "./routes/dashboardRoutes.js";
import { createResidentRouter } from "./routes/residentRoutes.js";
import { createServiceRequestRouter } from "./routes/serviceRequestRoutes.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

/**
 * Create and configure the CSMS Express application.
 *
 * @returns {import("express").Express} Configured Express application.
 */
export function createApp({ residentRepository, serviceRequestRepository } = {}) {
  const app = express();
  const residents = residentRepository ?? new ResidentRepository();
  const serviceRequests = serviceRequestRepository ?? new ServiceRequestRepository();

  app.disable("x-powered-by");

  app.set("views", path.join(currentDirectory, "views"));
  app.set("view engine", "ejs");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(currentDirectory, "..", "public")));

  app.use(mainRoutes);
  app.use(createDashboardRouter({
    residentRepository: residents,
    serviceRequestRepository: serviceRequests
  }));
  app.use(createResidentRouter({ residentRepository: residents }));
  app.use(createServiceRequestRouter({
    residentRepository: residents,
    serviceRequestRepository: serviceRequests
  }));

  app.use(notFound);

  return app;
}
