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
  const active = sessions.find((s) => s.id === activeSessionId) ?? null

  if (!active) {
    return <div className="editor-empty muted">No brainstorm selected.</div>
  }

  const recovering = recovery?.sessionId === active.id
  const words = active.messages.length ? wordCount(buildRecoveryTranscript(active.messages)) : 0
  const chunked = words >= RECOVERY_WORD_THRESHOLD
  const progressPct = recovery && recovery.total > 0 ? (recovery.sent / recovery.total) * 100 : 0

  const recover = (): void => {
    if (!active.messages.length) return
    requestRecovery(active.id, buildRecoveryChunks(active.messages))
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <span className="chat-count">
          {active.messages.length} message{active.messages.length === 1 ? '' : 's'} · saved locally
          {active.chatUrl
            ? ' · linked — selecting this brainstorm reopens it in ChatGPT'
            : ' · transcript only (no linked ChatGPT conversation yet)'}
        </span>
        <div className="chat-head-actions">
          {active.messages.length > 0 && (
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
          )}
          {active.messages.length > 0 && (
            <button
              className="chat-clear"
              onClick={() => clearMessages(active.id)}
              disabled={recovering}
              title="Clear transcript"
            >
              Clear
            </button>
          )}
        </div>
      </div>

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
            are recorded here automatically, so they survive after the ChatGPT chat is gone.
          </div>
        ) : (
          active.messages.map((m, i) => (
            <div key={i} className={`chat-msg chat-${m.role}`}>
              <div className="chat-role">{m.role === 'user' ? 'You' : 'ChatGPT'}</div>
              <div className="chat-text">{m.content}</div>
              <div className="chat-time">{new Date(m.timestamp).toLocaleTimeString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
