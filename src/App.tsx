import { useState, useCallback, useRef, useEffect } from 'react'
import { OfficeState } from './office/engine/officeState.js'
import { OfficeCanvas } from './office/components/OfficeCanvas.js'
import { ToolOverlay } from './office/components/ToolOverlay.js'
import { EditorToolbar } from './office/editor/EditorToolbar.js'
import { EditorState } from './office/editor/editorState.js'
import type { EditTool } from './office/types.js'
import { isRotatable } from './office/layout/furnitureCatalog.js'
import { useExtensionMessages } from './hooks/useExtensionMessages.js'
import { PULSE_ANIMATION_DURATION_SEC } from './constants.js'
import { useEditorActions } from './hooks/useEditorActions.js'
import { useEditorKeyboard } from './hooks/useEditorKeyboard.js'
import { ZoomControls } from './components/ZoomControls.js'
import { BottomToolbar } from './components/BottomToolbar.js'
import { DebugView } from './components/DebugView.js'
import { ConnectionScreen } from './ConnectionScreen.js'
import type { ConnectionStatus } from './ConnectionScreen.js'
import { OpenClawAdapter } from './openclawAdapter.js'
import { saveConnection, clearConnection } from './localStorage.js'
import { eventBus } from './eventBus.js'

// ── Mock mode detection ─────────────────────────────────────────
const isMockMode = new URLSearchParams(window.location.search).get('mock') === 'true'

// Game state lives outside React — updated imperatively by message handlers
const officeStateRef = { current: null as OfficeState | null }
const editorState = new EditorState()

function getOfficeState(): OfficeState {
  if (!officeStateRef.current) {
    officeStateRef.current = new OfficeState()
  }
  return officeStateRef.current
}

const actionBarBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '22px',
  background: 'var(--pixel-btn-bg)',
  color: 'var(--pixel-text-dim)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
}

const actionBarBtnDisabled: React.CSSProperties = {
  ...actionBarBtnStyle,
  opacity: 'var(--pixel-btn-disabled-opacity)',
  cursor: 'default',
}

function EditActionBar({ editor, editorState: es }: { editor: ReturnType<typeof useEditorActions>; editorState: EditorState }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const undoDisabled = es.undoStack.length === 0
  const redoDisabled = es.redoStack.length === 0

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        background: 'var(--pixel-bg)',
        border: '2px solid var(--pixel-border)',
        borderRadius: 0,
        padding: '4px 8px',
        boxShadow: 'var(--pixel-shadow)',
      }}
    >
      <button
        style={undoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={undoDisabled ? undefined : editor.handleUndo}
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        style={redoDisabled ? actionBarBtnDisabled : actionBarBtnStyle}
        onClick={redoDisabled ? undefined : editor.handleRedo}
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>
      <button
        style={actionBarBtnStyle}
        onClick={editor.handleSave}
        title="Save layout"
      >
        Save
      </button>
      {!showResetConfirm ? (
        <button
          style={actionBarBtnStyle}
          onClick={() => setShowResetConfirm(true)}
          title="Reset to last saved layout"
        >
          Reset
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '22px', color: 'var(--pixel-reset-text)' }}>Reset?</span>
          <button
            style={{ ...actionBarBtnStyle, background: 'var(--pixel-danger-bg)', color: '#fff' }}
            onClick={() => { setShowResetConfirm(false); editor.handleReset() }}
          >
            Yes
          </button>
          <button
            style={actionBarBtnStyle}
            onClick={() => setShowResetConfirm(false)}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

// ── Disconnect Button ───────────────────────────────────────────

function DisconnectButton({ onDisconnect }: { onDisconnect: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onDisconnect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Disconnect from OpenClaw"
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 'var(--pixel-controls-z)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        fontSize: '20px',
        color: hovered ? '#e55' : 'rgba(255, 255, 255, 0.5)',
        background: hovered ? 'rgba(200, 50, 50, 0.15)' : 'var(--pixel-btn-bg)',
        border: hovered ? '2px solid rgba(200, 50, 50, 0.4)' : '2px solid transparent',
        borderRadius: 0,
        cursor: 'pointer',
        boxShadow: 'var(--pixel-shadow)',
        transition: 'none',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--pixel-green)',
          flexShrink: 0,
        }}
      />
      Disconnect
    </button>
  )
}

// ── Main App ────────────────────────────────────────────────────

