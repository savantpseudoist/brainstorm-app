import { useState } from 'react'
import { useAppStore } from '../store/appStore'

export default function WorkFolderModal(): JSX.Element | null {
  const open = useAppStore((s) => s.folderModalOpen)
  const folders = useAppStore((s) => s.folders)
  const sessions = useAppStore((s) => s.sessions)
  const activeFolderId = useAppStore((s) => s.activeFolderId)
  const createFolder = useAppStore((s) => s.createFolder)
  const renameFolder = useAppStore((s) => s.renameFolder)
  const deleteFolder = useAppStore((s) => s.deleteFolder)
  const openFolder = useAppStore((s) => s.openFolder)
  const setFolderModal = useAppStore((s) => s.setFolderModal)

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  if (!open) return null

  // Mandatory while no folder is loaded — the user must pick one to proceed.
  const mandatory = !activeFolderId

  const create = (): void => {
    const name = newName.trim()
    if (!name) return
    const id = createFolder(name)
    setNewName('')
    openFolder(id)
  }

  const commitRename = (id: string): void => {
    renameFolder(id, editName)
    setEditingId(null)
  }

  const remove = (id: string, name: string): void => {
    if (window.confirm(`Delete folder "${name}" and all its brainstorms? This cannot be undone.`)) {
      deleteFolder(id)
    }
  }

  return (
    <div className="folder-overlay">
      <div className="folder-modal">
        <div className="folder-header">
          <div>
            <div className="folder-title">Work Folders</div>
            <div className="folder-sub">
              {mandatory
                ? 'Select or create a work folder to get started.'
                : 'Open, create, rename, or delete your workspaces.'}
            </div>
          </div>
          {!mandatory && (
            <button className="btn-ghost" onClick={() => setFolderModal(false)}>
              Close
            </button>
          )}
        </div>

        <div className="folder-newrow">
          <input
            className="folder-newinput"
            placeholder="New folder name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button className="btn-primary" onClick={create} disabled={!newName.trim()}>
            Create folder
          </button>
        </div>

        <div className="folder-grid">
          {folders.length === 0 && (
            <div className="folder-empty">
              No folders yet. Create your first workspace above.
            </div>
          )}
          {folders.map((f) => {
            const count = sessions.filter((s) => s.folderId === f.id).length
            const isEditing = editingId === f.id
            return (
              <div
                key={f.id}
                className={`folder-card${f.id === activeFolderId ? ' active' : ''}`}
                onDoubleClick={() => openFolder(f.id)}
              >
                <div className="folder-icon" aria-hidden="true">
                  📁
                </div>
                {isEditing ? (
                  <input
                    className="folder-rename"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(f.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <div className="folder-name" title={f.name}>
                    {f.name}
                  </div>
                )}
                <div className="folder-count">
                  {count} brainstorm{count === 1 ? '' : 's'}
                </div>
                <div className="folder-actions">
                  <button onClick={() => openFolder(f.id)}>Open</button>
                  <button
                    onClick={() => {
                      setEditingId(f.id)
                      setEditName(f.name)
                    }}
                  >
                    Rename
                  </button>
                  <button className="danger" onClick={() => remove(f.id, f.name)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
