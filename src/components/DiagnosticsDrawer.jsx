import React from 'react'
import { RadioIcon } from './Icons.jsx'

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${value}${suffix}`
}

function formatMode(mode) {
  return mode === 'relay' ? 'RELAY' : 'DIRECT'
}

function StatTile({ label, value, tone = 'amber' }) {
  return (
    <div className="diagnostics-tile">
      <span className="diagnostics-label">{label}</span>
      <span className={`diagnostics-value diagnostics-value-${tone}`}>{value}</span>
    </div>
  )
}

export default function DiagnosticsDrawer({ diagnostics, onToggleDrawer }) {
  const qualityScore = diagnostics.connected
    ? Math.max(
        8,
        Math.min(
          100,
          100 -
            (diagnostics.latencyMs || 0) * 0.16 -
            (diagnostics.packetLossPercent || 0) * 18,
        ),
      )
    : 0
  const bitratePercent = Math.max(0, Math.min(100, ((diagnostics.bitrateKbps || 0) / 2500) * 100))
  const updatedTime = diagnostics.updatedAt
    ? new Date(diagnostics.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'N/A'

  return (
    <aside
      className="diagnostics-drawer"
      data-collapsed={diagnostics.drawerCollapsed ? 'true' : 'false'}
      aria-label="Connection diagnostics drawer"
    >
      <button
        type="button"
        className="diagnostics-drawer-toggle"
        aria-expanded={diagnostics.drawerCollapsed ? 'false' : 'true'}
        aria-controls="diagnosticsDrawerPanel"
        onClick={onToggleDrawer}
      >
        <span className="diagnostics-drawer-toggle-text text-lg">
          <span>LINK</span>
          <span className="text-5xl">X</span>
          <span>DATA</span>
        </span>
      </button>

      <div id="diagnosticsDrawerPanel" className="diagnostics-station rounded-2xl border border-amber-800/60 p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-amber-900/70 pb-2">
          <div>
            <div className="text-sm glow-text">SIGNAL INTELLIGENCE PANEL</div>
            <div className="mt-1 text-xs text-amber-700">Last scan: {updatedTime}</div>
          </div>
          <div className={`diagnostics-link-light ${diagnostics.connected ? 'active' : ''}`}>
            <RadioIcon />
          </div>
        </div>

        <div className="mt-3 diagnostics-panel rounded-lg border border-amber-900/60 px-2.5 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs tracking-wide text-amber-500">ACTIVE PATH</div>
              <div className="mt-1 diagnostics-path">{diagnostics.pathLabel}</div>
            </div>
            <div className="diagnostics-badge">{formatMode(diagnostics.connectionMode)}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatTile label="Latency" value={formatValue(diagnostics.latencyMs, ' ms')} tone={diagnostics.latencyMs > 180 ? 'red' : 'green'} />
            <StatTile label="Packet Loss" value={formatValue(diagnostics.packetLossPercent, '%')} tone={diagnostics.packetLossPercent > 2 ? 'red' : 'green'} />
            <StatTile label="Bitrate" value={formatValue(diagnostics.bitrateKbps, ' kbps')} />
            <StatTile label="Reconnects" value={diagnostics.reconnectAttempts} tone={diagnostics.reconnectAttempts > 0 ? 'red' : 'amber'} />
          </div>
        </div>

        <div className="mt-3 diagnostics-panel rounded-lg border border-amber-900/60 px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs tracking-wide text-amber-500">SIGNAL QUALITY</span>
            <span className="text-xs text-amber-600">{Math.round(qualityScore)}%</span>
          </div>
          <div className="diagnostics-progress-track mt-2">
            <div className="diagnostics-progress-bar" style={{ width: `${qualityScore}%` }} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs tracking-wide text-amber-500">THROUGHPUT</span>
            <span className="text-xs text-amber-600">
              TX {formatValue(diagnostics.sendBitrateKbps, 'k')} / RX {formatValue(diagnostics.receiveBitrateKbps, 'k')}
            </span>
          </div>
          <div className="diagnostics-progress-track mt-2">
            <div className="diagnostics-progress-bar alt" style={{ width: `${bitratePercent}%` }} />
          </div>
        </div>

        <div className="mt-3 diagnostics-panel rounded-lg border border-amber-900/60 px-2.5 py-2.5">
          <div className="grid gap-2">
            <StatTile label="ICE State" value={diagnostics.iceState.toUpperCase()} />
            <StatTile label="Peer State" value={diagnostics.connectionState.toUpperCase()} />
            <StatTile label="Codec" value={diagnostics.codec} />
            <StatTile
              label="Candidates"
              value={`${diagnostics.localCandidateType || 'N/A'} -> ${diagnostics.remoteCandidateType || 'N/A'}`.toUpperCase()}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
