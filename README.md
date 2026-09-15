# Brainstorm

An Electron desktop app for brainstorming with an embedded ChatGPT panel and a notes/outline surface. Write ideas, capture AI responses, and organize your thoughts in workspaces.

## Features

- **Embedded ChatGPT panel** — brainstorm, expand, critique, or ask freeform questions without leaving the app
- **Rich notes editor** — write and organize your ideas in a markdown-friendly surface
- **Workspaces** — group brainstorming sessions into folders
- **Quick actions** — one-click Brainstorm, Expand, Critique, and Send Notes buttons
- **Context menu** — highlight text in notes to critique or expand a selection
- **Captured ideas** — save AI responses as persistent ideas that survive across sessions
- **Consolidation** — merge scattered notes into a structured outline with AI help
- **Command palette** — keyboard-driven navigation (Ctrl+Shift+P)
- **Resizable panes** — drag to resize sidebar, editor, and AI panel
- **Dark / Light themes** — toggle from the toolbar or command palette
- **Persistent storage** — sessions and settings are saved automatically via electron-store
- **Cross-platform** — builds for macOS, Windows, and Linux

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm or pnpm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Type Check

```bash
npm run typecheck
```

### Build

```bash
# Package for your platform
npm run dist          # all platforms
npm run dist:mac      # macOS
npm run dist:win      # Windows
npm run dist:linux    # Linux
```

## Tech Stack

- **Electron 31** with [electron-vite](https://electron-vite.org/)
- **React 18** (TypeScript)
- **Zustand** for state management
- **electron-store** for persistence
- **react-markdown** + remark-gfm for rendering captured AI responses

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New brainstorm |
| Ctrl+Shift+P | Command palette |
| Enter (in AI composer) | Send prompt to ChatGPT |
| Shift+Enter (in AI composer) | New line in prompt |

## Project Structure

```
src/
  main/           Electron main process (window, IPC, store)
  preload/        Context bridge & ChatGPT webview injection
  renderer/       React UI (components, store, styles)
  shared/         Types shared between main and renderer
resources/        App icons
```

## License

MIT
