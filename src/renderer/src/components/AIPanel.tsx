import { useCallback, useEffect, useState } from 'react'
import SessionChat from './SessionChat'
import { useAppStore } from '../store/appStore'

export default function AIPanel(): JSX.Element {
  const [toast, setToast] = useState<string | null>(null)
  const [preloadPath, setPreloadPath] = useState<string | null>(null)
  const [inboundCollapsed, setInboundCollapsed] = useState(false)
  const [visited, setVisited] = useState<string[]>([])

  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setNotes = useAppStore((s) => s.setNotes)
  const addIdea = useAppStore((s) => s.addIdea)
  const pendingResponses = useAppStore((s) => s.pendingResponses)
  const clearPendingResponse = useAppStore((s) => s.clearPendingResponse)
  const clearAllPendingResponses = useAppStore((s) => s.clearAllPendingResponses)

  const active = sessions.find((s) => s.id === activeSessionId) ?? null

  // Resolve absolute preload file URL for webview injection.
  useEffect(() => {
    window.api.getPreloadPath('chatgpt.js').then(setPreloadPath)
  }, [])

  // Keep every visited session's panel mounted (alive) so switching is instant.
  useEffect(() => {
    if (activeSessionId) {
      setVisited((v) => (v.includes(activeSessionId) ? v : [...v, activeSessionId]))
    }
  }, [activeSessionId])

  const flash = useCallback((msg: string): void => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  const appendToNotes = (responseId: string, text: string): void => {
    if (!active) return
    const next = active.notes ? `${active.notes}\n\n${text}` : text
    setNotes(active.id, next)
    clearPendingResponse(responseId)
    flash('Added to notes')
  }

  const saveAsIdea = (responseId: string, text: string): void => {
    if (!active) return
    addIdea(active.id, { text: text.trim(), source: 'ai' })
    clearPendingResponse(responseId)
    flash('Saved as idea')
  }

  const existingIds = new Set(sessions.map((s) => s.id))
  const mountedIds = visited.filter((id) => existingIds.has(id))

  return (
    <div className="ai-panel">
      <div className="ai-toolbar">
        <span className="ai-title">AI · {active ? active.title : 'no brainstorm'}</span>
      </div>

      <div className="ai-webview-wrap">
        {preloadPath && mountedIds.length > 0 ? (
          mountedIds.map((id) => {
            const s = sessions.find((x) => x.id === id)!
            return (
              <SessionChat
                key={id}
                session={s}
                isActive={id === activeSessionId}
                preloadPath={preloadPath}
                onToast={flash}
              />
            )
          })
        ) : (
          <div className="ai-loading">
            {active ? 'Loading AI panel…' : 'Select or create a brainstorm.'}
          </div>
        )}
        {toast && <div className="ai-toast">{toast}</div>}
      </div>

      {pendingResponses.length > 0 && (
        <div className="ai-inbound">
          <div className="ai-inbound-head">
            <button
              className="ai-inbound-toggle"
              onClick={() => setInboundCollapsed((c) => !c)}
              title={inboundCollapsed ? 'Expand' : 'Minimize'}
            >
              {inboundCollapsed ? '▸' : '▾'}
            </button>
            <span>Received responses ({pendingResponses.length})</span>
            <button
              className="ai-inbound-clear"
              onClick={() => clearAllPendingResponses()}
              title="Dismiss all"
            >
              Clear all
            </button>
          </div>
          {!inboundCollapsed &&
            pendingResponses.map((response) => (
              <div key={response.id} className="ai-response">
                <div className="ai-response-head">
                  <span className="ai-response-time">
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </span>
                  <button
                    className="ai-response-dismiss"
                    onClick={() => clearPendingResponse(response.id)}
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
                <div className="ai-response-text">{response.content.slice(0, 400)}</div>
                <div className="ai-response-actions">
                  <button onClick={() => appendToNotes(response.id, response.content)}>
                    Add to notes
                  </button>
                  <button onClick={() => saveAsIdea(response.id, response.content)}>
                    Save as idea
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="ai-footnote">
        Each brainstorm keeps its own ChatGPT panel. Highlight text in the notes and right-click for
        Critique / Expand.
      </div>
    </div>
  )
}
