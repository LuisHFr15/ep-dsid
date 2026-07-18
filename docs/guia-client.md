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
    infrastructure/        # adapters: hub-api, stores, fake-torrent-engine, torrent-protocol
    main/
      index.ts             # Electron main: janela + lifecycle
      ipc.ts               # IPC handlers → use cases, envelope de erro
      container.ts         # composition root
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
- `TORRENT_ENGINE` — `fake` (padrão) ou `webtorrent`
- Electron resolve `userData` automaticamente (`~/Library/Application Support/@ep-dsid-client` no macOS).

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

## 5. Engine fake vs WebTorrent real

| Engine | Quando usar | Como funciona |
|---|---|---|
| `fake` (padrão) | Dev/demo na mesma máquina ou entre máquinas que compartilham o `fake-swarm.json` | Copia o arquivo para o workspace, calcula sha1 como infoHash, registra num JSON compartilhado. Download resolve pelo registro. |
| `webtorrent` | Teste real P2P entre máquinas | `utilityProcess` com WebTorrent: seed/add reais, transferência pela rede via trackers |

Para mudar: `TORRENT_ENGINE=webtorrent npm run dev`.

---

## 6. Fluxo de teste parte-a-parte (para integrar na AWS)

### Parte 1 — Hub isolado
1. Suba o hub (local ou na EC2 da AWS) conforme `docs/guia-hub.md`.
2. Confirme `/health` respondendo 200.

### Parte 2 — Cliente vs hub (engine fake)
1. `HUB_BASE_URL=http://<ip-do-hub>:3000 npm run dev`
2. Na UI: registre um usuário, faça login, crie uma rede, publique um arquivo (dialog abre, selecione um PDF qualquer).
3. Confirme: o hub recebeu a versão (`GET /networks/:id/versions` via curl).
4. Em outro perfil (ou outra instância do app): peça acesso, aprove, baixe o arquivo.

### Parte 3 — Cliente vs hub (engine real, P2P)
1. `TORRENT_ENGINE=webtorrent HUB_BASE_URL=http://<ip>:3000 npm run dev`
2. Máquina A publica → máquina B baixa → confirme a transferência P2P (peers aparecem na aba, download completa).
3. Heartbeat aparece na aba Peers de cada um.

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
| Download não completa (webtorrent) | Nenhum peer com o conteúdo no swarm; verifique se o uploader ainda está semeando |
| `Cannot find module 'electron'` no typecheck | Use `npm run typecheck` (aponta para tsconfig.node que exclui main/preload); o typecheck completo roda com Electron instalado (`tsc --noEmit`) |
| Peers não aparecem | Heartbeat depende do main rodando `PresenceRuntime.start()`; confirme que a rota `/heartbeat` do hub está respondendo |

---

## 8. Nota sobre o que falta adaptar (imports do renderer)

Os arquivos de páginas/componentes migrados da `electron-ui/` ainda importam do `../api` (o arquivo antigo). Na primeira vez que rodar o `electron-forge start`, o Vite vai apontar os imports quebrados. Troque cada `import { ... } from '../api'` por `import { api } from '../ipc-client'` — as assinaturas são as mesmas (feitas para isso). O `useHeartbeat` foi removido; a aba Peers assinará `presence:update` (o main empurra). Esse é o ajuste final mecânico que o typecheck do renderer vai guiar.
