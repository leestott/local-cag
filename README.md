[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=000)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2020-339933?logo=node.js&logoColor=fff)](https://nodejs.org/)
[![Foundry Local](https://img.shields.io/badge/Foundry%20Local-On--Device%20AI-0078D4?logo=microsoft&logoColor=fff)](https://foundrylocal.ai)
[![Foundry Local Models](https://img.shields.io/badge/Model-Auto--Selected-6B21A8)](https://foundrylocal.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Offline](https://img.shields.io/badge/Connectivity-100%25%20Offline-brightgreen)]()

# Gas Field Local CAG: Offline Support Agent

A fully offline, on-device **Context-Augmented Generation (CAG)** support agent for gas field inspection and maintenance engineers. Built with **[Foundry Local](https://foundrylocal.ai)**, this sample shows you how to build a production-style CAG application that runs entirely on your machine, with no cloud, no API keys, and no internet required. The app **automatically selects the best model** for your device based on available system RAM.

![Landing Page, Desktop](screenshots/01-landing-page.png)

> **New to CAG?** Context-Augmented Generation is a pattern where all domain knowledge is pre-loaded into the model's context window at startup. Unlike RAG (Retrieval-Augmented Generation), which retrieves relevant chunks at query time, CAG injects the full knowledge base into the system prompt upfront. This eliminates the need for vector databases, embeddings, or retrieval pipelines, making the system simpler and faster whilst still grounding the model's answers in your documents.
>
> **Want to compare approaches?** See [local-rag](https://github.com/leestott/local-rag) for a RAG-based implementation of the same scenario using vector search and embeddings.

## What You'll Learn

If you're a developer getting started with AI-powered applications, this project demonstrates:

1. **How CAG works end-to-end**: document loading, context injection, and grounded generation
2. **Running AI models locally** with [Foundry Local](https://foundrylocal.ai) (no GPU required, works on CPU/NPU)
3. **Building a mobile-responsive web UI** that works in the field (large touch targets, high contrast, PWA-ready)
4. **Streaming AI responses** using Server-Sent Events (SSE)
5. **Zero-infrastructure AI**: no vector database, no embeddings, no retrieval pipeline

## Architecture

![Architecture Diagram](screenshots/07-architecture-diagram.png)

**How a query flows:**

![CAG Query Flow](screenshots/08-rag-flow-sequence.png)

1. At startup, all 20 domain documents are loaded from `docs/` into memory and a document index is built
2. The user types a question in the browser
3. The Express server receives it and selects the top 3 most relevant documents using keyword scoring
4. The chat engine builds a prompt containing the system instructions, the document index, the selected documents (~6K chars), and the user's question
5. Foundry Local generates a response using the auto-selected model, grounded in the relevant context
6. The response streams back to the browser token-by-token via SSE

## Features

- **100% offline**: no internet, no cloud, no outbound calls
- **Dynamic model selection**: automatically picks the best model for your device based on available RAM
- **Visual startup progress**: loading overlay with progress bar and step-by-step status displayed in the browser whilst the model downloads and loads
- **Safety-first prompting**: safety warnings surface before any procedure
- **CAG context injection**: answers grounded in pre-loaded gas engineering documents
- **Streaming responses**: real-time SSE streaming to the UI
- **Mobile responsive**: works on phones, tablets, and desktops in the field
- **Edge/compact mode**: toggle for extreme latency / constrained devices
- **Field-ready UI**: high contrast, large touch targets, works with gloves/PPE

| Desktop | Mobile |
|---------|--------|
| ![Desktop view](screenshots/01-landing-page.png) | ![Mobile view](screenshots/02-mobile-view.png) |

## Prerequisites

Before you begin, make sure you have:

- **Node.js** ≥ 20: [Download here](https://nodejs.org/)
- **Foundry Local**: Microsoft's on-device AI runtime
  ```
  winget install Microsoft.FoundryLocal
  ```
- The best model is **auto-selected and auto-downloaded** on first run based on your device's RAM

> **Tip:** Run `foundry model list` to check which models are already cached on your machine. Set the `FOUNDRY_MODEL` environment variable to force a specific model alias (e.g. `FOUNDRY_MODEL=phi-3.5-mini npm start`).

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/leestott/local-cag.git
cd local-cag

# 2. Install dependencies
npm install

# 3. Start the server (loads documents and starts Foundry Local automatically)
npm start
```

Open **http://127.0.0.1:3000** in a browser. You should see the landing page with quick-action buttons and the chat input.

### What Happens at Startup

1. The Express server starts immediately on port 3000 and begins serving the web UI.
2. The browser connects to the `/api/status` SSE endpoint and displays a loading overlay with a progress bar.
3. All `.md` files in `docs/` are read and parsed (including optional YAML front-matter for title, category, and ID).
4. The documents are grouped by category and assembled into a structured domain context block.
5. The model selector evaluates available system RAM and picks the best model from the Foundry Local catalogue (downloading it on first run if needed, with download progress streamed to the browser).
6. Once the model is loaded, the overlay fades away and the chat interface becomes active.

Chat endpoints return 503 whilst the model is loading, so the UI cannot send queries before the engine is ready. There is no ingestion step, no vector database, and no embedding pipeline. Documents are loaded into memory at startup and the most relevant ones are selected per query.

## Chatting with the Agent

Type a question or tap one of the quick-action buttons. The agent uses the pre-loaded domain context to generate a safety-first response:

![Chat response with safety warnings and step-by-step guidance](screenshots/03-chat-response.png)

![Sources panel showing retrieved documents and relevance scores](screenshots/04-sources-panel.png)

### Mobile Chat

The UI is fully responsive: the same interface works on mobile devices with appropriately sized touch targets:

![Mobile chat view](screenshots/06-mobile-chat.png)

## Adding Documents

To expand the knowledge base, add `.md` files to the `docs/` folder and restart the server. Documents are loaded at startup and injected into the system prompt.

### Document Format

```markdown
---
title: My Procedure Title
category: Inspection Procedures
id: DOC-CUSTOM-001
---

# My Procedure Title

## Safety Warning
- Important safety note here.

## Procedure
1. Step one.
2. Step two.
```

## Project Structure

```
LOCAL-CAG/
├── docs/                     # 20 gas engineering domain documents
│   ├── 01-gas-leak-detection.md
│   ├── 02-regulator-fault-low-pressure.md
│   ├── 03-emergency-shutdown.md
│   ├── ...
│   └── 20-no-gas-flow-decision-tree.md
├── public/
│   └── index.html            # Field engineer web UI (single-file, no build step)
├── src/
│   ├── chatEngine.js         # Foundry Local + CAG orchestration
│   ├── config.js             # App configuration (paths, RAM budget)
│   ├── context.js            # Document loading + context block construction
│   ├── modelSelector.js      # Dynamic model selection based on device RAM
│   ├── prompts.js            # System prompts (full + compact/edge)
│   └── server.js             # Express server, SSE status broadcast, API endpoints
├── screenshots/              # App screenshots
├── test/                     # Unit tests (Node.js test runner)
├── package.json
└── README.md
```

## How the CAG Pipeline Works

Understanding each stage will help you adapt this pattern to your own projects.

### 1. Document Loading (`src/context.js`)

At startup, all `.md` files from `docs/` are read into memory. Optional YAML front-matter (title, category, ID) is parsed and used to organise the documents. A document index listing all available topics is also built so the model knows what knowledge is available.

### 2. Query-Time Document Selection

Rather than injecting all 20 documents into every prompt (which can exceed what smaller models handle efficiently on CPU), the engine selects the top 3 most relevant documents per query using keyword scoring. This reduces the context from ~41K chars to ~6K chars, enabling fast responses even on modest hardware. The full document index is always included so the model can reference any topic.

### 3. Chat Engine (`src/chatEngine.js`)

Orchestrates the CAG flow:
- Selects the most relevant documents for the user's query via `selectRelevantDocs()`
- Builds a messages array with the system prompt, the document index, the selected context, conversation history, and the user's question
- Sends it to the locally loaded model via the Foundry Local SDK (in-process, no HTTP round-trips)
- Streams the response back token-by-token

### 4. System Prompts (`src/prompts.js`)

Two prompt variants:
- **Full mode** (~300 tokens): detailed instructions for safety-first, structured responses
- **Edge mode** (~80 tokens): minimal prompt for constrained devices with limited context windows

## CAG vs RAG: Why Context-Augmented Generation?

This project uses CAG rather than RAG. Here is how they compare:

| Aspect | CAG (this project) | RAG |
|--------|-------------------|-----|
| **Context delivery** | All documents pre-loaded at startup; top 3 selected per query | Relevant chunks retrieved per query via vector similarity |
| **Infrastructure** | No vector database, no embeddings, no chunking pipeline | Requires vector store, embedding model, chunking pipeline |
| **Query latency** | No retrieval overhead; prompt is already assembled | Retrieval adds latency (embedding + similarity search) |
| **Accuracy** | Model sees relevant documents plus a full topic index | Model sees only the top-K retrieved chunks |
| **Scalability** | Limited by model context window size | Scales to large document collections |
| **Complexity** | Minimal: just load files and inject into prompt | More moving parts: chunker, embedder, vector store, retriever |

### When CAG Works Well

- **Small, curated document sets** (tens of documents, not thousands)
- **Models with large context windows** (e.g. Phi-4 supports 16k tokens)
- **Constrained environments** where simplicity and reliability matter more than scale
- **Safety-critical domains** where the model should see all relevant information, not just the top-K results

### When to Consider Switching to RAG

- **Hundreds or thousands of documents** that exceed the model's context window
- **Dynamic document collections** that change frequently and are too large to reload
- **Precision-critical retrieval** where only the most relevant chunks should be included

For the current use case, 20 short procedural guides on constrained local hardware, CAG delivers the best balance of simplicity, reliability, and answer quality.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Non-streaming chat completion |
| `POST` | `/api/chat/stream` | Streaming chat via SSE |
| `GET` | `/api/status` | SSE stream of initialisation progress (model download/load status) |
| `GET` | `/api/context` | List pre-loaded context documents |
| `GET` | `/api/health` | Health check (includes selected model and selection reason) |

## Domain Document Categories

The 20 included documents cover:

| # | Category | Documents |
|---|----------|-----------|
| 1 | Safety & Compliance | Emergency shutdown, PPE, confined space, hot work permits |
| 2 | Inspection Procedures | Leak detection, pressure testing, valve inspection, pipeline integrity, pre-inspection checklist |
| 3 | Fault Diagnosis | Regulator faults, gas detector fault codes, no-gas-flow decision tree |
| 4 | Repair & Maintenance | Gasket replacement, cathodic protection, corrosion treatment, purging |
| 5 | Equipment Manuals | Compressor maintenance, sensor calibration, relief valve testing, meter installation |

## Edge / Compact Mode

Toggle **Edge Mode** in the UI header for constrained devices:

| Setting | Full Mode | Edge Mode |
|---------|-----------|-----------|
| System prompt | ~300 tokens | ~80 tokens |
| Context | Full document content | Safety warnings and key procedures only |
| Max output tokens | 1024 | 512 |

## Key Concepts for New Developers

### What is Foundry Local?

[Foundry Local](https://foundrylocal.ai) is Microsoft's on-device AI runtime. It lets you run small language models (SLMs) directly on your laptop or workstation, with no GPU required and no cloud dependency. The `foundry-local-sdk` npm package provides native bindings for direct in-process inference.

This project uses dynamic model selection: the app queries the SDK catalogue at startup, checks system RAM, and picks the largest model that fits comfortably. You can override this by setting the `FOUNDRY_MODEL` environment variable.

```js
import { FoundryLocalManager } from "foundry-local-sdk";

const manager = FoundryLocalManager.create({ appName: "my-app" });
// Auto-select the best model for this device
const models = await manager.catalog.getModels();
// ... or force a specific alias:
const model = await manager.catalog.getModel("phi-3.5-mini");
await model.load();
const chatClient = model.createChatClient();
```

### What is Context-Augmented Generation?

CAG is a pattern where domain knowledge is pre-loaded into memory and injected into the model's context window as part of the system prompt. In this implementation, all 20 documents are loaded at startup and the most relevant ones are selected per query using keyword scoring, keeping prompts small enough for efficient CPU inference. This approach is simpler than RAG because it requires no vector database, embeddings, or retrieval infrastructure.

### CAG vs RAG at a Glance

- **CAG**: pre-load all documents at startup and select the most relevant ones per query. Simple, no infrastructure, limited by context window.
- **RAG**: retrieve relevant chunks per query using vector similarity search. More complex, but scales to large document collections.

## Running Tests

```bash
npm test
```

Tests use the built-in Node.js test runner (no extra dependencies). They cover configuration and server endpoints.

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start | `npm start` | Start the server (production) |
| Dev | `npm run dev` | Start with auto-restart on file changes |
| Test | `npm test` | Run unit tests |

## Adapting This for Your Own Use Case

This project is a scenario sample: you can fork it and adapt it to any domain:

1. **Replace the documents** in `docs/` with your own `.md` files (product manuals, internal wikis, support articles)
2. **Edit the system prompt** in `src/prompts.js` to match your domain and tone
3. **Force a specific model**: set `FOUNDRY_MODEL=<alias>` as an environment variable, or leave it unset for automatic selection (run `foundry model list` to see available models)
4. **Customise the UI**: the frontend is a single HTML file with inline CSS, easy to modify

## License

MIT: this solution is a scenario sample for learning and experimentation.
