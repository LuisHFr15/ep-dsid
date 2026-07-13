# Guia do Hub — rodar, navegar e depurar

Este guia é para levar o projeto à sua máquina (com Docker e/ou AWS) e testar o **hub** de verdade. Ele cobre: como o diretório está organizado, como subir o servidor contra DynamoDB Local ou AWS real, a referência dos endpoints, um fluxo `curl` ponta a ponta, e — a parte mais importante — como **depurar manualmente o que os testes automatizados não cobrem**.

> A especificação completa do sistema está no `README.md` da raiz do repositório. Este guia é operacional; o README é a fonte de verdade do "porquê".

---

## 1. Visão geral em 30 segundos

O hub é o **plano de controle** do sistema: um servidor HTTP/JSON (Express + TypeScript) que fala com o **DynamoDB**. Ele coordena descoberta de redes, autenticação, controle de acesso, versionamento e presença de peers. O hub **nunca transfere bytes de arquivo** — isso é papel da rede P2P (WebTorrent), que vive nos componentes `client/` e `fallback/` (fora do escopo deste guia; dependem de WebTorrent).

O que "upload"/"download" significam aqui: **upload = announce** (o cliente calcula o `infoHash` e o hub guarda os metadados); **download = resolver** o `infoHash`/`magnet` da versão atual. Por isso o hub é 100% testável sem BitTorrent.

Os quatro fluxos da spec estão implementados: publicação/acesso (Fluxo 1), heartbeat/presença (Fluxo 2), e o produtor de comandos de fallback via SQS (Fluxo 4). O download P2P (Fluxo 3) é do cliente.

---

## 2. Mapa do diretório (arquitetura limpa)

O código do hub segue **arquitetura limpa**: as dependências apontam para dentro. A regra é simples — camadas de fora conhecem as de dentro, nunca o contrário.

```
interface  →  application  →  domain
                  ↑
          infrastructure  (implementa as "portas" do domínio/aplicação)
                  ↑
                main  (o único lugar que monta tudo)
```

Árvore de `hub/src/` comentada:

```
domain/            # O QUÊ existe. Entidades puras (sem libs) + "portas" (interfaces).
  user/            #   User + UserRepository (porta)
  network/         #   Network, Membership + repositórios (portas)
  file/            #   FileVersion + FileVersionRepository (porta)
  peer/            #   PeerPresence, PeerPresenceStore (porta), presence-policy (regra dos 30s)
  errors/          #   AppError + subclasses (mapeadas para status HTTP)

application/       # A LÓGICA. Um arquivo = uma operação (caso de uso).
  auth/            #   register-user, authenticate-user
  network/         #   create-network, request-access, decide-access, list-*, access-guards
  file/            #   publish-version, announce-file, get-current-file, list-versions, promote-version
  presence/        #   register-heartbeat, list-active-peers, evaluate-fallback
  ports/           #   interfaces de serviços (password-hasher, token-service, lamport-clock, command-queue)

infrastructure/    # O MUNDO EXTERNO. Adapters que implementam as portas.
  config/env.ts    #   configuração tipada (lida de variáveis de ambiente, validada com zod)
  dynamo/          #   os 6 adapters DynamoDB (user, network, membership, file-version, lamport-clock, peer-presence)
  sqs/             #   SqsCommandQueue (real) e LoggingCommandQueue (quando não há fila)
  crypto/          #   bcrypt (senha) e jwt (token)
  memory/          #   InMemoryPeerPresenceStore + CachingPeerPresenceStore (cache quente da presença)
  scheduler/       #   interval-scheduler (timers periódicos)

interface/http/    # A BORDA HTTP.
  routes.ts        #   todas as rotas e quais middlewares cada uma usa
  controllers/     #   controllers finos: leem req, chamam o caso de uso, devolvem resposta
  middleware/      #   authenticate (Bearer JWT), validate (zod), error-handler
  schemas/         #   schemas zod de validação dos corpos das requisições
  server.ts        #   monta o app Express

main/
  container.ts     #   COMPOSITION ROOT — instancia adapters e injeta nos casos de uso. Comece por aqui.
  index.ts         #   bootstrap: sobe o servidor, inicia os timers, trata shutdown

scripts/create-table.ts   # cria a tabela DynamoDB (single-table + índice gsi1)
tools/simulator/          # simulador HTTP multi-peer (gera carga realista)
src/testing/              # fakes em memória usados pelos testes
```

**Como ler o código para entender um endpoint:** siga a cadeia `routes.ts → controller → caso de uso → porta → adapter`.

