import { useCallback, useEffect, useRef, useState } from 'react'
import type { AIAction } from '@shared/types'
import SessionChat from './SessionChat'
import { buildBrainstormPrompt } from '../lib/prompt'
import { useAppStore } from '../store/appStore'

const QUICK_ACTIONS: { action: AIAction; label: string; title: string }[] = [
  { action: 'brainstorm', label: '💡 Brainstorm', title: 'Generate fresh ideas around this topic' },
  { action: 'expand', label: '➕ Expand notes', title: 'Expand on the most promising directions in your notes' },
  { action: 'critique', label: '🔍 Critique', title: "Play devil's advocate on your notes" },
  { action: 'ask', label: '💬 Send notes', title: 'Send your current notes to ChatGPT as context' }
]

export default function AIPanel(): JSX.Element {
  const [toast, setToast] = useState<string | null>(null)
  const [preloadPath, setPreloadPath] = useState<string | null>(null)
  const [visited, setVisited] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const requestAiAction = useAppStore((s) => s.requestAiAction)

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

  const sendFreeform = useCallback((): void => {
    const text = prompt.trim()
    if (!text || !active) return
    requestAiAction(active.id, text)
    setPrompt('')
    flash('Sent to ChatGPT')
  }, [prompt, active, requestAiAction, flash])

  const runQuickAction = useCallback(
    (action: AIAction): void => {
      if (!active) return
      const built = buildBrainstormPrompt({
        topic: active.title,
        notes: active.notes,
        action
      })
      requestAiAction(active.id, built)
      flash(`Sent: ${action}`)
    },
    [active, requestAiAction, flash]
  )

  const existingIds = new Set(sessions.map((s) => s.id))
  const mountedIds = visited.filter((id) => existingIds.has(id))

  return (
    <div className="ai-panel">
      <div className="ai-toolbar">
        <span className="ai-title">AI · {active ? active.title : 'no brainstorm'}</span>
      </div>

      {active && (
        <div className="ai-quickbar">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.action}
              className="ai-quick-btn"
              title={q.title}
              disabled={q.action !== 'brainstorm' && !active.notes.trim()}
              onClick={() => runQuickAction(q.action)}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

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

      {active && (
        <div className="ai-composer">
          <textarea
            ref={inputRef}
            className="ai-composer-input"
            value={prompt}
            placeholder="Ask ChatGPT…  (Enter to send, Shift+Enter for newline)"
            rows={2}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendFreeform()
              }
            }}
          />
          <button
            className="ai-composer-send"
            onClick={sendFreeform}
            disabled={!prompt.trim()}
            title="Send to ChatGPT (Enter)"
          >
            ➤
          </button>
        </div>
      )}

      <div className="ai-footnote">
        Highlight text in the notes and right-click for Critique / Expand, or use the buttons above.
      </div>
    </div>
  )
}
