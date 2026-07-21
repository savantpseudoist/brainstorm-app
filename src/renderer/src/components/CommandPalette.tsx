import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'

export interface Command {
  id: string
  label: string
  run: () => void
}

export default function CommandPalette({ commands }: { commands: Command[] }): JSX.Element | null {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPalette)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  )

  if (!open) return null

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && filtered[0]) {
              filtered[0].run()
              setOpen(false)
            }
          }}
        />
        <div className="palette-list">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="palette-item"
              onClick={() => {
                c.run()
                setOpen(false)
              }}
            >
              {c.label}
            </div>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No matching commands</div>}
        </div>
      </div>
    </div>
  )
}
