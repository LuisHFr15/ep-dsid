# Guia do Cliente — rodar, testar e integrar

Este guia é para sua máquina pessoal (onde Electron e WebTorrent funcionam). Cobre: como o app unificado está estruturado, como subir em modo fake vs real, o fluxo de teste parte-a-parte para integrar na AWS, e o roteiro para testar com os amigos.

> Specs completas: `README.md` raiz. Hub: `docs/guia-hub.md`. Fallback: `docs/guia-fallback.md`.

---

## 1. Visão geral

O cliente é um **app Electron** (§3.1): um **processo de UI** (React) que lida com navegação e uma **janela** ao hub, e um **subprocesso de torrent** (utility process) que hospeda o WebTorrent em background.

Toda a comunicação com o hub passa por **IPC** (renderer → main → use cases → HubApi). O renderer nunca faz HTTP direto. Sessão, estado e arquivos vivem em `userData`.

A engine de torrent é **selecionável**: `TORRENT_ENGINE=fake` (copia arquivos locais, gera sha1 como infoHash — perfeito para demo/dev sem rede) ou `TORRENT_ENGINE=webtorrent` (o real). Por padrão usa `fake`.

---

## 2. Mapa do diretório

```
client/
  package.json             # Electron Forge + Vite + React + vitest
  forge.config.ts          # build: main + preload + renderer
  vite.*.config.ts         # configs Vite por target
  index.html               # entry HTML do renderer
  tsconfig.json            # renderer (Bundler, JSX)
  tsconfig.node.json       # core/main/preload (NodeNext)
  src/
    domain/                # tipos puros + portas (zero I/O)
    application/           # use cases (um por operação; PresenceRuntime start/stop)
    infrastructure/        # adapters: hub-api, stores, webtorrent-engine
    main/
      index.ts             # Electron main: janela + lifecycle + wiring
      ipc.ts               # registerIpcHandlers (envelope de erro)
      ipc-map.ts           # mapa canal → use case
      electron-container.ts # composition root (userData, sessão única)
    preload/preload.ts     # contextBridge: invoke + on
    renderer/              # React: pages, components, hooks, contexts, ipc-client, types, styles
    testing/               # fakes para vitest
```

---

## 3. Setup

```bash
cd client
npm install                     # baixa Electron + deps React + vitest
cp .env.example .env            # (se existir; senão os defaults valem)
```

Variáveis de ambiente relevantes (todas opcionais com default):
- `HUB_BASE_URL` — padrão `http://localhost:3000`
- Electron resolve `userData` automaticamente (`~/Library/Application Support/@ep-dsid-client` no macOS) — é onde ficam sessão, estado, workspace e transfers do perfil.

---

## 4. Rodar

```bash
npm run dev                 # electron-forge start (abre a janela)
```

Em dev o DevTools abre automaticamente. O hub precisa estar no ar (local ou remoto).

**Sem Electron (só core + testes):**
```bash
npm run typecheck           # tsc -p tsconfig.node.json --noEmit
npm test                    # vitest (core, sem Electron/React)
```

---

## 5. Engine de torrent — WebTorrent

O cliente usa **WebTorrent real** (`WebTorrentEngine`, no processo main). Publicar semeia o arquivo (`client.seed`), gerando `infoHash`/`magnet` reais; baixar entra no swarm pelo magnet (`client.add`) e grava no workspace. Por isso o download P2P só funciona numa rede **sem bloqueio de BitTorrent** (não a corporativa).

> Não há mais engine "fake". O `npm install` baixa o `webtorrent`; se o download travar por proxy, use `ELECTRON_MIRROR`/`npm_config_registry` conforme sua rede.

---

## 6. Fluxo de teste parte-a-parte (para integrar na AWS)

### Parte 1 — Hub isolado
1. Suba o hub (local ou na EC2 da AWS) conforme `docs/guia-hub.md`.
2. Confirme `/health` respondendo 200.

### Parte 2 — Cliente vs hub (uma máquina)
1. `HUB_BASE_URL=http://<ip-do-hub>:3000 npm run dev`
2. Na UI: registre um usuário, faça login, crie uma rede, publique um arquivo (o botão abre o dialog nativo, selecione um arquivo qualquer).
3. Confirme: o hub recebeu a versão (`GET /networks/:id/versions` via curl) e o `infoHash` é um sha1 real de 40 chars.

### Parte 3 — Download P2P (duas máquinas)
1. Máquina A publica um arquivo → vira seeder.
2. Máquina B (`HUB_BASE_URL` apontando pro mesmo hub): pede acesso, é aprovada, baixa → confirme a transferência P2P e o arquivo no workspace.
3. Heartbeat aparece na aba Peers de cada um (atualiza a cada 10s).

### Parte 4 — Teste com amigos
1. Hub na AWS (EC2 com IP público).
2. Cada amigo sobe o cliente apontando para o hub.
3. Criam redes, publicam, pedem acesso, baixam entre si.
4. Alguém fecha o app → após 30s o peer some da lista; se a rede cai para ≤4, o hub enfileira JOIN para o fallback.

---

## 7. Troubleshooting

| Sintoma | Causa provável |
|---|---|
| Janela não abre | `npm install` não rodou (binário Electron ausente) |
| Tela branca | Renderer não buildou; veja erros no terminal do forge |
| Login falha / 401 | Hub não está no ar, ou `HUB_BASE_URL` errado |
| Upload não faz nada | Dialog abriu mas nenhum arquivo selecionado; ou hub sem a rede criada |
| Download não completa | Nenhum peer com o conteúdo no swarm; verifique se o uploader ainda está semeando; rede pode estar bloqueando BitTorrent |
| `Cannot find module 'electron'` no typecheck | `npm run typecheck` cobre só o core (`tsconfig.node.json`); o renderer/main só typechecam com as deps instaladas (`npm install`) |
| Peers não aparecem | A aba Peers busca `GET /networks/:id/peers` a cada 10s; confirme que você bateu heartbeat (o main envia) e que o hub responde a rota |

---

## 8. Arquitetura da fronteira renderer ↔ main

Todo acesso ao hub passa por **IPC**: o renderer chama `api.*` (`src/renderer/ipc-client.ts`) → `window.clientApi.invoke(canal)` (preload) → `registerIpcHandlers` (main) → use case do core (`electron-container.ts`) → `HubApi`. O renderer **nunca vê o JWT**: o processo main é o dono da sessão (persistida em `userData`). Se precisar adicionar um endpoint novo: exponha em `ipc-client.ts`, registre o canal em `ipc-map.ts`, e conecte o use case no `electron-container.ts`.
