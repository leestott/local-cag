/**
 * CAG architecture validation tests.
 *
 * Verifies that the CAG modules export the expected interfaces
 * and that old RAG dependencies (better-sqlite3) are not present.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

describe("CAG architecture", () => {
  it("context.js exports required functions", async () => {
    const ctx = await import("../src/context.js");
    assert.equal(typeof ctx.parseFrontMatter, "function");
    assert.equal(typeof ctx.buildDomainContext, "function");
    assert.equal(typeof ctx.buildCompactContext, "function");
    assert.equal(typeof ctx.listDocuments, "function");
    assert.equal(typeof ctx.loadDocuments, "function");
  });

  it("chatEngine.js exports ChatEngine class", async () => {
    const mod = await import("../src/chatEngine.js");
    assert.equal(typeof mod.ChatEngine, "function");
  });

  it("package.json does not depend on better-sqlite3", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    assert.equal(pkg.dependencies["better-sqlite3"], undefined,
      "better-sqlite3 should not be a dependency in CAG");
  });

  it("package.json does not have ingest script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    assert.equal(pkg.scripts.ingest, undefined,
      "ingest script should not exist in CAG");
  });

  it("docs directory exists with markdown files", () => {
    const docsDir = path.join(rootDir, "docs");
    assert.ok(fs.existsSync(docsDir), "docs/ directory must exist");
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));
    assert.ok(files.length > 0, "docs/ should contain .md files");
  });
});
