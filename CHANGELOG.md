# Changelog

All notable changes to the Gas Field Support Agent project will be documented in this file.

## [2.0.0] - 2026-03-13

### Added
- **Responsive mobile layout** – Quick-action buttons now wrap into rows on small screens instead of horizontal scrolling; header and controls stack properly on mobile viewports.
- **Document chunking** – `context.js` now chunks large documents for improved context selection, with configurable chunk size and overlap.
- **Query-time document selection** – Chat engine selects the most relevant documents at query time rather than loading all docs into the prompt.
- **Auto model selection** – Server automatically selects the best available Foundry Local model for the device hardware.
- **Edge Mode toggle** – UI toggle to switch between full and compact (edge) model modes.
- **Compact mode** – `chatEngine.js` supports a compact prompt path for resource-constrained devices.
- **Unit tests** – Added `chunker.test.js` for document chunking and updated `config.test.js`.
- **Blog post** – Added `blog_post.md` with project overview and technical walkthrough.
- **Updated screenshots** – Refreshed all UI screenshots in desktop (1920×1080) and mobile (390×844) views.
- **Architecture diagram** – Added detailed architecture diagram (`07-architecture-diagram.png`).

### Changed
- `src/context.js` – Rewritten to support chunked document storage and similarity-based retrieval.
- `src/chatEngine.js` – Refactored prompt construction to support compact mode and dynamic context injection.
- `src/server.js` – Updated initialisation flow with model auto-selection and improved error handling.
- `public/index.html` – Improved responsive CSS for mobile breakpoints; fixed quick-action button layout.

### Fixed
- Quick-action buttons no longer overflow horizontally on mobile; they wrap into multiple rows.
- Header controls (Edge Mode toggle, status badge) now stack correctly on narrow screens.

## [1.0.0] - 2025-01-01

### Added
- Initial release of the Gas Field Support Agent.
- Offline CAG-powered chat interface using Foundry Local.
- 20 domain knowledge documents covering gas leak detection, fault diagnosis, PPE, pressure testing, and more.
- Quick-action buttons for common field queries.
- Express server with streaming chat API (`/api/chat/stream`).
- Loading overlay with initialisation progress steps.
