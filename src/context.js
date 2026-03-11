/**
 * Context module for Context-Aware Generation (CAG).
 * Reads all domain documents from the docs/ folder at startup
 * and provides them as pre-loaded, structured context blocks.
 *
 * Unlike RAG (which retrieves chunks at query time), CAG injects
 * the full domain knowledge into the prompt upfront — no vector
 * search, no embeddings, no retrieval step.
 */
import fs from "fs";
import path from "path";
import { config } from "./config.js";

/**
 * Parse YAML-like front-matter from a markdown document.
 */
function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return { meta, body: match[2] };
}

/**
 * Load all markdown documents from the docs/ folder.
 * Returns an array of { id, title, category, content } objects.
 */
export function loadDocuments() {
  const docsDir = config.docsDir;
  if (!fs.existsSync(docsDir)) {
    console.warn(`[Context] Docs directory not found: ${docsDir}`);
    return [];
  }

  const files = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const docs = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(docsDir, file), "utf-8");
    const { meta, body } = parseFrontMatter(raw);
    docs.push({
      id: meta.id || path.basename(file, ".md"),
      title: meta.title || file,
      category: meta.category || "General",
      content: body.trim(),
    });
  }

  return docs;
}

/**
 * Build the full domain context block from all loaded documents.
 * This is injected as a system message alongside the role prompt.
 *
 * Documents are grouped by category for clarity and auditability.
 */
export function buildDomainContext(docs) {
  if (docs.length === 0) {
    return "No domain documents loaded.";
  }

  // Group documents by category
  const categories = new Map();
  for (const doc of docs) {
    if (!categories.has(doc.category)) {
      categories.set(doc.category, []);
    }
    categories.get(doc.category).push(doc);
  }

  const sections = [];
  for (const [category, categoryDocs] of categories) {
    sections.push(`=== ${category} ===`);
    for (const doc of categoryDocs) {
      sections.push(`--- ${doc.title} [${doc.id}] ---`);
      sections.push(doc.content);
      sections.push("");
    }
  }

  return sections.join("\n");
}

/**
 * Build a compact context summary for edge/constrained devices.
 * Includes document titles and key safety warnings only.
 */
export function buildCompactContext(docs) {
  if (docs.length === 0) {
    return "No domain documents loaded.";
  }

  const sections = [];
  for (const doc of docs) {
    // Extract just the safety warnings and key procedure steps
    const lines = doc.content.split("\n");
    const keyLines = [];
    let inSafety = false;
    let inProcedure = false;

    for (const line of lines) {
      if (/^##\s*(safety|warning)/i.test(line)) {
        inSafety = true;
        inProcedure = false;
        keyLines.push(line);
      } else if (/^##\s*procedure/i.test(line)) {
        inProcedure = true;
        inSafety = false;
        keyLines.push(line);
      } else if (/^##\s/.test(line)) {
        inSafety = false;
        inProcedure = false;
      } else if (inSafety || inProcedure) {
        keyLines.push(line);
      }
    }

    sections.push(`--- ${doc.title} [${doc.id}] ---`);
    if (keyLines.length > 0) {
      sections.push(keyLines.join("\n"));
    } else {
      // Fallback: first 5 non-empty lines
      const summary = lines.filter((l) => l.trim()).slice(0, 5).join("\n");
      sections.push(summary);
    }
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Select the most relevant documents for a user query using simple
 * keyword matching. All documents remain in memory (CAG) but only
 * the top matches are injected into the prompt to keep context small
 * enough for practical CPU inference.
 */
export function selectRelevantDocs(query, docs, maxDocs = 3) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return docs.slice(0, maxDocs);

  const scored = docs.map((doc) => {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3;
      if (contentLower.includes(term)) score += 1;
    }
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxDocs).filter((s) => s.score > 0);
  return selected.length > 0
    ? selected.map((s) => s.doc)
    : docs.slice(0, maxDocs);
}

/**
 * Build context from a subset of selected documents.
 */
export function buildSelectedContext(docs) {
  const sections = [];
  for (const doc of docs) {
    sections.push(`--- ${doc.title} [${doc.id}] ---`);
    sections.push(doc.content);
    sections.push("");
  }
  return sections.join("\n");
}

/**
 * Build a short document index listing all available topics.
 */
export function buildDocumentIndex(docs) {
  return docs.map((d) => `- ${d.title} [${d.id}]`).join("\n");
}

/**
 * Get a list of loaded documents (for the /api/context endpoint).
 */
export function listDocuments(docs) {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
  }));
}
