import { useAppStore } from '../store/appStore'

export default function StatusBar(): JSX.Element {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const active = sessions.find((s) => s.id === activeSessionId) ?? null

  const words = active?.notes.trim() ? active.notes.trim().split(/\s+/).length : 0

  return (
    <div className="statusbar">
      <span>{sessions.length} brainstorm{sessions.length === 1 ? '' : 's'}</span>
      <span className="spacer" />
      {active && (
        <>
          <span>{active.ideas.length} ideas</span>
          <span>{words} words</span>
        </>
      )}
      <span>Ctrl+Shift+P · commands</span>
    </div>
  )
}
