import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/appStore'

export default function TopBar(): JSX.Element {
  const [fileOpen, setFileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const setFolderModal = useAppStore((s) => s.setFolderModal)
  const newSession = useAppStore((s) => s.newSession)
  const activeFolderId = useAppStore((s) => s.activeFolderId)
  const folders = useAppStore((s) => s.folders)
  const aiPanelVisible = useAppStore((s) => s.aiPanelVisible)
  const toggleAiPanel = useAppStore((s) => s.toggleAiPanel)
  const theme = useAppStore((s) => s.settings.theme)
  const setSettings = useAppStore((s) => s.setSettings)
  const setCommandPalette = useAppStore((s) => s.setCommandPalette)

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null

  // Close the File menu on any outside click.
  useEffect(() => {
    if (!fileOpen) return
    const onDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [fileOpen])

  return (
    <div className="topbar">
      <div className="topbar-menu" ref={menuRef}>
        <button className="topbar-item" onClick={() => setFileOpen((o) => !o)}>
          File
        </button>
        {fileOpen && (
          <div className="topbar-dropdown">
            <button
              className="topbar-dropdown-item"
              onClick={() => {
                setFileOpen(false)
                setFolderModal(true)
              }}
            >
              work
            </button>
            <button
              className="topbar-dropdown-item"
              disabled={!activeFolderId}
              onClick={() => {
                setFileOpen(false)
                newSession()
              }}
            >
              New brainstorm
            </button>
          </div>
        )}
      </div>

      <div className="topbar-title">
        {activeFolder ? activeFolder.name : 'Brainstorm'}
      </div>

      <div className="topbar-spacer" />

      <button
        className="topbar-icon-btn"
        onClick={() => setCommandPalette(true)}
        title="Command palette (Ctrl+Shift+P)"
      >
        ⌘
      </button>
      <button
        className="topbar-icon-btn"
        onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button
        className={`topbar-door${aiPanelVisible ? ' open' : ''}`}
        onClick={toggleAiPanel}
        title={aiPanelVisible ? 'Close AI panel' : 'Open AI panel'}
      >
        🚪
      </button>
    </div>
  )
}
