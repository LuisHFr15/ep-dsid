#!/usr/bin/env node
// Mock server — simula todos os endpoints do hub em memória
// Uso: node mock-server.mjs
// Não requer Docker nem DynamoDB

import http from 'http'
import crypto from 'crypto'

const PORT = 3000

// ── In-memory state ──────────────────────────────────────────────────────────
const users = new Map()       // username → { id, username, passwordHash }
const tokens = new Map()      // token → { userId, username }
const networks = new Map()    // id → Network
const memberships = new Map() // `${networkId}:${userId}` → MembershipStatus
const versions = new Map()    // networkId → FileVersion[]
const presence = new Map()    // `${networkId}:${peerId}` → PeerPresence
const lamport = new Map()     // networkId → number

function uid() { return crypto.randomUUID() }
function now() { return new Date().toISOString() }

function nextLamport(networkId) {
  const v = (lamport.get(networkId) ?? 0) + 1
  lamport.set(networkId, v)
  return v
}

function fakeJwt(userId, username) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, username })).toString('base64')
  const token = `mock.${payload}.sig`
  tokens.set(token, { userId, username })
  return token
}

function auth(req) {
  const h = req.headers['authorization'] ?? ''
  const token = h.replace('Bearer ', '')
  return tokens.get(token) ?? null
}

function currentVersion(networkId) {
  const vs = versions.get(networkId) ?? []
  if (!vs.length) return null
  return vs.reduce((a, b) => (b.lamportTs > a.lamportTs ? b : a))
}

function activePeers(networkId) {
  const cutoff = Date.now() - 35_000
  return [...presence.values()].filter(
    p => p.networkId === networkId &&
         p.status === 'online' &&
         new Date(p.lastSeenAt).getTime() > cutoff
  )
}

// ── HTTP plumbing ─────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
    })
  })
}

function send(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  })
  res.end(json)
}