Exemplo — `POST /heartbeat`:
1. `routes.ts`: `router.post("/heartbeat", authenticate, validateBody(heartbeatSchema), presenceController.register)` — exige JWT e valida o corpo.
2. `controllers/presence-controller.ts` (`register`): lê `networkId`/`peerId` do corpo e `userId` do token, chama o caso de uso.
3. `application/presence/register-heartbeat.ts`: valida a rede, checa acesso, grava a presença, aplica a expiração de 30s, devolve a contagem de ativos.
4. Porta `domain/peer/peer-presence-store.ts` → adapter em `infrastructure/` (o `CachingPeerPresenceStore`, que guarda em RAM e drena para o `DynamoPeerPresenceStore`).

Se quiser saber **como uma dependência é montada**, `main/container.ts` é o mapa: é o único lugar onde os adapters concretos são criados e injetados.

---

## 3. Setup

Pré-requisitos: **Node 20+** e **npm**. Para os dados, **Docker** (opção A) ou **AWS CLI + conta** (opção B).

```bash
cd hub
npm install
cp .env.example .env
```

Variáveis do `.env` (ver `.env.example`):

| Variável | Obrigatória? | Default | Para quê |
|---|---|---|---|
| `PORT` | não | `3000` | porta HTTP do hub |
| `AWS_REGION` | **sim** | — | região (use `local` no Dynamo Local) |
| `DYNAMO_TABLE` | **sim** | — | nome da tabela (ex.: `ep-dsid-hub`) |
| `DYNAMO_ENDPOINT` | não | vazio | vazio = AWS real; `http://localhost:8000` = Dynamo Local |
| `AWS_PROFILE` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | depende | — | credenciais (perfil OU chaves) |
| `JWT_SECRET` | **sim** | — | segredo de assinatura do JWT |
| `JWT_EXPIRES_IN` | não | `1h` | validade do token |
| `BCRYPT_ROUNDS` | não | `10` | custo do hash de senha |
| `SQS_QUEUE_URL` | não | vazio | vazio = comandos de fallback só logados; com URL = enviados à fila |
| `FALLBACK_SWEEP_INTERVAL_MS` | não | `15000` | intervalo do avaliador de fallback |
| `PRESENCE_FLUSH_INTERVAL_MS` | não | `10000` | intervalo do flush de presença (RAM → Dynamo) |

Se faltar uma variável obrigatória, o hub **falha ao subir** com uma mensagem clara (`invalid environment configuration`).

---

## 4. Opção A — DynamoDB Local (Docker)

O jeito mais simples de iterar: sem custo, sem credenciais reais.

```bash
# sobe o DynamoDB Local na porta 8000
docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local
```

Ou com `docker-compose.yml`:

```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
```

`.env` para o Dynamo Local:

```
AWS_REGION=local
DYNAMO_TABLE=ep-dsid-hub
DYNAMO_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
JWT_SECRET=dev-secret
```

> O SDK da AWS **exige credenciais mesmo no Dynamo Local** — qualquer valor fake (`local`/`local`) serve.

Crie a tabela e inspecione itens:

```bash
npm run create-table
# inspecionar tudo que está gravado:
aws dynamodb scan --table-name ep-dsid-hub --endpoint-url http://localhost:8000
```

---

## 5. Opção B — AWS real

Testa o caminho de produção de verdade.

`.env` para AWS real (deixe `DYNAMO_ENDPOINT` vazio):

```
AWS_REGION=us-east-1
DYNAMO_TABLE=ep-dsid-hub
DYNAMO_ENDPOINT=
AWS_PROFILE=seu-perfil-pessoal
JWT_SECRET=troque-este-segredo
```

```bash
npm run create-table   # idempotente: se a tabela já existe, apenas avisa
```

> **Segurança:** use uma conta/perfil **pessoal**, não corporativa. A tabela é `PAY_PER_REQUEST` (custo ~zero em teste). Ao terminar, apague:
> ```bash
> aws dynamodb delete-table --table-name ep-dsid-hub --region us-east-1
> ```

---

## 6. Subir e checar

```bash
npm run dev     # tsx watch — recarrega ao salvar
# esperado no log: hub listening on 3000
```

```bash
curl -s localhost:3000/health
# {"status":"ok"}
```

No log você verá, além do boot: mensagens do avaliador de fallback e do flush de presença (se algo falhar, aparece `fallback evaluation failed` / `presence flush failed`).

---

## 7. Referência de endpoints (14 rotas)