function App() {
  // Connection state (not used in mock mode)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isMockMode ? 'connected' : 'idle')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const adapterRef = useRef<OpenClawAdapter | null>(null)

  const editor = useEditorActions(getOfficeState, editorState)

  const isEditDirty = useCallback(() => editor.isEditMode && editor.isDirty, [editor.isEditMode, editor.isDirty])

  const { agents, selectedAgent, agentTools, agentStatuses, subagentTools, subagentCharacters, layoutReady, loadedAssets } = useExtensionMessages(getOfficeState, editor.setLastSavedLayout, isEditDirty)

  const [isDebugMode, setIsDebugMode] = useState(false)

  const handleToggleDebugMode = useCallback(() => setIsDebugMode((prev) => !prev), [])

  const handleSelectAgent = useCallback((_id: number) => {
    // In standalone mode, agent selection is a no-op (no terminal to focus)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  const [editorTickForKeyboard, setEditorTickForKeyboard] = useState(0)
  useEditorKeyboard(
    editor.isEditMode,
    editorState,
    editor.handleDeleteSelected,
    editor.handleRotateSelected,
    editor.handleToggleState,
    editor.handleUndo,
    editor.handleRedo,
    useCallback(() => setEditorTickForKeyboard((n) => n + 1), []),
    editor.handleToggleEditMode,
  )

  const handleCloseAgent = useCallback((_id: number) => {
    // In standalone mode, closing an agent is a no-op
  }, [])

  const handleClick = useCallback((_agentId: number) => {
    // In standalone mode, clicking an agent is a no-op (no terminal to focus)
  }, [])

  // Listen for OpenClaw errors to update connection status
  useEffect(() => {
    if (isMockMode) return
    const unsub = eventBus.on('openclawError', (data) => {
      setConnectionError(data.message as string)
      // Don't set status to 'error' for transient polling errors once connected;
      // only show error if we never successfully connected
      if (connectionStatus === 'connecting') {
        setConnectionStatus('error')
      }
    })
    return unsub
  }, [connectionStatus])

  // ── Connection Handlers ─────────────────────────────────────

  const handleConnect = useCallback((gatewayUrl: string, apiToken: string) => {
    // Clean up any existing adapter
    if (adapterRef.current) {
      adapterRef.current.stop()
      adapterRef.current = null
    }

    setConnectionStatus('connecting')
    setConnectionError(null)

    const adapter = new OpenClawAdapter(gatewayUrl, apiToken)
    adapterRef.current = adapter

    // Save to localStorage on connect attempt
    saveConnection(gatewayUrl, apiToken)

    adapter.start()

    // Listen for the first successful layout load as a "connected" signal
    const unsub = eventBus.on('layoutLoaded', () => {
      unsub()
      setConnectionStatus('connected')
    })

    // Also listen for errors during initial connection
    const unsubErr = eventBus.on('openclawError', (data) => {
      unsubErr()
      setConnectionStatus('error')
      setConnectionError(data.message as string)
      // Stop the adapter on initial connection failure
      adapter.stop()
      adapterRef.current = null
    })

    // If layoutLoaded fires, cancel the error listener and vice versa
    const origUnsub = unsub
    const origUnsubErr = unsubErr
    eventBus.on('layoutLoaded', () => { origUnsubErr() })
    eventBus.on('openclawError', () => { origUnsub() })
  }, [])

  const handleAutoConnect = useCallback((gatewayUrl: string, apiToken: string) => {
    handleConnect(gatewayUrl, apiToken)
  }, [handleConnect])

  const handleDisconnect = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.stop()
      adapterRef.current = null
    }
    clearConnection()
    setConnectionStatus('idle')
    setConnectionError(null)
    // Reset office state for a clean reconnect
    officeStateRef.current = null
  }, [])

  // Cleanup adapter on unmount
  useEffect(() => {
    return () => {
      if (adapterRef.current) {
        adapterRef.current.stop()
      }
    }
  }, [])

  const officeState = getOfficeState()

  // Force dependency on editorTickForKeyboard to propagate keyboard-triggered re-renders
  void editorTickForKeyboard

  // Show "Press R to rotate" hint when a rotatable item is selected or being placed
  const showRotateHint = editor.isEditMode && (() => {
    if (editorState.selectedFurnitureUid) {
      const item = officeState.getLayout().furniture.find((f) => f.uid === editorState.selectedFurnitureUid)
      if (item && isRotatable(item.type)) return true
    }
    if (editorState.activeTool === ('furniture_place' as EditTool) && isRotatable(editorState.selectedFurnitureType)) {
      return true
    }
    return false
  })()

  // ── Show ConnectionScreen when not connected (and not in mock mode) ──

  if (!isMockMode && connectionStatus !== 'connected') {
    return (
      <>
        <style>{`
          @keyframes pixel-agents-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
        `}</style>
        <ConnectionScreen
          status={connectionStatus}
          errorMessage={connectionError}
          onConnect={handleConnect}
          onAutoConnect={handleAutoConnect}
        />
      </>
    )
  }

  if (!layoutReady) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
        Loading...
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes pixel-agents-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .pixel-agents-pulse { animation: pixel-agents-pulse ${PULSE_ANIMATION_DURATION_SEC}s ease-in-out infinite; }
      `}</style>

      <OfficeCanvas
        officeState={officeState}
        onClick={handleClick}
        isEditMode={editor.isEditMode}
        editorState={editorState}
        onEditorTileAction={editor.handleEditorTileAction}
        onEditorEraseAction={editor.handleEditorEraseAction}
        onEditorSelectionChange={editor.handleEditorSelectionChange}
        onDeleteSelected={editor.handleDeleteSelected}
        onRotateSelected={editor.handleRotateSelected}
        onDragMove={editor.handleDragMove}
        editorTick={editor.editorTick}
        zoom={editor.zoom}
        onZoomChange={editor.handleZoomChange}
        panRef={editor.panRef}
      />

      <ZoomControls zoom={editor.zoom} onZoomChange={editor.handleZoomChange} />

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--pixel-vignette)',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* Disconnect button (only when connected to OpenClaw, not in mock mode) */}
      {!isMockMode && <DisconnectButton onDisconnect={handleDisconnect} />}

      <BottomToolbar
        isEditMode={editor.isEditMode}
        onToggleEditMode={editor.handleToggleEditMode}
        isDebugMode={isDebugMode}
        onToggleDebugMode={handleToggleDebugMode}
      />

      {editor.isEditMode && editor.isDirty && (
        <EditActionBar editor={editor} editorState={editorState} />
      )}

      {showRotateHint && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: editor.isDirty ? 'translateX(calc(-50% + 100px))' : 'translateX(-50%)',
            zIndex: 49,
            background: 'var(--pixel-hint-bg)',
            color: '#fff',
            fontSize: '20px',
            padding: '3px 8px',
            borderRadius: 0,
            border: '2px solid var(--pixel-accent)',
            boxShadow: 'var(--pixel-shadow)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Press <b>R</b> to rotate
        </div>
      )}

      {editor.isEditMode && (() => {
        // Compute selected furniture color from current layout
        const selUid = editorState.selectedFurnitureUid
        const selColor = selUid
          ? officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null
          : null
        return (
          <EditorToolbar
            activeTool={editorState.activeTool}
            selectedTileType={editorState.selectedTileType}
            selectedFurnitureType={editorState.selectedFurnitureType}
            selectedFurnitureUid={selUid}
            selectedFurnitureColor={selColor}
            floorColor={editorState.floorColor}
            wallColor={editorState.wallColor}
            onToolChange={editor.handleToolChange}
            onTileTypeChange={editor.handleTileTypeChange}
            onFloorColorChange={editor.handleFloorColorChange}
            onWallColorChange={editor.handleWallColorChange}
            onSelectedFurnitureColorChange={editor.handleSelectedFurnitureColorChange}
            onFurnitureTypeChange={editor.handleFurnitureTypeChange}
            loadedAssets={loadedAssets}
          />
        )
      })()}

      <ToolOverlay
        officeState={officeState}
        agents={agents}
        agentTools={agentTools}
        subagentCharacters={subagentCharacters}
        containerRef={containerRef}
        zoom={editor.zoom}
        panRef={editor.panRef}
        onCloseAgent={handleCloseAgent}
      />

      {isDebugMode && (
        <DebugView
          agents={agents}
          selectedAgent={selectedAgent}
          agentTools={agentTools}
          agentStatuses={agentStatuses}
          subagentTools={subagentTools}
          onSelectAgent={handleSelectAgent}
        />
      )}
    </div>
  )
}

export default App
