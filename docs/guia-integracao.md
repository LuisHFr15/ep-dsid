# Guia de Integração — testar o projeto inteiro ponta a ponta

Um roteiro único e sequencial para subir, testar e validar **cada parte do sistema** (hub, fallback, cliente) isoladamente e depois tudo junto. Feito para rodar na sua máquina pessoal (com Docker, AWS CLI e sem restrição de BitTorrent).

> Referência por componente: `docs/guia-hub.md`, `docs/guia-fallback.md`, `docs/guia-client.md`.

---

## Pré-requisitos

- **Node 20+** (recomendado 20.19+)
- **npm** (vem com o Node)
- **Docker** (para DynamoDB Local) ou conta AWS configurada
- **AWS CLI** (para inspecionar Dynamo/SQS)
- **jq** (para parsear JSON no terminal)
- **Rede sem bloqueio de BitTorrent** (para testes P2P reais)

---

## Fase 0 — Setup geral

```bash
cd ep-dsid

# instalar cada componente
(cd hub && npm install)
(cd fallback && npm install)
(cd client && npm install)
```

---

## Fase 1 — Hub isolado

### 1.1. Subir o DynamoDB Local

```bash
docker compose up -d          # usa o docker-compose.yaml da raiz
# confirma:
curl -s http://localhost:8000 && echo "dynamo local ok"
```

### 1.2. Configurar o hub

```bash
cd hub
cp .env.example .env
```

Edite o `.env`:
```
PORT=3000
AWS_REGION=us-east-1
DYNAMO_TABLE=ep-dsid-hub
DYNAMO_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
JWT_SECRET=dev-secret
SQS_QUEUE_URL=
FALLBACK_SWEEP_INTERVAL_MS=15000
PRESENCE_FLUSH_INTERVAL_MS=10000
```

> Com `SQS_QUEUE_URL` vazio os comandos de fallback são **apenas logados** (sem fila real). Ativamos a fila na Fase 3.

### 1.3. Criar a tabela e subir

```bash
npm run create-table          # idempotente
npm run dev                   # tsx watch
```

### 1.4. Validação básica

```bash
curl -s http://localhost:3000/health | jq
# {"status":"ok"}
```

### 1.5. Testes automatizados do hub

```bash
npm test                      # 84 testes (fakes em memória, sem Dynamo)
```

### 1.6. Fluxo manual (prova que o Dynamo funciona de verdade)

Copie e cole o fluxo curl completo do `docs/guia-hub.md` seção 8 (registrar alice/bob → criar rede → aprovar → publicar → baixar → heartbeat → buscar → anunciar arquivo novo → promover). Cada resposta deve bater com a tabela de endpoints da seção 7 do guia.

**Verificação de persistência:**
```bash
aws dynamodb scan --table-name ep-dsid-hub --endpoint-url http://localhost:8000 \
  --query "Items[].{pk:pk.S,sk:sk.S,type:type.S}" --output table
```
Deve mostrar chaves `USER#`, `NETWORK#`+`META`, `MEMBER#`, `VERSION#`, `CLOCK#`, `PEER#`.

---

## Fase 2 — Fallback isolado (sem SQS real)

### 2.1. Objetivo

Provar que o worker funciona: consome comandos, semeia, e se recupera após crash. Primeiro sem SQS real (injetando comandos à mão).

### 2.2. Configurar

```bash
cd fallback
cp .env.example .env
```

Para testar **sem SQS real**, crie uma fila local com `elasticmq` (Docker) ou use uma fila SQS real na AWS. A forma mais rápida é usar uma fila real (custo zero com poucas mensagens):

```bash
# criar fila na AWS (uma vez)
aws sqs create-queue --queue-name ep-dsid-fallback --region us-east-1
# copie o QueueUrl retornado
```

Edite o `.env`:
```
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/<account>/ep-dsid-fallback
SQS_WAIT_TIME_SECONDS=20
SEED_DIR=./data
```

### 2.3. Subir

```bash
npm run dev
```

Esperado:
```
restored 0/0 seeded files
fallback worker started
```

### 2.4. Injetar um comando JOIN

Em outro terminal:
```bash
aws sqs send-message --queue-url "$SQS_QUEUE_URL" --region us-east-1 \
  --message-body '{"cmd":"JOIN","networkId":"n-teste","fileId":"f-teste","infoHash":"abc123"}'
```

