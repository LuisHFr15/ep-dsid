# Rodando a UI

Há duas formas de rodar a interface como **app Electron** (desktop).

---

## Opção A — Mock server (sem Docker)

**Terminal 1 — Mock Hub:**
```bash
cd ep-dsid/electron-ui
node mock-server.mjs
```

**Terminal 2 — Electron:**
```bash
cd ep-dsid/electron-ui
npm install      # só na primeira vez
npm run dev
```

A janela do app abre automaticamente.

---

## Opção B — Hub real com DynamoDB local (Docker)

**Terminal 1 — DynamoDB local:**
```bash
cd ep-dsid
docker-compose up -d
```

**Terminal 2 — Hub:**
```bash
cd ep-dsid/hub
npm install                        # só na primeira vez
npx tsx scripts/create-table.ts   # só na primeira vez
npm run dev
```

**Terminal 3 — Electron:**
```bash
cd ep-dsid/electron-ui
npm install      # só na primeira vez
npm run dev
```

A janela do app abre automaticamente.

---

## Observações

- O hub sempre roda na porta `3000`
- Não há usuário pré-criado — use a tela de **Registro** para criar um na primeira vez
- O download de arquivos via P2P (WebTorrent) ainda não está implementado — previsto para o MVP 9
