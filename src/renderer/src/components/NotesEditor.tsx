import { useEffect, useRef, useState } from 'react'
import type { Idea } from '@shared/types'
import { buildSelectionPrompt } from '../lib/prompt'
import { useAppStore } from '../store/appStore'

interface MenuState {
  x: number
  y: number
  selection: string
}

// A single collapsible idea. Starts collapsed to a one-line preview so long
// ideas don't dominate the pane; click the header to expand.
function IdeaCard({ idea, onRemove }: { idea: Idea; onRemove: () => void }): JSX.Element {
  const [collapsed, setCollapsed] = useState(true)
  const firstLine = idea.text.trim().split('\n')[0]

  return (
    <div className={`idea-card idea-${idea.source}${collapsed ? ' collapsed' : ''}`}>
      <div className="idea-head" onClick={() => setCollapsed((c) => !c)}>
        <span className="idea-caret">{collapsed ? '▸' : '▾'}</span>
        <span className="idea-source">{idea.source === 'ai' ? 'AI' : 'Me'}</span>
        <span className="idea-preview">{firstLine}</span>
        <button
          className="idea-del"
          title="Remove idea"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      </div>
      {!collapsed && <div className="idea-text">{idea.text}</div>}
    </div>
  )
}

export default function NotesEditor(): JSX.Element {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setNotes = useAppStore((s) => s.setNotes)
  const renameSession = useAppStore((s) => s.renameSession)
  const removeIdea = useAppStore((s) => s.removeIdea)
  const newSession = useAppStore((s) => s.newSession)
  const requestAiAction = useAppStore((s) => s.requestAiAction)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)

  const active = sessions.find((s) => s.id === activeSessionId) ?? null

  // Close the context menu on any outside interaction / scroll / Escape.
  useEffect(() => {
    if (!menu) return
    const close = (): void => setMenu(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const openMenu = (e: React.MouseEvent<HTMLTextAreaElement>): void => {
    e.preventDefault()
    const ta = textareaRef.current
    const selection = ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : ''
    setMenu({ x: e.clientX, y: e.clientY, selection })
  }

  const exec = (command: string): void => {
    textareaRef.current?.focus()
    document.execCommand(command)
    setMenu(null)
  }

  const aiAction = (kind: 'critique' | 'expand'): void => {
    if (!menu?.selection.trim() || !active) return
    requestAiAction(active.id, buildSelectionPrompt(kind, menu.selection))
    setMenu(null)
  }

  if (!active) {
    return (
      <div className="editor-empty">
        <div>
          <h1>Nothing to brainstorm yet</h1>
          <p className="muted">Create a brainstorm from the sidebar to get started.</p>
          <button className="btn-primary" onClick={() => newSession()} style={{ marginTop: 12 }}>
            New brainstorm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="notes">
      <input
        className="notes-title"
        value={active.title}
        placeholder="Brainstorm title…"
        onChange={(e) => renameSession(active.id, e.target.value)}
      />
      <textarea
        ref={textareaRef}
        className="notes-body"
        value={active.notes}
        placeholder="Jot down your thoughts, or ask the AI panel to generate ideas and send them here…"
        onChange={(e) => setNotes(active.id, e.target.value)}
        onContextMenu={openMenu}
      />

      {menu && (
        <div
          className="ctx-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="ctx-menu-item" onClick={() => exec('cut')} disabled={!menu.selection}>
            Cut
          </button>
          <button className="ctx-menu-item" onClick={() => exec('copy')} disabled={!menu.selection}>
            Copy
          </button>
          <button className="ctx-menu-item" onClick={() => exec('paste')}>
            Paste
          </button>
          <button className="ctx-menu-item" onClick={() => exec('selectAll')}>
            Select All
          </button>
          <div className="ctx-menu-sep" />
          <button
            className="ctx-menu-item ai"
            onClick={() => aiAction('critique')}
            disabled={!menu.selection.trim()}
          >
            Critique
          </button>
          <button
            className="ctx-menu-item ai"
            onClick={() => aiAction('expand')}
            disabled={!menu.selection.trim()}
          >
            Expand
          </button>
        </div>
      )}

      {active.ideas.length > 0 && (
        <div className="ideas">
          <div className="ideas-header">Captured ideas ({active.ideas.length})</div>
          <div className="ideas-list">
            {active.ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onRemove={() => removeIdea(active.id, idea.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
