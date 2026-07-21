import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import ChatView from './ChatView'
import NotesEditor from './NotesEditor'

type View = 'notes' | 'chat'

export default function CenterPane(): JSX.Element {
  const [view, setView] = useState<View>('notes')
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const active = sessions.find((s) => s.id === activeSessionId) ?? null
  const msgCount = active?.messages.length ?? 0

  return (
    <div className="center-pane">
      <div className="center-tabs">
        <button
          className={`center-tab${view === 'notes' ? ' active' : ''}`}
          onClick={() => setView('notes')}
        >
          Notes
        </button>
        <button
          className={`center-tab${view === 'chat' ? ' active' : ''}`}
          onClick={() => setView('chat')}
        >
          Chat{msgCount > 0 ? ` (${msgCount})` : ''}
        </button>
      </div>
      <div className="center-body">{view === 'notes' ? <NotesEditor /> : <ChatView />}</div>
    </div>
  )
}
