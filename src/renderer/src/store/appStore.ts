import { create } from 'zustand'
import type {
  AppSettings,
  BrainstormSession,
  ChatMessage,
  Idea,
  PendingResponse,
  WorkFolder
} from '@shared/types'

// A pending request to recover a session's conversation. ChatView builds the
// chunks; AIPanel (which owns the webview bridge) picks up the request and runs
// the injection. The nonce lets AIPanel react to repeated requests.
export interface RecoveryRequest {
  sessionId: string
  chunks: string[]
  nonce: number
}

// Live progress of an in-flight recovery, for the progress bar.
export interface RecoveryProgress {
  sessionId: string
  total: number
  sent: number
}

// A request to send a prompt to a specific session's AI panel, raised by the
// notes context menu (Critique/Expand) and consumed by that session's webview.
export interface AiActionRequest {
  sessionId: string
  prompt: string
  nonce: number
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function makeSession(folderId: string, title: string): BrainstormSession {
  const now = Date.now()
  return {
    id: newId('sess'),
    folderId,
    title: title || 'Untitled brainstorm',
    notes: '',
    ideas: [],
    messages: [],
    createdAt: now,
    updatedAt: now
  }
}

// Older persisted sessions may predate a field. Fill in defaults on load so the
// rest of the app can treat every session as fully shaped. A missing folderId
// becomes '' so the load migration can adopt it into a default folder.
function normalizeSession(s: BrainstormSession): BrainstormSession {
  return { ...s, folderId: s.folderId ?? '', ideas: s.ideas ?? [], messages: s.messages ?? [] }
}

interface AppState {
  folders: WorkFolder[]
  activeFolderId: string | null
  folderModalOpen: boolean
  sessions: BrainstormSession[]
  activeSessionId: string | null
  settings: AppSettings
  aiPanelVisible: boolean
  commandPaletteOpen: boolean

  // --- work folders (workspaces) ---
  setFolders: (folders: WorkFolder[]) => void
  createFolder: (name: string) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  openFolder: (id: string) => void
  setFolderModal: (open: boolean) => void

  // AI responses scraped from the ChatGPT panel, awaiting keep/dismiss.
  pendingResponses: PendingResponse[]

  // Conversation recovery (context re-injection).
  recoveryRequest: RecoveryRequest | null
  recovery: RecoveryProgress | null
  requestRecovery: (sessionId: string, chunks: string[]) => void
  clearRecoveryRequest: () => void
  setRecovery: (recovery: RecoveryProgress | null) => void

  // AI action requests from the notes context menu.
  aiActionRequest: AiActionRequest | null
  requestAiAction: (sessionId: string, prompt: string) => void
  clearAiActionRequest: () => void

  // --- session lifecycle ---
  setSessions: (sessions: BrainstormSession[]) => void
  newSession: (title?: string) => void
  selectSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  setNotes: (id: string, notes: string) => void
  addIdea: (id: string, idea: Omit<Idea, 'id' | 'createdAt'>) => void
  removeIdea: (sessionId: string, ideaId: string) => void
  addMessage: (id: string, message: ChatMessage) => void
  clearMessages: (id: string) => void
  setChatUrl: (id: string, chatUrl: string) => void

  // --- ui ---
  setSettings: (s: Partial<AppSettings>) => void
  toggleAiPanel: () => void
  setCommandPalette: (open: boolean) => void

