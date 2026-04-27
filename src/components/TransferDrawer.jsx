import React, { useRef } from 'react'
import { PaperclipIcon } from './Icons.jsx'

export default function TransferDrawer({
  fileTransfer,
  onSendFile,
  onAccept,
  onReject,
  onCancel,
  onOpenFile,
  onDownloadFile,
  onRemoveFile,
  onToggleDrawer,
}) {
  const fileInputRef = useRef(null)

  return (
    <>
      <aside className="transfer-drawer" data-collapsed={fileTransfer.drawerCollapsed ? 'true' : 'false'} aria-label="File transfer drawer">
        <button
          type="button"
          className="transfer-drawer-toggle"
          aria-expanded={fileTransfer.drawerCollapsed ? 'false' : 'true'}
          aria-controls="transferDrawerPanel"
          onClick={onToggleDrawer}
        >
          <span className="transfer-drawer-toggle-text text-lg">
            <span>THE</span>
            <span className="text-5xl">X</span>
            <span>FILES</span>
          </span>
        </button>

        <div id="transferDrawerPanel" className="transfer-station rounded-2xl border border-amber-800/60 p-4 md:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-amber-900/70 pb-3">
            <div>
              <div className="text-sm glow-text">X-FTP: THE X-FILES TRANSFER PROTOCOL</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const [file] = event.target.files || []
                  event.target.value = ''
                  if (file) void onSendFile(file)
                }}
              />
              <button
                type="button"
                className="btn-retro px-3 py-2 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!fileTransfer.fileButtonEnabled}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="inline-flex items-center gap-2">
                  <PaperclipIcon />
                  <span>SEND X-FILE</span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            {fileTransfer.panelVisible ? (
              <div className="transfer-panel rounded-lg border border-amber-900/60 px-3 py-3" data-state={fileTransfer.panelState}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="transfer-title text-sm text-amber-200 truncate">{fileTransfer.title}</div>
                    <div className="transfer-meta text-xs text-amber-500 mt-1">{fileTransfer.meta}</div>
                  </div>
                  {fileTransfer.cancelVisible ? (
                    <button type="button" className="btn-retro px-2 py-1 text-xs rounded" onClick={onCancel}>
                      <span>CANCEL</span>
                    </button>
                  ) : null}
                </div>

                <div className="mt-3">
                  <div className="transfer-progress-track">
                    <div className="transfer-progress-bar" style={{ width: `${fileTransfer.progressPercent}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-amber-500">
                    <span>{fileTransfer.status}</span>
                    <span>{fileTransfer.progressPercent}%</span>
                  </div>
                  <div className="transfer-speed mt-1 text-xs text-amber-600">{fileTransfer.speed}</div>
                </div>

                <div className="mt-3 flex gap-2">
                  {fileTransfer.primaryAction ? (
                    <button type="button" className="btn-retro px-3 py-2 text-xs rounded" onClick={onAccept}>
                      {fileTransfer.primaryAction.label}
                    </button>
                  ) : null}
                  {fileTransfer.secondaryAction ? (
                    <button type="button" className="btn-retro px-3 py-2 text-xs rounded" onClick={onReject}>
                      {fileTransfer.secondaryAction.label}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="received-files-panel rounded-lg border border-amber-900/60 px-3 py-3 flex flex-col" hidden={!fileTransfer.receivedFiles.length}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs tracking-wide text-amber-500">RECEIVED X-FILES</span>
                <span className="text-xs text-amber-700">{fileTransfer.receivedFiles.length}</span>
              </div>
              {!fileTransfer.receivedFiles.length ? <div className="mt-2 text-xs text-amber-700">No X-Files received yet.</div> : null}
              <div className="mt-3 flex flex-col gap-2">
                {fileTransfer.receivedFiles.map((entry) => (
                  <div key={entry.id} className="received-file-item">
                    <div className="min-w-0">
                      <div className="received-file-name text-sm text-amber-200">{entry.name}</div>
                      <div className="mt-1 text-xs text-amber-600">{Math.round((entry.size || 0) / (1024 * 1024))} MB</div>
                    </div>
                    <div className="received-file-actions mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button type="button" className="btn-retro w-full px-3 py-2 text-xs rounded" onClick={() => onOpenFile(entry)}>
                        OPEN
                      </button>
                      <button type="button" className="btn-retro w-full px-3 py-2 text-xs rounded" onClick={() => onDownloadFile(entry)}>
                        DOWNLOAD
                      </button>
                      <button type="button" className="btn-retro w-full px-3 py-2 text-xs rounded" onClick={() => onRemoveFile(entry.id)}>
                        REMOVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="file-toast-region" aria-live="polite" aria-atomic="true">
        {fileTransfer.toasts.map((toast) => (
          <div key={toast.id} className="file-toast">
            <div className="file-toast-title">{toast.title}</div>
            <div className="file-toast-body">{toast.body}</div>
          </div>
        ))}
      </div>
    </>
  )
}
