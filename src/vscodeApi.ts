/**
 * Drop-in replacement for acquireVsCodeApi().
 *
 * In the VS Code extension, `vscode.postMessage(msg)` sent messages to the
 * extension host. In standalone mode, outbound messages are routed through
 * the event bus so any listener (e.g. mock provider, future WebSocket bridge)
 * can react to them.
 *
 * Consumers that import `vscode` and call `vscode.postMessage(...)` continue
 * to work without changes — the message is simply forwarded to the event bus.
 */

import { eventBus } from './eventBus.js'

export const vscode = {
  postMessage(msg: unknown): void {
    if (msg && typeof msg === 'object' && 'type' in msg) {
      const { type, ...rest } = msg as Record<string, unknown>
      eventBus.emit(type as string, rest)
    }
  },
}