  // --- AI responses ---
  addPendingResponse: (response: PendingResponse) => void
  clearPendingResponse: (id: string) => void
  clearAllPendingResponses: () => void
}

// Mutates the matching session and bumps updatedAt.
function touchSession(
  sessions: BrainstormSession[],
  id: string,
  fn: (s: BrainstormSession) => BrainstormSession
): BrainstormSession[] {
  return sessions.map((s) => (s.id === id ? { ...fn(s), updatedAt: Date.now() } : s))
}

export const useAppStore = create<AppState>((set) => ({
  folders: [],
  activeFolderId: null,
  // Mandatory first view: the folder selector is open until a folder is chosen.
  folderModalOpen: true,
  sessions: [],
  activeSessionId: null,
  settings: { theme: 'dark', fontSize: 14, aiPanelWidth: 420, sidebarWidth: 260 },
  aiPanelVisible: true,
  commandPaletteOpen: false,
  pendingResponses: [],
  recoveryRequest: null,
  recovery: null,
  aiActionRequest: null,

  setFolders: (folders) => set({ folders }),

  createFolder: (name) => {
    const folder: WorkFolder = { id: newId('folder'), name: name.trim() || 'New folder', createdAt: Date.now() }
    set((state) => ({ folders: [...state.folders, folder] }))
    return folder.id
  },

  renameFolder: (id, name) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f))
    })),

  deleteFolder: (id) =>
    set((state) => {
      const folders = state.folders.filter((f) => f.id !== id)
      // Remove the folder's brainstorms with it.
      const sessions = state.sessions.filter((s) => s.folderId !== id)
      const wasActive = state.activeFolderId === id
      return {
        folders,
        sessions,
        activeFolderId: wasActive ? null : state.activeFolderId,
        activeSessionId: wasActive ? null : state.activeSessionId,
        // Deleting the open folder drops the user back to the selector.
        folderModalOpen: wasActive ? true : state.folderModalOpen
      }
    }),

  // Load a folder: close the modal and scope the main view to it.
  openFolder: (id) =>
    set((state) => {
      const first = state.sessions.find((s) => s.folderId === id) ?? null
      return { activeFolderId: id, folderModalOpen: false, activeSessionId: first?.id ?? null }
    }),

  setFolderModal: (open) => set({ folderModalOpen: open }),

  setSessions: (sessions) => set({ sessions: sessions.map(normalizeSession) }),

  newSession: (title) =>
    set((state) => {
      if (!state.activeFolderId) return state
      const session = makeSession(state.activeFolderId, title ?? '')
      return { sessions: [session, ...state.sessions], activeSessionId: session.id }
    }),

  selectSession: (id) => set({ activeSessionId: id }),

  deleteSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id)
      let activeSessionId = state.activeSessionId
      if (activeSessionId === id) {
        // Fall back to another session in the same folder, not a global one.
        activeSessionId = sessions.find((s) => s.folderId === state.activeFolderId)?.id ?? null
      }
      return { sessions, activeSessionId }
    }),

  renameSession: (id, title) =>
    set((state) => ({ sessions: touchSession(state.sessions, id, (s) => ({ ...s, title })) })),

  setNotes: (id, notes) =>
    set((state) => ({ sessions: touchSession(state.sessions, id, (s) => ({ ...s, notes })) })),

  addIdea: (id, idea) =>
    set((state) => ({
      sessions: touchSession(state.sessions, id, (s) => ({
        ...s,
        ideas: [...s.ideas, { ...idea, id: newId('idea'), createdAt: Date.now() }]
      }))
    })),

  removeIdea: (sessionId, ideaId) =>
    set((state) => ({
      sessions: touchSession(state.sessions, sessionId, (s) => ({
        ...s,
        ideas: s.ideas.filter((i) => i.id !== ideaId)
      }))
    })),

  addMessage: (id, message) =>
    set((state) => ({
      sessions: touchSession(state.sessions, id, (s) => ({
        ...s,
        messages: [...s.messages, message]
      }))
    })),

  clearMessages: (id) =>
    set((state) => ({ sessions: touchSession(state.sessions, id, (s) => ({ ...s, messages: [] })) })),

  // Records the conversation URL. Does NOT bump updatedAt — a URL capture is
  // bookkeeping, not user activity, and shouldn't reorder the session list.
  setChatUrl: (id, chatUrl) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, chatUrl } : s))
    })),

  setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
  toggleAiPanel: () => set((state) => ({ aiPanelVisible: !state.aiPanelVisible })),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),

  addPendingResponse: (response) =>
    set((state) => ({ pendingResponses: [...state.pendingResponses, response] })),
  clearPendingResponse: (id) =>
    set((state) => ({ pendingResponses: state.pendingResponses.filter((r) => r.id !== id) })),
  clearAllPendingResponses: () => set({ pendingResponses: [] }),

  requestRecovery: (sessionId, chunks) =>
    set({ recoveryRequest: { sessionId, chunks, nonce: Date.now() } }),
  clearRecoveryRequest: () => set({ recoveryRequest: null }),
  setRecovery: (recovery) => set({ recovery }),

  requestAiAction: (sessionId, prompt) =>
    set({ aiActionRequest: { sessionId, prompt, nonce: Date.now() } }),
  clearAiActionRequest: () => set({ aiActionRequest: null })
}))