Rotas públicas: `/register`, `/auth`, `/health`. **Todas as demais exigem** o header `Authorization: Bearer <jwt>`.

| Método | Rota | Auth | Corpo (campos) | Resposta |
|---|---|---|---|---|
| POST | `/register` | pública | `{user, password}` | 201 `{id, username, createdAt}` |
| POST | `/auth` | pública | `{user, password}` | 200 `{jwt}` |
| GET | `/health` | pública | — | 200 `{status:"ok"}` |
| GET | `/networks?q=&tag=` | Bearer | — (query opcional) | 200 `[network...]` |
| POST | `/networks` | Bearer | `{title, description?, tags?, accessMode, updateMode}` | 201 `{network}` |
| POST | `/networks/:id/access-requests` | Bearer | — | 202 `{status:"pending"}` ou 200 `{status:"approved"}` |
| GET | `/networks/:id/access-requests` | Bearer (owner) | — | 200 `[{userId, requestedAt}]` |
| POST | `/networks/:id/access-decisions` | Bearer (owner) | `{userId, decision}` | 200 `{userId, status}` |
| POST | `/networks/:id/files` | Bearer (owner) | `{infoHash, filename, magnet?, size?}` | 201 `{fileId, versionId, lamportTs}` |
| POST | `/networks/:id/versions` | Bearer (membro) | `{infoHash, filename, magnet?, size?, parentVersionId?}` | 201 `{fileId, versionId, lamportTs, parentVersionId, concurrent}` |
| GET | `/networks/:id/file?versionId=` | Bearer (acesso) | — | 200 `{fileId, versionId, infoHash, magnet, filename, lamportTs, parentVersionId}` |
| GET | `/networks/:id/versions` | Bearer (acesso) | — | 200 `{fileId, currentVersionId, versions[]}` |
| POST | `/networks/:id/versions/:versionId/promote` | Bearer (membro) | — | 201 `{fileId, versionId, lamportTs, parentVersionId}` |
| GET | `/networks/:id/peers` | Bearer (acesso) | — | 200 `{networkId, activePeers:[{peerId, lastSeenAt}]}` |
| POST | `/heartbeat` | Bearer | `{networkId, peerId}` | 200 `{networkId, peerId, activePeers, shouldActivateFallback}` |

Notas:
- `accessMode`: `"private"` \| `"public"`; `updateMode`: `"centralized"` \| `"collaborative"`; `decision`: `"approve"` \| `"reject"`.
- Rede **privada** exige aprovação do dono antes de liberar o arquivo (o `GET .../file` responde 403 enquanto pendente). Rede **pública** libera direto.
- `POST /networks/:id/files` **troca o arquivo ativo** (cria um novo, depreciando o anterior) — só o dono. `POST /networks/:id/versions` adiciona uma versão ao arquivo já ativo.

---

## 8. Fluxo `curl` ponta a ponta

Cole no terminal (precisa de `jq`). Assume o hub em `localhost:3000`.

