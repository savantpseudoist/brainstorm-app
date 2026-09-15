import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'

export interface Command {
  id: string
  label: string
  hint?: string
  run: () => void
}

export default function CommandPalette({ commands }: { commands: Command[] }): JSX.Element | null {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPalette)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  )

  useEffect(() => {
    setSelected(0)
  }, [query])

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector('.palette-item.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  const run = (cmd?: Command): void => {
    if (!cmd) return
    cmd.run()
    setOpen(false)
  }

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command or brainstorm name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((i) => Math.min(i + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(filtered[selected])
            }
          }}
        />
        <div className="palette-list" ref={listRef}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`palette-item${i === selected ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => run(c)}
            >
              <span className="palette-item-label">{c.label}</span>
              {c.hint && <span className="palette-item-hint">{c.hint}</span>}
            </div>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No matching commands</div>}
        </div>
      </div>
    </div>
  )
}
