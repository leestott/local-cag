/**
 * Context module tests – CAG version.
 *
 * Tests the context loading, domain context building, and front-matter parsing
 * functions that form the core of the CAG architecture.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFrontMatter,
  buildDomainContext,
  buildCompactContext,
  selectRelevantDocs,
  buildSelectedContext,
  listDocuments,
} from "../src/context.js";

// ── parseFrontMatter ──

describe("parseFrontMatter", () => {
  it("parses YAML front-matter and returns meta + body", () => {
    const input = `---
title: Gas Leak Detection
category: Inspection Procedures
id: DOC-IP-001
---

# Gas Leak Detection

Step one of the procedure.`;

    const { meta, body } = parseFrontMatter(input);
    assert.equal(meta.title, "Gas Leak Detection");
    assert.equal(meta.category, "Inspection Procedures");
    assert.equal(meta.id, "DOC-IP-001");
    assert.ok(body.includes("# Gas Leak Detection"));
    assert.ok(body.includes("Step one"));
  });

  it("returns empty meta and full text when no front-matter", () => {
    const input = "# Just a heading\n\nSome body text.";
    const { meta, body } = parseFrontMatter(input);
    assert.deepEqual(meta, {});
    assert.equal(body, input);
  });

  it("handles front-matter with colons in values", () => {
    const input = `---
title: Valve Types: Gate and Ball
category: Equipment
---

Body text.`;
    const { meta, body } = parseFrontMatter(input);
    assert.equal(meta.title, "Valve Types: Gate and Ball");
    assert.ok(body.includes("Body text."));
  });
});

// ── buildDomainContext ──

describe("buildDomainContext", () => {
  const sampleDocs = [
    {
      id: "DOC-SC-001",
      title: "Emergency Shutdown",
      category: "Safety & Compliance",
      body: "Step 1: Activate ESD.\nStep 2: Evacuate.",
    },
    {
      id: "DOC-IP-001",
      title: "Gas Leak Detection",
      category: "Inspection Procedures",
      body: "Use portable gas detector.\nApply soapy water test.",
    },
    {
      id: "DOC-SC-002",
      title: "PPE Requirements",
      category: "Safety & Compliance",
      body: "Hard hat required.\nSteel-toe boots required.",
    },
  ];

  it("groups documents by category", () => {
    const context = buildDomainContext(sampleDocs);
    assert.ok(context.includes("Safety & Compliance"));
    assert.ok(context.includes("Inspection Procedures"));
  });

  it("includes all document titles and content", () => {
    const context = buildDomainContext(sampleDocs);
    assert.ok(context.includes("Emergency Shutdown"));
    assert.ok(context.includes("Gas Leak Detection"));
    assert.ok(context.includes("PPE Requirements"));
    assert.ok(context.includes("Activate ESD"));
    assert.ok(context.includes("soapy water"));
  });

  it("returns empty string for empty docs array", () => {
    const context = buildDomainContext([]);
    assert.equal(context, "");
  });
});

// ── buildCompactContext ──

describe("buildCompactContext", () => {
  const sampleDocs = [
    {
      id: "DOC-SC-001",
      title: "Emergency Shutdown",
      category: "Safety & Compliance",
      body: "## Safety Warnings\n⚠️ DANGER: High pressure.\n\n## Procedure\n1. Activate ESD.\n2. Evacuate.\n\n## References\nSee manual.",
    },
    {
      id: "DOC-IP-001",
      title: "Gas Leak Detection",
      category: "Inspection Procedures",
      body: "## Overview\nDetect gas leaks early.\n\n## Procedure\n1. Use detector.\n2. Apply soapy water.",
    },
  ];

  it("returns a non-empty string", () => {
    const compact = buildCompactContext(sampleDocs);
    assert.ok(compact.length > 0);
  });

  it("is shorter than full domain context", () => {
    const full = buildDomainContext(sampleDocs);
    const compact = buildCompactContext(sampleDocs);
    assert.ok(compact.length <= full.length, "compact context should be shorter or equal");
  });
});

describe("selectRelevantDocs", () => {
  const sampleDocs = [
    {
      id: "DOC-SC-001",
      title: "Emergency Shutdown",
      category: "Safety & Compliance",
      content: "## Procedure\n1. Activate ESD.\n2. Evacuate the area.",
    },
    {
      id: "DOC-IP-001",
      title: "Meter Installation",
      category: "Equipment Manuals",
      content: "## Procedure\n1. Isolate supply.\n2. Fit the meter.",
    },
  ];

  it("prefers documents with matching title and content terms", () => {
    const selected = selectRelevantDocs("shutdown procedure", sampleDocs, 1);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].id, "DOC-SC-001");
  });
});

describe("buildSelectedContext", () => {
  const sampleDocs = [
    {
      id: "DOC-SC-001",
      title: "Emergency Shutdown",
      category: "Safety & Compliance",
      content: "# Emergency Shutdown\n\n## Safety Warning\nHigh pressure release possible.\n\n## Procedure\n1. Activate ESD.\n2. Evacuate the area.",
    },
  ];

  it("focuses selected context on matching sections", () => {
    const context = buildSelectedContext(sampleDocs, "pressure shutdown");
    assert.ok(context.includes("Emergency Shutdown"));
    assert.ok(context.includes("High pressure release possible"));
  });
});

// ── listDocuments ──

describe("listDocuments", () => {
  const sampleDocs = [
    { id: "DOC-1", title: "Doc One", category: "Cat A", body: "Content one." },
    { id: "DOC-2", title: "Doc Two", category: "Cat B", body: "Content two here." },
  ];

  it("returns id, title, category for each document", () => {
    const list = listDocuments(sampleDocs);
    assert.equal(list.length, 2);
    assert.equal(list[0].id, "DOC-1");
    assert.equal(list[0].title, "Doc One");
    assert.equal(list[0].category, "Cat A");
    assert.equal(list[1].id, "DOC-2");
  });

  it("does not include body content", () => {
    const list = listDocuments(sampleDocs);
    for (const item of list) {
      assert.equal(item.body, undefined, "body should not be in list output");
    }
  });

  it("returns empty array for no docs", () => {
    const list = listDocuments([]);
    assert.deepEqual(list, []);
  });
});