```bash
BASE=http://localhost:3000

# 1) dois usuários (guarda o id do bob — é ele que a aprovação usa, não o username)
curl -s -X POST $BASE/register -H 'content-type: application/json' -d '{"user":"alice","password":"pw"}'
BOB_ID=$(curl -s -X POST $BASE/register -H 'content-type: application/json' -d '{"user":"bob","password":"pw"}' | jq -r .id)
echo "bob=$BOB_ID"

# 2) login (guarda os tokens)
TA=$(curl -s -X POST $BASE/auth -H 'content-type: application/json' -d '{"user":"alice","password":"pw"}' | jq -r .jwt)
TB=$(curl -s -X POST $BASE/auth -H 'content-type: application/json' -d '{"user":"bob","password":"pw"}' | jq -r .jwt)

# 3) alice cria uma rede privada colaborativa (com tags)
NET=$(curl -s -X POST $BASE/networks -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"title":"Relatorio","description":"anual","tags":["report","2026"],"accessMode":"private","updateMode":"collaborative"}' | jq -r .id)
echo "rede=$NET"

# 4) bob pede acesso (202 pending) e tenta baixar (403)
curl -s -X POST $BASE/networks/$NET/access-requests -H "authorization: Bearer $TB"
curl -s -o /dev/null -w "download antes de aprovar: %{http_code}\n" $BASE/networks/$NET/file -H "authorization: Bearer $TB"

# 5) alice lista pendentes e aprova bob (usando o BOB_ID capturado no passo 1)
curl -s $BASE/networks/$NET/access-requests -H "authorization: Bearer $TA" | jq
curl -s -X POST $BASE/networks/$NET/access-decisions -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"userId":"'$BOB_ID'","decision":"approve"}' | jq

# 6) alice publica a versão 1 e a versão 2
V1=$(curl -s -X POST $BASE/networks/$NET/versions -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"infoHash":"HASH1","filename":"a.pdf","magnet":"magnet:?xt=urn:btih:HASH1"}' | jq -r .versionId)
curl -s -X POST $BASE/networks/$NET/versions -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"infoHash":"HASH2","filename":"a.pdf"}' | jq

# 7) bob baixa a versão atual (v2) e uma versão específica (v1)
curl -s $BASE/networks/$NET/file -H "authorization: Bearer $TB" | jq
curl -s "$BASE/networks/$NET/file?versionId=$V1" -H "authorization: Bearer $TB" | jq

# 8) listar o DAG de versões
curl -s $BASE/networks/$NET/versions -H "authorization: Bearer $TB" | jq

# 9) presença: bob bate heartbeat e lista peers
curl -s -X POST $BASE/heartbeat -H "authorization: Bearer $TB" -H 'content-type: application/json' \
  -d '{"networkId":"'$NET'","peerId":"peer-bob"}' | jq
curl -s $BASE/networks/$NET/peers -H "authorization: Bearer $TB" | jq

# 10) busca por atributos
curl -s "$BASE/networks?q=relatorio" -H "authorization: Bearer $TA" | jq '.[].title'
curl -s "$BASE/networks?tag=report"  -H "authorization: Bearer $TA" | jq '.[].title'

# 11) alice troca o arquivo ativo (novo fileId; o antigo é deprecado mas ainda acessível por versionId)
curl -s -X POST $BASE/networks/$NET/files -H "authorization: Bearer $TA" -H 'content-type: application/json' \
  -d '{"infoHash":"HASH3","filename":"b.pdf"}' | jq
curl -s $BASE/networks/$NET/file -H "authorization: Bearer $TA" | jq   # agora resolve o arquivo novo
```

> **Sobre identidade:** o `userId` usado em membership/aprovação é o **`id`** (UUID) que o `/register` devolve — não o username. Por isso o passo 1 guarda `BOB_ID`. Internamente, esse `id` é o `sub` do JWT.

---

## 9. Rodar os testes automatizados

```bash
npm test           # 84 testes (Vitest) — NÃO precisa de Dynamo/AWS: usa fakes em memória
npm run test:watch # modo watch
npx tsc -p tsconfig.json --noEmit   # só checagem de tipos
npm run build      # compila para dist/
```

A suíte cobre os **casos de uso** e a lógica de domínio (Lamport, DAG, LWW, transições de acesso, autorização, expiração de presença, cache) com repositórios fake — por isso roda sem infra. O que ela **não** cobre é a integração real com AWS; isso é a próxima seção.

---

## 10. Depurar o que os testes NÃO cobrem

Esta é a razão de você estar rodando na sua máquina. Cada item abaixo depende de infra real (Dynamo/SQS) ou de tempo real, então não está nos testes automatizados.

### 10.1. Adapters DynamoDB (os 6)
Só exercitam de verdade com Dynamo Local/real. Depois de rodar o fluxo da seção 8, faça um `scan` e confira o **layout single-table**:

```bash
aws dynamodb scan --table-name ep-dsid-hub --endpoint-url http://localhost:8000 \
  --query "Items[].{pk:pk.S,sk:sk.S,type:type.S}" --output table
```

Você deve ver as chaves: `USER#<username>`, `NETWORK#<id>` + `sk=META`, `MEMBER#<userId>`, `VERSION#<lamport com 12 dígitos>#<versionId>`, `CLOCK#<id>`, `PEER#<peerId>`.

- **Contador Lamport atômico**: publique várias versões (mesmo em paralelo com `&`) e confira que os `lamportTs` são únicos e crescentes — o `CLOCK#` incrementa sem colisão.
- **Conditional write (unicidade)**: registre o mesmo usuário duas vezes → a segunda deve dar **409 Conflict** (vem do `attribute_not_exists` no adapter).
- **GSI de catálogo**: `GET /networks` lê via índice `gsi1` (`gsi1pk=CATALOG`). Confirme que redes criadas aparecem na listagem.

### 10.2. Produtor de fallback (SQS + limiar)
A regra: **≤ 4 peers ativos → o servidor deve entrar (JOIN)**; **> 4 → sair (LEAVE)**. O hub reavalia a cada `FALLBACK_SWEEP_INTERVAL_MS` (15s) e **só enfileira na transição** (não repete o mesmo comando).

