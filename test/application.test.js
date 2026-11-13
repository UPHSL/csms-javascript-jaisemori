import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { applicationConfig } from "../src/config/application.js";

const app = createApp();

test("home page returns successfully", async () => {
  const response = await request(app).get("/");

  assert.equal(response.statusCode, 200);
});

test("home page presents the CSMS release identity and primary navigation", async () => {
  const response = await request(app).get("/");

  assert.match(
    response.text,
    /Community Services Management System/
  );

  assert.match(
    response.text,
    /Sprint 6 - Final Release/
  );

  assert.match(
    response.text,
    /JavaScript with Express\.js/
  );

  assert.match(response.text, /v1\.0\.0/);
  assert.match(response.text, /class="home-page"/);
  assert.match(response.text, /href="\/dashboard"/);
  assert.match(response.text, /href="\/residents"/);
  assert.match(response.text, /href="\/service-requests"/);
});

test("shared release styles provide professional home and management shells", async () => {
  const response = await request(app).get("/css/style.css");

  assert.equal(response.statusCode, 200);
  assert.match(response.text, /\.home-page \.release-hero/);
  assert.match(response.text, /\.management-page \.section-nav/);
  assert.match(response.text, /\.management-page \.panel/);
  assert.match(response.text, /\.release-footer/);
});

test("health endpoint returns the expected payload", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.statusCode, 200);

  assert.deepEqual(response.body, {
    status: "ok",
    application: "Community Services Management System",
    version: "1.0.0"
  });
});

test("runtime release version matches package metadata", () => {
  const packageMetadata = JSON.parse(fs.readFileSync(
    new URL("../package.json", import.meta.url),
    "utf8"
  ));

  assert.equal(packageMetadata.version, "1.0.0");
  assert.equal(applicationConfig.version, packageMetadata.version);
});

test("unknown route returns HTTP 404", async () => {
  const response = await request(app).get("/does-not-exist");

  assert.equal(response.statusCode, 404);

  assert.deepEqual(response.body, {
    status: "error",
    message: "Resource not found"
  });
});