O worker deve consumir, logar o processamento e criar `data/seed-state.json`:
```bash
cat data/seed-state.json      # deve ter a entrada {networkId, fileId, infoHash}
```

### 2.5. Provar auto-recuperação (a garantia principal)

1. Mate o worker: `Ctrl-C` (ou `kill -9 <pid>`)
2. Suba de novo: `npm run dev`
3. Log esperado:
   ```
   restored 1/1 seeded files
   fallback worker started
   ```
   Ele voltou a semear **sem nenhum novo comando do hub**.

### 2.6. Injetar LEAVE

```bash
aws sqs send-message --queue-url "$SQS_QUEUE_URL" --region us-east-1 \
  --message-body '{"cmd":"LEAVE","networkId":"n-teste","fileId":"f-teste"}'
```

Worker deve dropar o torrent e limpar `data/seed-state.json`.

### 2.7. Testes automatizados do fallback

```bash
npm test                      # 33 testes (fakes)
```

---

## Fase 3 — Hub + Fallback juntos (SQS real)

### 3.1. Configurar a fila SQS nos dois lados

Use a mesma `SQS_QUEUE_URL` no **hub** e no **fallback**:

Hub `.env`: adicione `SQS_QUEUE_URL=https://sqs...`  
Fallback `.env`: mesma URL (já deveria estar do passo 2.2).

Reinicie ambos (o hub precisa do restart para pegar a nova env).

### 3.2. Forçar o limiar

1. No hub: crie uma rede + publique um arquivo (curl ou via o cliente).
2. Bata heartbeat de ≤ 4 peers (ou simplesmente deixe sem peers).
3. Aguarde `FALLBACK_SWEEP_INTERVAL_MS` (15s): o hub deve enfileirar um `JOIN`.
4. O fallback consome e semeia (veja o log + `data/seed-state.json`).

### 3.3. Subir para > 4 peers

5. Bata heartbeat de 5 peers distintos.
6. Aguarde 15s: o hub enfileira `LEAVE`.
7. O fallback consome, para de semear e limpa os dados.

### 3.4. Flush de presença

```bash
# imediatamente após um heartbeat:
aws dynamodb scan --table-name ep-dsid-hub --endpoint-url http://localhost:8000 \
  --filter-expression "begins_with(sk, :p)" --expression-attribute-values '{":p":{"S":"PEER#"}}' --output table
# pode estar vazio (ainda na RAM)

# espere PRESENCE_FLUSH_INTERVAL_MS (10s) e repita:
# agora o PEER# deve aparecer (flushed da RAM para o Dynamo)
```

---

## Fase 4 — Cliente isolado (engine fake)

### 4.1. Configurar e subir

```bash
cd client
# O .env.example pode não existir; os defaults valem.
# Se o hub estiver em localhost:3000, basta:
npm run dev                   # electron-forge start
```

> **Se o binário do Electron falhar no download**, exporte `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` e tente novamente.

### 4.2. Validar na UI

1. Registre um usuário e faça login.
2. Crie uma rede (pode ser pública para simplificar).
3. Publique um arquivo (botão → dialog de arquivo → selecione qualquer PDF).
4. Veja o arquivo aparecer na aba "Arquivo" com `infoHash` (um sha1 hex de 40 chars, não mais um UUID falso).
5. Em outro perfil (ou relogin com outro user): peça acesso, aprove, baixe.

### 4.3. Verificação de que o IPC funciona

Abra DevTools (Ctrl+Shift+I / Cmd+Opt+I) e no console:
```js
window.clientApi.invoke('health:check').then(console.log)
// { ok: true, data: { status: "ok" } }
```

### 4.4. Testes automatizados do cliente

```bash
npm test                      # 8 testes (core, sem Electron)
npm run typecheck             # tsc do core
```

---

## Fase 5 — Cliente com WebTorrent real (P2P)

### 5.1. Trocar engine

```bash
TORRENT_ENGINE=webtorrent npm run dev
```

### 5.2. Teste entre duas máquinas (ou duas instâncias)

- Máquina A: publica um arquivo → vira seeder.
- Máquina B: baixa → deve ver progresso P2P; ao completar, vira seeder também.
- Aba "Peers": ambos devem se ver (heartbeat aparece).

