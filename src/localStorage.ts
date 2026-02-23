/**
 * LocalStorage persistence helpers for connection settings, layout, and agent seats.
 *
 * All operations are wrapped in try/catch so that quota errors, private browsing
 * restrictions, or corrupt data never crash the application.
 */

import type { OfficeLayout } from './office/types.js'

// ── Storage Keys ────────────────────────────────────────────────

const KEY_CONNECTION = 'pixel-office:connection'
const KEY_LAYOUT = 'pixel-office:layout'
const KEY_AGENT_SEATS = 'pixel-office:agent-seats'

// ── Connection ──────────────────────────────────────────────────

export interface ConnectionConfig {
  gatewayUrl: string
  apiToken: string
}

/** Persist gateway URL and API token. */
export function saveConnection(url: string, token: string): void {
  try {
    localStorage.setItem(KEY_CONNECTION, JSON.stringify({ gatewayUrl: url, apiToken: token }))
  } catch (err) {
    console.warn('[localStorage] Failed to save connection:', err)
  }
}

/** Load previously saved connection config, or null if none exists. */
export function loadConnection(): ConnectionConfig | null {
  try {
    const raw = localStorage.getItem(KEY_CONNECTION)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConnectionConfig>
    if (typeof parsed.gatewayUrl === 'string' && typeof parsed.apiToken === 'string') {
      return { gatewayUrl: parsed.gatewayUrl, apiToken: parsed.apiToken }
    }
    return null
  } catch (err) {
    console.warn('[localStorage] Failed to load connection:', err)
    return null
  }
}

/** Remove saved connection config. */
export function clearConnection(): void {
  try {
    localStorage.removeItem(KEY_CONNECTION)
  } catch (err) {
    console.warn('[localStorage] Failed to clear connection:', err)
  }
}

// ── Layout ──────────────────────────────────────────────────────

/** Persist the office layout JSON. */
export function saveLayout(layout: OfficeLayout): void {
  try {
    localStorage.setItem(KEY_LAYOUT, JSON.stringify(layout))
  } catch (err) {
    console.warn('[localStorage] Failed to save layout:', err)
  }
}

/** Load previously saved layout, or null if none exists. */
export function loadLayout(): OfficeLayout | null {
  try {
    const raw = localStorage.getItem(KEY_LAYOUT)
    if (!raw) return null
    return JSON.parse(raw) as OfficeLayout
  } catch (err) {
    console.warn('[localStorage] Failed to load layout:', err)
    return null
  }
}

// ── Agent Seats ─────────────────────────────────────────────────

export interface AgentSeatMap {
  [agentId: number]: {
    palette: number
    hueShift: number
    seatId: string | null
  }
}

/** Persist agent seat assignments (palette, hue shift, seat ID). */
export function saveAgentSeats(seats: AgentSeatMap): void {
  try {
    localStorage.setItem(KEY_AGENT_SEATS, JSON.stringify(seats))
  } catch (err) {
    console.warn('[localStorage] Failed to save agent seats:', err)
  }
}

/** Load previously saved agent seat assignments, or null if none. */
export function loadAgentSeats(): AgentSeatMap | null {
  try {
    const raw = localStorage.getItem(KEY_AGENT_SEATS)
    if (!raw) return null
    return JSON.parse(raw) as AgentSeatMap
  } catch (err) {
    console.warn('[localStorage] Failed to load agent seats:', err)
    return null
  }
}
