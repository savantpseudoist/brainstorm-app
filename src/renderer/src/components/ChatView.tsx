import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store/appStore'
import {
  buildRecoveryChunks,
  buildRecoveryTranscript,
  RECOVERY_WORD_THRESHOLD,
  wordCount
} from '../lib/recovery'

export default function ChatView(): JSX.Element {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const clearMessages = useAppStore((s) => s.clearMessages)
  const requestRecovery = useAppStore((s) => s.requestRecovery)
  const recovery = useAppStore((s) => s.recovery)
  const setNotes = useAppStore((s) => s.setNotes)
  const addIdea = useAppStore((s) => s.addIdea)

  const active = sessions.find((s) => s.id === activeSessionId) ?? null

  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  if (!active) {
    return <div className="editor-empty muted">No brainstorm selected.</div>
  }

  const flash = (msg: string): void => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2500)
  }

  const recovering = recovery?.sessionId === active.id
  const words = active.messages.length ? wordCount(buildRecoveryTranscript(active.messages)) : 0
  const chunked = words >= RECOVERY_WORD_THRESHOLD
  const progressPct = recovery && recovery.total > 0 ? (recovery.sent / recovery.total) * 100 : 0

  const recover = (): void => {
    if (!active.messages.length) return
    requestRecovery(active.id, buildRecoveryChunks(active.messages))
  }

  const toggleBookmarkMessage = useAppStore((s) => s.toggleBookmarkMessage)

  const toggleExpand = (index: number): void => {
    setExpandedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const expandAll = (): void => {
    setExpandedIndices(new Set(active.messages.map((_, i) => i)))
  }

  const collapseAll = (): void => {
    setExpandedIndices(new Set())
  }

  const copyRawMarkdown = (text: string): void => {
    void window.api.copyToClipboard(text)
    flash('Copied raw Markdown to clipboard')
  }

  const appendRawToNotes = (text: string): void => {
    const next = active.notes ? `${active.notes}\n\n${text}` : text
    setNotes(active.id, next)
    flash('Appended raw Markdown to notes')
  }

  const saveMessageAsIdea = (text: string): void => {
    // Idea card takes first non-empty line as concise title preview
    const cleanText = text.replace(/^#+\s+/gm, '').trim()
    addIdea(active.id, { text: cleanText, source: 'ai' })
    flash('Saved as idea')
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <span className="chat-count">
          {active.messages.length} message{active.messages.length === 1 ? '' : 's'} · saved locally
          {active.messages.some((m) => m.bookmarked)
            ? ` (${active.messages.filter((m) => m.bookmarked).length} bookmarked)`
            : ''}
        </span>
        <div className="chat-head-actions">
          {active.messages.length > 0 && (
            <>
              <button
                className="chat-toggle-all"
                onClick={expandedIndices.size === active.messages.length ? collapseAll : expandAll}
                title="Toggle all messages expanded/collapsed"
              >
                {expandedIndices.size === active.messages.length ? 'Collapse All' : 'Expand All'}
              </button>
              <button
                className="chat-recover"
                onClick={recover}
                disabled={recovering}
                title={
                  chunked
                    ? `Long transcript (~${words} words) — will be re-injected in chunks`
                    : 'Re-inject this conversation into a fresh ChatGPT chat'
                }
              >
                {recovering ? 'Recovering…' : 'Recover convo'}
              </button>
              <button
                className="chat-clear"
                onClick={() => clearMessages(active.id)}
                disabled={recovering}
                title="Clear transcript"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {toast && <div className="ai-toast">{toast}</div>}

      {recovering && (
        <div className="recovery-bar">
          <div className="recovery-bar-label">
            Re-injecting context into a fresh chat — chunk {recovery?.sent} of {recovery?.total}
          </div>
          <div className="recovery-track">
            <div className="recovery-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="chat-body">
        {active.messages.length === 0 ? (
          <div className="chat-empty">
            No saved messages yet. Prompts you send from the AI panel and the replies that come back
            are recorded here automatically.
          </div>
        ) : (
          active.messages.map((m, i) => {
            const isExpanded = expandedIndices.has(i)
            const firstLine = m.content.trim().split('\n')[0].slice(0, 100)

            return (
              <div
                key={i}
                className={`chat-msg chat-${m.role}${m.bookmarked ? ' bookmarked' : ''}${
                  isExpanded ? ' expanded' : ' collapsed'
                }`}
              >
                <div className="chat-msg-header" onClick={() => toggleExpand(i)}>
                  <div className="chat-msg-header-left">
                    <span className="chat-caret">{isExpanded ? '▾' : '▸'}</span>
                    <span className="chat-role">{m.role === 'user' ? 'You' : 'ChatGPT'}</span>
                    {!isExpanded && <span className="chat-preview">{firstLine}</span>}
                  </div>
                  <div className="chat-msg-header-right" onClick={(e) => e.stopPropagation()}>
                    <span className="chat-time">{new Date(m.timestamp).toLocaleTimeString()}</span>
                    <button
                      className={`chat-bookmark-btn${m.bookmarked ? ' active' : ''}`}
                      title={m.bookmarked ? 'Remove bookmark' : 'Bookmark message for priority recovery'}
                      onClick={() => toggleBookmarkMessage(active.id, i)}
                    >
                      {m.bookmarked ? '📌' : '📍'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="chat-text markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>

                    <div className="chat-turn-toolbar">
                      <button onClick={() => copyRawMarkdown(m.content)} title="Copy exact raw Markdown text">
                        📋 Copy Raw
                      </button>
                      <button onClick={() => appendRawToNotes(m.content)} title="Append raw Markdown to notes">
                        📝 Add to Notes
                      </button>
                      <button onClick={() => saveMessageAsIdea(m.content)} title="Save as single-line Idea">
                        💡 Save Idea
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