function err(res, status, message) { send(res, status, { message }) }

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { send(res, 204, {}); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const method = req.method
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {}

  // Health
  if (method === 'GET' && path === '/health') {
    send(res, 200, { status: 'ok', mode: 'mock' }); return
  }

  // POST /auth/register
  if (method === 'POST' && path === '/auth/register') {
    const { user, password } = body
    if (!user || !password) { err(res, 400, 'user e password obrigatórios'); return }
    if (users.has(user)) { err(res, 409, 'Usuário já existe'); return }
    const id = uid()
    users.set(user, { id, username: user, password })
    send(res, 201, { id, username: user, createdAt: now() }); return
  }

  // POST /auth/login
  if (method === 'POST' && path === '/auth/login') {
    const { user, password } = body
    const u = users.get(user)
    if (!u || u.password !== password) { err(res, 401, 'Credenciais inválidas'); return }
    const token = fakeJwt(u.id, u.username)
    send(res, 200, { token, userId: u.id, username: u.username }); return
  }

  // GET /networks
  if (method === 'GET' && path === '/networks') {
    const session = auth(req)
    if (!session) { err(res, 401, 'Não autenticado'); return }
    const q = url.searchParams.get('q')?.toLowerCase()
    const tag = url.searchParams.get('tag')
    let list = [...networks.values()]
    if (q) list = list.filter(n => n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q))
    if (tag) list = list.filter(n => n.tags.includes(tag))
    send(res, 200, list); return
  }

  // POST /networks
  if (method === 'POST' && path === '/networks') {
    const session = auth(req)
    if (!session) { err(res, 401, 'Não autenticado'); return }
    const id = uid()
    const network = {
      id,
      title: body.title ?? 'Sem título',
      description: body.description ?? '',
      tags: body.tags ?? [],
      accessMode: body.accessMode ?? 'public',
      updateMode: body.updateMode ?? 'centralized',
      ownerId: session.userId,
      activeFileId: null,
      createdAt: now()
    }
    networks.set(id, network)
    memberships.set(`${id}:${session.userId}`, 'approved')
    send(res, 201, network); return
  }

  // Rotas com /networks/:id
  const netMatch = path.match(/^\/networks\/([^/]+)(.*)$/)
  if (netMatch) {
    const networkId = netMatch[1]
    const rest = netMatch[2] ?? ''
    const session = auth(req)
    if (!session) { err(res, 401, 'Não autenticado'); return }
    const network = networks.get(networkId)
    if (!network) { err(res, 404, 'Rede não encontrada'); return }

    const isOwner = network.ownerId === session.userId
    const memberKey = `${networkId}:${session.userId}`
    const memberStatus = memberships.get(memberKey)
    const canRead = network.accessMode === 'public' || isOwner || memberStatus === 'approved'
    const canContribute = isOwner || (network.updateMode === 'collaborative' && memberStatus === 'approved')

    // POST /networks/:id/access
    if (method === 'POST' && rest === '/access') {
      if (isOwner || memberStatus === 'approved') {
        send(res, 200, { status: memberStatus ?? 'approved' }); return
      }
      const status = network.accessMode === 'public' ? 'approved' : 'pending'
      memberships.set(memberKey, status)
      send(res, 202, { status }); return
    }

    // GET /networks/:id/access
    if (method === 'GET' && rest === '/access') {
      if (!isOwner) { err(res, 403, 'Apenas o owner pode ver pedidos'); return }
      const pending = [...memberships.entries()]
        .filter(([k, v]) => k.startsWith(`${networkId}:`) && v === 'pending')
        .map(([k]) => {
          const userId = k.split(':')[1]
          const u = [...users.values()].find(x => x.id === userId)
          return { networkId, userId, username: u?.username ?? userId, status: 'pending', createdAt: now() }
        })
      send(res, 200, pending); return
    }

    // PATCH /networks/:id/access/:userId
    const accessMatch = rest.match(/^\/access\/([^/]+)$/)
    if (method === 'PATCH' && accessMatch) {
      if (!isOwner) { err(res, 403, 'Apenas o owner pode decidir'); return }
      const targetUserId = accessMatch[1]
      const decision = body.decision
      memberships.set(`${networkId}:${targetUserId}`, decision === 'approve' ? 'approved' : 'rejected')
      send(res, 200, { status: decision === 'approve' ? 'approved' : 'rejected' }); return
    }

    // POST /networks/:id/file  (announce)
    if (method === 'POST' && rest === '/file') {
      if (!isOwner) { err(res, 403, 'Apenas o owner pode anunciar'); return }
      const fileId = uid()
      const versionId = uid()
      const lamportTs = nextLamport(networkId)
      const version = {
        networkId, fileId, versionId,
        parentVersionId: null,
        infoHash: body.infoHash ?? uid(),
        magnet: body.magnet ?? `magnet:?xt=urn:btih:${uid()}`,
        filename: body.filename ?? 'arquivo',
        size: body.size ?? 0,
        lamportTs,
        authorId: session.userId,
        createdAt: now()
      }
      versions.set(networkId, [...(versions.get(networkId) ?? []), version])
      network.activeFileId = fileId
      networks.set(networkId, network)
      send(res, 201, version); return
    }

    // GET /networks/:id/file
    if (method === 'GET' && rest === '/file') {
      if (!canRead) { err(res, 403, 'Acesso negado'); return }
      const versionId = url.searchParams.get('versionId')
      const vs = versions.get(networkId) ?? []
      const found = versionId ? vs.find(v => v.versionId === versionId) : currentVersion(networkId)
      if (!found) { err(res, 404, 'Nenhuma versão disponível'); return }
      send(res, 200, found); return
    }

    // GET /networks/:id/file/versions
    if (method === 'GET' && rest === '/file/versions') {
      if (!canRead) { err(res, 403, 'Acesso negado'); return }
      const vs = versions.get(networkId) ?? []
      const current = currentVersion(networkId)
      const parentCounts = {}
      vs.forEach(v => {
        if (v.parentVersionId) {
          parentCounts[v.parentVersionId] = (parentCounts[v.parentVersionId] ?? 0) + 1
        }
      })
      const nodes = vs.map(v => ({
        ...v,
        isCurrent: v.versionId === current?.versionId,
        concurrent: v.parentVersionId ? (parentCounts[v.parentVersionId] ?? 0) > 1 : false
      }))
      send(res, 200, { fileId: network.activeFileId, versions: nodes }); return
    }

    // POST /networks/:id/file/versions  (publish)
    if (method === 'POST' && rest === '/file/versions') {
      if (!canContribute) { err(res, 403, 'Sem permissão para publicar'); return }
      const vs = versions.get(networkId) ?? []
      const concurrent = vs.some(v => v.parentVersionId === body.parentVersionId && v.versionId !== body.parentVersionId)
      const versionId = uid()
      const lamportTs = nextLamport(networkId)
      const version = {
        networkId,
        fileId: currentVersion(networkId)?.fileId ?? uid(),
        versionId,
        parentVersionId: body.parentVersionId,
        infoHash: body.infoHash ?? uid(),
        magnet: body.magnet ?? `magnet:?xt=urn:btih:${uid()}`,
        filename: body.filename ?? 'arquivo',
        size: body.size ?? 0,
        lamportTs,
        authorId: session.userId,
        createdAt: now()
      }
      versions.set(networkId, [...vs, version])
      send(res, 201, { ...version, concurrent }); return
    }

    // POST /networks/:id/file/versions/:versionId/promote
    const promoteMatch = rest.match(/^\/file\/versions\/([^/]+)\/promote$/)
    if (method === 'POST' && promoteMatch) {
      if (!canContribute) { err(res, 403, 'Sem permissão'); return }
      const sourceId = promoteMatch[1]
      const vs = versions.get(networkId) ?? []
      const source = vs.find(v => v.versionId === sourceId)
      if (!source) { err(res, 404, 'Versão não encontrada'); return }
      const versionId = uid()
      const lamportTs = nextLamport(networkId)
      const promoted = { ...source, versionId, parentVersionId: sourceId, lamportTs, authorId: session.userId, createdAt: now() }
      versions.set(networkId, [...vs, promoted])
      send(res, 201, promoted); return
    }

    // POST /networks/:id/heartbeat
    if (method === 'POST' && rest === '/heartbeat') {
      if (!canRead) { err(res, 403, 'Acesso negado'); return }
      const { peerId } = body
      const key = `${networkId}:${peerId}`
      presence.set(key, { networkId, peerId, userId: session.userId, status: 'online', lastSeenAt: now() })
      const active = activePeers(networkId)
      send(res, 200, { activePeers: active, shouldActivateFallback: active.length <= 4 }); return
    }

    // GET /networks/:id/peers
    if (method === 'GET' && rest === '/peers') {
      if (!canRead) { err(res, 403, 'Acesso negado'); return }
      send(res, 200, activePeers(networkId)); return
    }
  }

  err(res, 404, 'Rota não encontrada')
})

server.listen(PORT, () => {
  console.log(`\n  Mock Hub rodando em http://localhost:${PORT}`)
  console.log('  Modo: in-memory (sem Docker, sem DynamoDB)\n')
})
