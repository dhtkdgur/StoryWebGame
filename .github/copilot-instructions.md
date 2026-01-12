<!-- .github/copilot-instructions.md: Guidance for AI coding agents working on StoryWebGame -->
# Copilot instructions — StoryWebGame

Purpose: Help an AI agent be immediately productive modifying and navigating this repo.

- **Big picture**
  - Server: [server/server.js](server/server.js#L1-L200) — Express + Socket.IO, CommonJS. Listens on port 3000 and serves built front-end from `dist`. CORS is configured for Vite dev server (http://localhost:5173).
  - Front-end: Vite + React in `src/` (see [src/main.jsx](src/main.jsx#L1-L20) and [src/App.jsx](src/App.jsx#L1-L200)). A lightweight `client/` folder contains an alternative static `index.html` for quick testing.
  - Build output: server expects production static files in repo root `dist` (server serves `../dist`). During development the Vite dev server (5173) is used.

- **Key integration points & data flows**
  - Real-time communication happens via Socket.IO. Important events are implemented in [server/server.js](server/server.js#L40-L220): `room:create`, `room:join`, `room:leave`, and `room:state` (emitted via `emitRoomState`).
  - Server holds in-memory `rooms` object (no DB). Room shape and usage are defined near the top of `server/server.js` — update server and client together when changing event payloads.
  - `socket.data.roomId` is used to track a socket's room on the server — maintain this convention if adding server-side session data.

- **Developer workflows (discoverable)**
  - Run server (development):

    ```bash
    node server/server.js
    ```

    - This starts the Express + Socket.IO server on port 3000.
  - Front-end dev server (Vite): project uses Vite — run from front-end folder or use `npx vite`.
    - If `client/package.json` lacks scripts, run `npm install` then `npx vite` inside the front-end folder or root depending on where `vite.config.js` is located.
  - Production build: server expects `dist` at repo root. To build front-end so server can serve it, either run the repo-root Vite build or, if building from `client/`, output to `../dist`:

    ```bash
    # from repo root (if vite config is root)
    npx vite build

    # or from client/ when using its vite setup
    cd client && npx vite build --outDir ../dist
    ```

- **Project-specific conventions**
  - Server uses CommonJS (`type: commonjs` in [server/package.json](server/package.json)). Prefer `require()`/`module.exports` or keep changes compatible.
  - Socket ack callbacks are used throughout to return `{ ok: true/false, error?: string }` — follow this pattern when adding new socket endpoints.
  - Room IDs are 5-digit numeric strings (createRoomId) — if changing format update both client validation and server generation.
  - No persistent DB: all room/player state is in-memory and resets on server restart. Avoid assuming persistence for features.

- **When modifying sockets or public API**
  - Update both client event listeners (in `src/`) and server handlers in [server/server.js](server/server.js#L40-L220).
  - Keep payload shapes stable; include migration code or versioned events if you must change the payload shape.

- **Files to review when making changes**
  - [server/server.js](server/server.js)
  - [server/package.json](server/package.json)
  - [client/package.json](client/package.json)
  - [vite.config.js](vite.config.js)
  - [src/main.jsx](src/main.jsx) and [src/App.jsx](src/App.jsx)

- **Examples**
  - To see how room state is emitted and shaped, inspect `getRoomState`, `emitRoomState`, and the `room:create` handler in [server/server.js](server/server.js#L1-L220).

If anything here is incorrect or a workflow is missing (for example specific npm scripts you use locally), tell me which scripts or commands you use and I will update this file accordingly.

---
Please review and tell me what to expand or correct.
