/**
 * Server API tests – CAG version.
 *
 * These tests exercise the Express routes WITHOUT starting Foundry Local.
 * We build a minimal Express app with mocked engine — no GPU / model required.
 *
 * Uses Node built-in test runner + a lightweight HTTP helper.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import express from "express";
import { config } from "../src/config.js";

// ── Helpers ──

/** Simple HTTP request helper that returns { status, headers, body }. */
function request(server, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const opts = {
      hostname: "127.0.0.1",
      port: addr.port,
      path: urlPath,
      method,
      headers: { ...headers },
    };
    if (body !== undefined) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      opts.headers["Content-Type"] = opts.headers["Content-Type"] || "application/json";
      opts.headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on("error", reject);
    if (body !== undefined) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// ── Build a test Express app that mirrors server.js routes with a mocked engine ──

let server;

// Mock document list (simulates pre-loaded context)
const mockDocs = [
  { id: "DOC-SC-001", title: "Emergency Shutdown", category: "Safety & Compliance" },
  { id: "DOC-FD-001", title: "Regulator Fault Diagnosis", category: "Fault Diagnosis" },
];

before(async () => {
  const app = express();
  app.use(express.json());

  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", model: config.model, architecture: "CAG" });
  });

  // Context (replaces /api/docs)
  app.get("/api/context", (_req, res) => {
    res.json({ docs: mockDocs, count: mockDocs.length });
  });

  // Chat (mocked – no Foundry Local)
  app.post("/api/chat", (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    res.json({ text: `Echo: ${message}` });
  });

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
});

after(() => {
  server.close();
});

// ── Tests ──

describe("GET /api/health", () => {
  it("returns status ok with model name and architecture", async () => {
    const res = await request(server, "GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.model, config.model);
    assert.equal(res.body.architecture, "CAG");
  });
});

describe("GET /api/context", () => {
  it("returns list of pre-loaded context documents", async () => {
    const res = await request(server, "GET", "/api/context");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.docs));
    assert.equal(res.body.count, 2);
    assert.equal(res.body.docs[0].id, "DOC-SC-001");
  });
});

describe("POST /api/chat", () => {
  it("returns a response for a valid message", async () => {
    const res = await request(server, "POST", "/api/chat", { message: "hello" });
    assert.equal(res.status, 200);
    assert.ok(res.body.text.includes("hello"));
  });

  it("returns 400 when message is missing", async () => {
    const res = await request(server, "POST", "/api/chat", {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when message is not a string", async () => {
    const res = await request(server, "POST", "/api/chat", { message: 123 });
    assert.equal(res.status, 400);
  });
});
