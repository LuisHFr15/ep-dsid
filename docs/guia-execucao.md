# Guia de Execução — rodar todas as instâncias para teste

Guia rápido para colocar o projeto inteiro no ar. Para o passo a passo detalhado
de cada componente veja `guia-integracao.md`, `guia-hub.md`, `guia-fallback.md` e
`guia-client.md`. O "porquê" de cada decisão está no `README.md` da raiz.

O projeto tem três componentes independentes:

| Componente | O que é | Precisa de |
|---|---|---|
| **hub** | API HTTP central (plano de controle) | Node + DynamoDB |
| **fallback** | worker que semeia arquivos quando a rede tem poucos peers | Node + SQS + rede sem bloqueio de BitTorrent |
| **client** | app Electron (interface + WebTorrent) | Node + rede sem bloqueio de BitTorrent |

> **Importante:** o **cliente** (Electron/WebTorrent) e o **fallback** (WebTorrent)
> dependem de tráfego P2P/BitTorrent. Redes corporativas costumam bloquear isso —
> rode-os numa máquina pessoal. O **hub** roda em qualquer lugar.

---

## 1. Pré-requisitos

- Node.js 20+ e npm
- Docker (para rodar o DynamoDB Local sem precisar de conta AWS)
- Opcional: conta AWS (para o teste "real" com DynamoDB e SQS de verdade)

> Em rede corporativa o npm pode apontar para um registry interno. Se `npm install`
> falhar com `ENOTFOUND` ou timeout, force o registry público:
> `npm install --registry https://registry.npmjs.org`

---

## 2. Subir o Hub (local, sem AWS)

```bash
# na raiz do repo — sobe o DynamoDB Local na porta 8000
docker-compose up -d

cd hub
cp .env.example .env
# edite o .env: veja a tabela de variáveis abaixo (para local, aponte o DYNAMO_ENDPOINT)
npm install --registry https://registry.npmjs.org
npm run create-table   # cria a tabela ep-dsid-hub (idempotente)
npm run dev            # sobe o hub em http://localhost:3000
```

`.env` mínimo para rodar local com DynamoDB Local:

```
PORT=3000
AWS_REGION=us-east-1
DYNAMO_TABLE=ep-dsid-hub
DYNAMO_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
JWT_SECRET=um-segredo-qualquer-para-teste
```

Cheque que subiu:

```bash
curl http://localhost:3000/health   # -> {"status":"ok"} (ou similar)
```

---

## 3. Subir o Cliente (máquina pessoal)

```bash
cd client
npm install --registry https://registry.npmjs.org
HUB_BASE_URL=http://localhost:3000 npm run dev
```

> O default de `HUB_BASE_URL` no app aponta para um EC2 de teste. Para falar com o
> hub local você **precisa** passar `HUB_BASE_URL=http://localhost:3000`.

A janela do Electron abre com DevTools. Registre um usuário, crie uma rede,
publique um arquivo (botão de seleção → escolher arquivo) e observe a aba Peers.

---

## 4. Subir o Fallback (opcional, precisa de SQS)

O fallback só faz sentido com uma fila SQS de verdade, compartilhada com o hub.
Sem `SQS_QUEUE_URL` configurado no hub, os comandos JOIN/LEAVE são apenas logados
(você verá `fallback -> JOIN ...` no console do hub) e nada é enviado.

```bash
# criar a fila (uma vez)
aws sqs create-queue --queue-name ep-dsid-fallback --region us-east-1

cd fallback
cp .env.example .env
# preencha SQS_QUEUE_URL com a URL retornada acima
npm install --registry https://registry.npmjs.org
npm run dev
```

No hub, preencha o mesmo `SQS_QUEUE_URL` no `.env` e reinicie. Quando uma rede
ficar com poucos peers (≤4), o hub envia JOIN e o fallback loga a entrada.

---

## 5. Variáveis de ambiente por componente

**Hub** (`hub/.env`):

| Variável | Obrigatória? | Default | Para quê |
|---|---|---|---|
| `PORT` | não | 3000 | porta HTTP |
| `AWS_REGION` | **sim** | — | região AWS |
| `DYNAMO_TABLE` | **sim** | — | nome da tabela (ex: `ep-dsid-hub`) |
| `DYNAMO_ENDPOINT` | não | vazio = AWS real | `http://localhost:8000` para DynamoDB Local |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_PROFILE` | depende | — | credenciais (use `local`/`local` no DynamoDB Local) |
| `JWT_SECRET` | **sim** | — | segredo de assinatura do JWT |
| `JWT_EXPIRES_IN` | não | `1h` | validade do token |
| `BCRYPT_ROUNDS` | não | 10 | custo do hash de senha |
| `SQS_QUEUE_URL` | não | vazio | fila de comandos do fallback; vazio = só loga |
| `FALLBACK_SWEEP_INTERVAL_MS` | não | 15000 | intervalo do avaliador de fallback |
| `PRESENCE_FLUSH_INTERVAL_MS` | não | 10000 | flush da presença (RAM → DynamoDB) |

**Fallback** (`fallback/.env`):

| Variável | Obrigatória? | Default | Para quê |
|---|---|---|---|
| `AWS_REGION` | **sim** | — | região do SQS |
| `SQS_QUEUE_URL` | **sim** | — | mesma fila do hub |
| `SQS_WAIT_TIME_SECONDS` | não | 20 | long-poll do ReceiveMessage (0–20) |
| `SEED_DIR` | não | `./data` | pasta onde semeia/baixa e grava `seed-state.json` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_PROFILE` | depende | — | credenciais |

**Cliente**:

| Variável | Obrigatória? | Default | Para quê |
|---|---|---|---|
| `HUB_BASE_URL` | não | EC2 de teste | endpoint do hub (use `http://localhost:3000` para local) |

---

## 6. Recursos AWS para o teste "real"

- **DynamoDB**: tabela `ep-dsid-hub`, chaves `pk` (HASH) + `sk` (RANGE), mais um
  GSI `gsi1` (`gsi1pk`/`gsi1sk`), billing `PAY_PER_REQUEST`. Criada pelo
  `npm run create-table` do hub.
- **SQS**: fila `ep-dsid-fallback`. Recomendado configurar uma DLQ (redrive policy).
  O hub precisa de `sqs:SendMessage`; o worker de `sqs:ReceiveMessage`/`DeleteMessage`.
- Topologia sugerida (ver `guia-integracao.md` §6): hub e fallback em EC2s
  separados, porta 3000 aberta no security group do hub.

---

## 7. Rodar os testes automatizados

```bash
cd hub && npm test          # 84 testes
cd ../fallback && npm test  # 39 testes
cd ../client && npm test && npm run typecheck
```