### 5.3. Observar o fallback entrar

- Máquina A e B fecham o app.
- Após 30s (timeout de presença) + 15s (sweep), o hub enfileira `JOIN`.
- O fallback (se estiver rodando) consome e semeia.
- Máquina C (um terceiro) abre o app → baixa do fallback.

---

## Fase 6 — Teste com os amigos (cenário real)

### 6.1. Infraestrutura

| Componente | Onde | Porta/URL |
|---|---|---|
| Hub | EC2 Principal (IP público) | `:3000` |
| DynamoDB | AWS gerenciado (ou DynamoDB Local no EC2) | — |
| Fila SQS | AWS gerenciado | `SQS_QUEUE_URL` compartilhado |
| Fallback | EC2 Fallback (instância separada) | — (worker, sem HTTP) |
| Clientes | Cada máquina pessoal | — |

### 6.2. Deploy

1. **Hub no EC2 Principal:**
   ```bash
   # instalar node 20+, clonar o repo, npm install no hub
   # .env com AWS_REGION, DYNAMO_TABLE, DYNAMO_ENDPOINT= (vazio → AWS real),
   # JWT_SECRET forte, SQS_QUEUE_URL apontando para a fila
   npm run create-table
   npm run start                 # (ou node dist/main/index.js via pm2)
   ```

2. **Fallback no EC2 Fallback:**
   ```bash
   # instalar node 20+, clonar, npm install no fallback
   # .env com AWS_REGION, SQS_QUEUE_URL (mesma fila), SEED_DIR=/opt/ep-dsid/data
   npm run start
   ```

3. **Clientes nos amigos:**
   ```bash
   # instalar node 20+, npm install no client
   HUB_BASE_URL=http://<ip-ec2-principal>:3000 TORRENT_ENGINE=webtorrent npm run dev
   ```

### 6.3. Roteiro de apresentação

1. Alice registra e cria uma rede privada "Relatório Final".
2. Bob e Carol pedem acesso → Alice aprova.
3. Alice publica o arquivo (PDF de 10MB qualquer).
4. Bob e Carol baixam P2P (progresso na UI).
5. Mostra: aba Peers com os 3 peers, heartbeat a cada 10s.
6. Alice fecha o app → peer some após 30s.
7. Se Alice e Bob fecham (≤4 → fallback ativa), Carol continua baixando do fallback.
8. Alice anuncia um arquivo novo → o antigo é deprecado; o DAG mostra só o novo.
9. Promove um ramo concorrente (se houver) → resolve o conflito sem apagar nada.

---

## Checklist rápido (antes da apresentação)

- [ ] Hub subiu e `/health` responde
- [ ] DynamoDB tem a tabela com as chaves corretas
- [ ] Fila SQS criada e compartilhada entre hub/fallback
- [ ] Fallback subiu e `restored 0/0` ou `restored N/N` no log
- [ ] Cliente abre a janela Electron e faz login
- [ ] Publicar arquivo gera infoHash sha1 de 40 chars
- [ ] Download P2P entre duas máquinas funciona (aba Peers mostra ambos)
- [ ] Heartbeat aparece no hub (`GET /networks/:id/peers`)
- [ ] Fallback entra quando peers ≤ 4 (log `JOIN` no fallback)
- [ ] `Ctrl-C` no hub/fallback encerra limpo ("shutting down" + flush)

---

## Troubleshooting geral

| Sintoma | Onde verificar |
|---|---|
| Hub não responde | EC2: porta 3000 aberta no Security Group? `npm run start` rodando? |
| Cliente não conecta ao hub | `HUB_BASE_URL` correto? CORS não é problema (IPC, não browser direto) |
| Download não progride | WebTorrent precisa de trackers acessíveis; verifique se não há firewall bloqueando UDP |
| Fallback não consome | `SQS_QUEUE_URL` idêntica nos dois? Credenciais com `sqs:ReceiveMessage`? |
| Presença some rápido demais | Heartbeat não está batendo (cliente fechou? rede caiu?); verifique log do hub |
| Versão antiga aparece como "atual" | Lamport clock — nunca acontece se o hub não reiniciou e a tabela não foi recriada; faça `GET /versions` para conferir |

Para troubleshooting por componente: `docs/guia-hub.md` §11, `docs/guia-fallback.md` §9, `docs/guia-client.md` §7.
