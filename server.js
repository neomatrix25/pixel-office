#!/usr/bin/env node
/**
 * Pixel Office production server.
 * Serves the built static files and bridges session data from the
 * OpenClaw CLI to the browser via GET /sessions_list.
 *
 * Environment variables:
 *   PORT                 — HTTP port (default: 3002)
 *   OPENCLAW_CLI         — Path to openclaw CLI binary (default: "openclaw")
 *   OPENCLAW_ACTIVE_MIN  — Active window in minutes for session query (default: 60)
 *
 * Usage:
 *   npm run build && node server.js
 *   # or with custom CLI path:
 *   OPENCLAW_CLI=/usr/local/bin/openclaw node server.js
 */

import express from 'express'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = parseInt(process.env.PORT || '3002', 10)
const OPENCLAW_CLI = process.env.OPENCLAW_CLI || 'openclaw'
const ACTIVE_MINUTES = process.env.OPENCLAW_ACTIVE_MIN || '60'

const app = express()

// ── Sessions Bridge (CLI → HTTP) ────────────────────────────────

/**
 * Transform OpenClaw CLI session data to the format expected by
 * the Pixel Office adapter (openclawAdapter.ts).
 */
function transformSessions(cliOutput) {
  const data = JSON.parse(cliOutput)
  const sessions = data.sessions || []

  return {
    sessions: sessions.map((s) => {
      // Extract agent name from key: "agent:main:slack:channel:xxx" → "main"
      const keyParts = (s.key || '').split(':')
      const agentName = keyParts.length >= 2 ? keyParts[1] : 'unknown'

      // Determine status from last message
      let status = 'idle'
      const lastMsg = Array.isArray(s.messages) ? s.messages[0] : null
      if (lastMsg) {
        if (lastMsg.role === 'assistant') {
          // Check if the assistant is actively using tools
          const content = Array.isArray(lastMsg.content) ? lastMsg.content : []
          const hasToolCall = content.some((c) => c.type === 'toolCall' || c.type === 'tool_use')
          status = hasToolCall ? 'active' : 'waiting'
        } else {
          status = 'waiting' // User message = agent is waiting for processing
        }
      }

      return {
        sessionKey: s.key || s.sessionId,
        kind: s.kind || 'agent',
        name: s.displayName || agentName,
        model: s.model || 'unknown',
        lastActivity: s.updatedAt, // Already Unix ms
        status,
        agentId: agentName,
      }
    }),
  }
}

app.get('/sessions_list', (_req, res) => {
  try {
    const cmd = `${OPENCLAW_CLI} sessions --json --active ${ACTIVE_MINUTES}`
    const output = execSync(cmd, {
      timeout: 10000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const transformed = transformSessions(output)
    res.json(transformed)
  } catch (err) {
    const message = err.stderr || err.message || 'CLI execution failed'
    console.error('[bridge] CLI error:', message)
    res.status(500).json({
      error: 'CLI execution failed',
      detail: String(message).slice(0, 200),
    })
  }
})

// Also serve at /api/sessions as an alias
app.get('/api/sessions', (req, res) => {
  req.url = '/sessions_list'
  app.handle(req, res)
})

// ── Static Files ────────────────────────────────────────────────

const distPath = join(__dirname, 'dist')
app.use(express.static(distPath))

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

// ── Start ───────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Pixel Office running at http://0.0.0.0:${PORT}`)
  console.log(`[server] CLI bridge: ${OPENCLAW_CLI} sessions --json --active ${ACTIVE_MINUTES}`)
})
