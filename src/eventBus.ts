/**
 * Internal event bus — replaces VS Code's postMessage/addEventListener('message') bridge.
 *
 * The game engine previously communicated via:
 *   - Extension -> Webview: window.postMessage (received via window.addEventListener('message'))
 *   - Webview -> Extension: vscode.postMessage({ type, ... })
 *
 * This event bus provides the same pub/sub contract without any VS Code dependency.
 */

export type EventHandler = (data: Record<string, unknown>) => void

class EventBus {
  private listeners = new Map<string, Set<EventHandler>>()

  /** Subscribe to an event type. Returns an unsubscribe function. */
  on(type: string, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
    return () => {
      this.listeners.get(type)?.delete(handler)
    }
  }

  /** Emit an event to all subscribers of that type. */
  emit(type: string, data: Record<string, unknown> = {}): void {
    const handlers = this.listeners.get(type)
    if (handlers) {
      for (const handler of handlers) {
        handler({ type, ...data })
      }
    }
  }

  /** Remove all listeners (useful for cleanup). */
  clear(): void {
    this.listeners.clear()
  }
}

/** Singleton event bus instance shared across the application. */
export const eventBus = new EventBus()
