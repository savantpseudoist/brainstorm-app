import Store from 'electron-store'
import type { BrainstormSession, StoreShape } from '@shared/types'

// Local persistence layer. Holds work folders, brainstorm sessions and settings.

const store = new Store<StoreShape>({
  name: 'brainstorm-app',
  defaults: {
    folders: [],
    sessions: [],
    settings: {
      theme: 'dark',
      fontSize: 14,
      aiPanelWidth: 420,
      sidebarWidth: 260
    }
  }
})

export function getKey<K extends keyof StoreShape>(key: K): StoreShape[K] {
  return store.get(key)
}

export function setKey<K extends keyof StoreShape>(key: K, value: StoreShape[K]): void {
  store.set(key, value)
}

export function createSession(folderId: string, title: string): BrainstormSession {
  const sessions = store.get('sessions')
  const session: BrainstormSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    folderId,
    title,
    notes: '',
    ideas: [],
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  sessions.unshift(session)
  store.set('sessions', sessions)
  return session
}
