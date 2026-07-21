import { useAppStore } from '../store/appStore'

export default function SessionList({ width }: { width: number }): JSX.Element {
  const allSessions = useAppStore((s) => s.sessions)
  const activeFolderId = useAppStore((s) => s.activeFolderId)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const newSession = useAppStore((s) => s.newSession)
  const selectSession = useAppStore((s) => s.selectSession)
  const deleteSession = useAppStore((s) => s.deleteSession)

  // Only brainstorms in the loaded work folder.
  const sessions = allSessions.filter((s) => s.folderId === activeFolderId)

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-header">
        <span className="app-logo" aria-hidden="true">
          {/* Notepad logo */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="3" width="15" height="18" rx="2" fill="#d7ba7d" />
            <rect x="4" y="3" width="15" height="4" rx="2" fill="#c9a95f" />
            <line x1="8" y1="10" x2="15" y2="10" stroke="#5a4a1f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="8" y1="13" x2="15" y2="13" stroke="#5a4a1f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="8" y1="16" x2="13" y2="16" stroke="#5a4a1f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="#8a7333" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="12" y1="2" x2="12" y2="6" stroke="#8a7333" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="#8a7333" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>Brainstorms</span>
        </span>
        <button onClick={() => newSession()} title="New brainstorm (Ctrl+N)">
          ＋
        </button>
      </div>
      <div className="session-list">
        {sessions.length === 0 && (
          <div className="tree-empty">No brainstorms yet. Hit ＋ to start.</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-row${s.id === activeSessionId ? ' active' : ''}`}
            onClick={() => selectSession(s.id)}
            title={s.title}
          >
            <div className="session-main">
              <div className="session-title">{s.title || 'Untitled brainstorm'}</div>
              <div className="session-meta">
                {s.ideas.length} idea{s.ideas.length === 1 ? '' : 's'} ·{' '}
                {new Date(s.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <button
              className="session-del"
              title="Delete brainstorm"
              onClick={(e) => {
                e.stopPropagation()
                deleteSession(s.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
