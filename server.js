#!/usr/bin/env node
/**
 * Pixel Office production server.
 * Serves the built static files and proxies /sessions_list to the
 * OpenClaw internal gateway.
 *
 * Environment variables:
 *   PORT               — HTTP port (default: 3002)
 *   OPENCLAW_GATEWAY_URL — Internal gateway URL (e.g. http://localhost:18789)
 *   OPENCLAW_GATEWAY_TOKEN — Bearer token for the gateway (optional)
 *
 * Usage:
 *   OPENCLAW_GATEWAY_URL=http://localhost:18789 node server.js
 */

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = parseInt(process.env.PORT || '3002', 10)
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''

const app = express()

// ── API Proxy / Bridge ──────────────────────────────────────────

if (GATEWAY_URL) {
  console.log(`[server] Proxying /sessions_list → ${GATEWAY_URL}`)

  // Proxy sessions_list requests to the internal gateway
  app.use(
    '/sessions_list',
    createProxyMiddleware({
      target: GATEWAY_URL,
      changeOrigin: true,
      headers: GATEWAY_TOKEN
        ? { Authorization: `Bearer ${GATEWAY_TOKEN}` }
        : undefined,
      on: {
        error: (err, _req, res) => {
          console.error('[proxy] Error:', err.message)
          if (res.writeHead) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Gateway unreachable', detail: err.message }))
          }
        },
      },
    })
  )

  // Also proxy /api/* if the gateway uses that path
  app.use(
    '/api',
    createProxyMiddleware({
      target: GATEWAY_URL,
      changeOrigin: true,
      headers: GATEWAY_TOKEN
        ? { Authorization: `Bearer ${GATEWAY_TOKEN}` }
        : undefined,
      on: {
        error: (err, _req, res) => {
          console.error('[proxy] Error:', err.message)
          if (res.writeHead) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Gateway unreachable', detail: err.message }))
          }
        },
      },
    })
  )
} else {
  console.log('[server] No OPENCLAW_GATEWAY_URL set — API proxy disabled')
  console.log('[server] The app will show the connection screen or use mock mode')

  // Return a helpful error for API requests when no gateway is configured
  app.get('/sessions_list', (_req, res) => {
    res.status(503).json({
      error: 'No gateway configured',
      message: 'Set OPENCLAW_GATEWAY_URL environment variable to enable the API bridge',
    })
  })
}

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
  if (GATEWAY_URL) {
    console.log(`[server] Gateway proxy: ${GATEWAY_URL}`)
  }
})