- **Sem `SQS_QUEUE_URL`** (mais simples): os comandos são **logados** no console. Procure por `fallback command (no queue configured)` com o JSON do `JOIN`/`LEAVE`.
- **Com fila real**: aponte `SQS_QUEUE_URL` para uma fila sua e espie:
  ```bash
  aws sqs receive-message --queue-url "$SQS_QUEUE_URL" --max-number-of-messages 10
  ```

Roteiro: crie uma rede + publique um arquivo, bata heartbeat de 1–4 peers (peerIds diferentes) e observe um `JOIN` no próximo ciclo; suba para 5+ peers e observe um `LEAVE`. Reduza para ≤4 de novo (deixando peers expirarem) e veja outro `JOIN`.

> Para acelerar, baixe `FALLBACK_SWEEP_INTERVAL_MS` no `.env` (ex.: `3000`).

### 10.3. Flush de presença (RAM → Dynamo)
A presença vive **em RAM** (fonte quente) e é drenada para o Dynamo a cada `PRESENCE_FLUSH_INTERVAL_MS` (10s). Para ver isso:

1. Bata um heartbeat.
2. `scan` **imediato** filtrando `PEER#` → **não aparece** (ainda só na RAM).
3. Espere o intervalo de flush e `scan` de novo → agora o item `PEER#` **aparece**.

Isso comprova o §4.3 da spec ("RAM é a fonte de roteamento; o banco serve para auditoria"). O `GET /networks/:id/peers`, em contraste, reflete a RAM **na hora**.

### 10.4. Expiração de presença (30s)
1. Bata heartbeat de um peer → `GET /networks/:id/peers` mostra ele.
2. Pare de bater e espere **mais de 30s**.
3. `GET .../peers` de novo → ele **some** (marcado offline).

O limite de 30s é uma constante de domínio em `domain/peer/presence-policy.ts` (`PEER_TIMEOUT_MS`) — se quiser acelerar o teste, dá para reduzir ali temporariamente.

### 10.5. Graceful shutdown
Com o hub rodando (`npm run dev`), pressione **Ctrl-C** (SIGINT):
- o log deve mostrar `received SIGINT, shutting down`;
- ele faz um **flush final** da presença (nada da última janela se perde) e encerra limpo, sem travar.

Confirme com um `scan` depois que a presença mais recente foi persistida.

### 10.6. Recuperação no restart (§7.6)
Mate o hub e suba de novo. `GET /networks/:id/peers` volta **vazio** — a RAM começa fria. Conforme os peers voltam a bater heartbeat, a lista se reconstrói. É o comportamento esperado ("no restart, assume todos offline").

### 10.7. Simulador multi-peer
Com o hub no ar, gere carga realista de vários peers:

```bash
node tools/simulator/main.mjs
```

Ele registra/loga vários peers, cria redes, publica e bate heartbeats seguindo uma tabela por "ticks", e imprime um **relatório final** (quantas ações passaram/falharam). Há dois modos no topo do `main.mjs`: `fixed` (determinístico) e `random` (com seed). Bom para observar a contagem de ativos e a regra de fallback em movimento.

---

## 11. Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `invalid environment configuration` ao subir | falta uma variável obrigatória no `.env` (`AWS_REGION`, `DYNAMO_TABLE`, `JWT_SECRET`) |
| `401 UNAUTHORIZED` numa rota de rede | faltou o header `Authorization: Bearer <jwt>` (ou token expirado) |
| `403 FORBIDDEN` no `GET .../file` | rede privada e o usuário ainda não foi aprovado (ou não é dono/membro) |
| `ResourceNotFoundException` | esqueceu de rodar `npm run create-table` (ou `DYNAMO_TABLE` diferente) |
| Erro de credenciais no Dynamo Local | o SDK exige credenciais mesmo local — ponha valores fake (`AWS_ACCESS_KEY_ID=local`) |
| `tsx: command not found` | rode `npm install` dentro de `hub/` |
| Porta 3000/8000 em uso | mude `PORT` no `.env` ou pare o processo que ocupa a porta |
| Comandos de fallback não chegam na fila | `SQS_QUEUE_URL` vazio (só loga) ou credenciais sem permissão de `sqs:SendMessage` |

---

Dúvidas sobre o "porquê" de qualquer decisão (por que Lamport, por que fallback por limiar, por que AP) → `README.md` da raiz, que é a especificação completa.
