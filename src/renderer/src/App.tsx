import { useCallback, useEffect, useRef, useState } from 'react'
import type { BrainstormSession, WorkFolder } from '@shared/types'
import AIPanel from './components/AIPanel'
import CenterPane from './components/CenterPane'
import CommandPalette, { type Command } from './components/CommandPalette'
import SessionList from './components/SessionList'
import StatusBar from './components/StatusBar'
import TopBar from './components/TopBar'
import WorkFolderModal from './components/WorkFolderModal'
import { useAppStore } from './store/appStore'

export default function App(): JSX.Element {
  const aiPanelVisible = useAppStore((s) => s.aiPanelVisible)
  const settings = useAppStore((s) => s.settings)
  const [aiWidth, setAiWidth] = useState(settings.aiPanelWidth)
  const [sidebarWidth, setSidebarWidth] = useState(settings.sidebarWidth)
  const [dragging, setDragging] = useState<null | 'ai' | 'sidebar'>(null)
  const loadedRef = useRef(false)

  // Latest widths for the drag-end persist (the drag effect only depends on
  // `dragging`, so its mouseup closure would otherwise capture stale widths).
  const aiWidthRef = useRef(aiWidth)
  aiWidthRef.current = aiWidth
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth

  // Load persisted settings + folders + sessions once on boot, migrating any
  // pre-Workspace sessions into a default folder so nothing is orphaned.
  useEffect(() => {
    Promise.all([
      window.api.storeGet('settings'),
      window.api.storeGet('folders'),
      window.api.storeGet('sessions')
    ]).then(([s, folders, sessions]) => {
      if (s) {
        useAppStore.getState().setSettings(s)
        setAiWidth(s.aiPanelWidth)
        setSidebarWidth(s.sidebarWidth ?? 260)
      }

      let folderList: WorkFolder[] = folders ?? []
      let sessionList: BrainstormSession[] = sessions ?? []

      const folderIds = new Set(folderList.map((f) => f.id))
      const orphans = sessionList.filter((x) => !x.folderId || !folderIds.has(x.folderId))
      if (orphans.length > 0) {
        let def = folderList[0]
        if (!def) {
          def = { id: `folder_${Date.now()}`, name: 'My Workspace', createdAt: Date.now() }
          folderList = [def]
        }
        sessionList = sessionList.map((x) =>
          !x.folderId || !folderIds.has(x.folderId) ? { ...x, folderId: def.id } : x
        )
      }

      useAppStore.getState().setFolders(folderList)
      useAppStore.getState().setSessions(sessionList)
      loadedRef.current = true
    })
  }, [])

  // Persist folders + sessions whenever they change (after the initial load).
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (!loadedRef.current) return
      if (state.sessions !== prev.sessions) window.api.storeSet('sessions', state.sessions)
      if (state.folders !== prev.folders) window.api.storeSet('folders', state.folders)
      if (state.settings !== prev.settings) window.api.storeSet('settings', state.settings)
    })
    return unsub
  }, [])

  const sessions = useAppStore((s) => s.sessions)
  const activeFolderId = useAppStore((s) => s.activeFolderId)

  const newSession = useCallback(() => useAppStore.getState().newSession(), [])
  const toggleAi = useCallback(() => useAppStore.getState().toggleAiPanel(), [])

  const commands: Command[] = [
    { id: 'new-session', label: 'Brainstorm: New', hint: 'Ctrl+N', run: newSession },
    { id: 'toggle-ai', label: 'View: Toggle AI Panel', run: toggleAi },
    {
      id: 'toggle-theme',
      label: 'View: Toggle Light / Dark Theme',
      run: () => {
        const st = useAppStore.getState()
        st.setSettings({ theme: st.settings.theme === 'dark' ? 'light' : 'dark' })
      }
    },
    {
      id: 'open-workspaces',
      label: 'Workspace: Open Folder Selector',
      run: () => useAppStore.getState().setFolderModal(true)
    },
    {
      id: 'consolidate',
      label: 'Notes: Consolidate with AI',
      run: () => {
        const st = useAppStore.getState()
        if (st.activeSessionId) st.startConsolidation(st.activeSessionId)
      }
    },
    ...sessions
      .filter((s) => s.folderId === activeFolderId)
      .map((s) => ({
        id: `goto-${s.id}`,
        label: `Go to: ${s.title || 'Untitled brainstorm'}`,
        hint: `${s.ideas.length} ideas`,
        run: () => useAppStore.getState().selectSession(s.id)
      }))
  ]

  // Native menu actions from the main process.
  useEffect(() => {
    const dispose = window.api.onMenuAction((action) => {
      switch (action) {
        case 'new-session':
          newSession()
          break
        case 'toggle-ai':
          toggleAi()
          break
        default:
          break
      }
    })
    return dispose
  }, [newSession, toggleAi])

  // In-renderer keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      const target = e.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName)
      if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        useAppStore.getState().setCommandPalette(true)
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === 'n' && !typing) {
        e.preventDefault()
        newSession()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newSession])

  // Pane resizing. A single listener pair is attached to window while a handle
  // is active, and a full-window overlay (rendered below) sits above the
  // <webview> so mousemove/mouseup keep firing even when the cursor is dragged
  // over the embedded ChatGPT page — the previous version lost the drag there.
  const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent): void => {
      if (dragging === 'ai') {
        setAiWidth(clamp(window.innerWidth - e.clientX, 280, 900))
      } else {
        setSidebarWidth(clamp(e.clientX, 160, 560))
      }
    }
    const onUp = (): void => {
      setDragging(null)
      const settingsNow = {
        ...useAppStore.getState().settings,
        aiPanelWidth: aiWidthRef.current,
        sidebarWidth: sidebarWidthRef.current
      }
      useAppStore.getState().setSettings(settingsNow)
      window.api.storeSet('settings', settingsNow)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  return (
    <div className={`app theme-${settings.theme}${dragging ? ' dragging' : ''}`}>
      <TopBar />
      <div className="main-row">
        <SessionList width={sidebarWidth} />
        <div className="resize-handle" onMouseDown={() => setDragging('sidebar')} />
        <div className="editor-col">
          <CenterPane />
        </div>
        {aiPanelVisible && (
          <div className="resize-handle" onMouseDown={() => setDragging('ai')} />
        )}
        {/* The AI panel stays mounted even when closed so per-note webviews keep
            their state; the door button just hides it via CSS. */}
        <div
          className={`ai-col${aiPanelVisible ? '' : ' hidden'}`}
          style={{ width: aiPanelVisible ? aiWidth : 0 }}
        >
          <AIPanel />
        </div>
      </div>
      {dragging && <div className="drag-overlay" />}
      <StatusBar />
      <CommandPalette commands={commands} />
      <WorkFolderModal />
    </div>
  )
}
