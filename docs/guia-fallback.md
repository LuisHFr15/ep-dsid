# Guia do Fallback — rodar, navegar e depurar

Este guia é para testar o **fallback** na sua máquina (com SQS e WebTorrent reais). Cobre: o que o serviço faz, como o diretório está organizado, como subir o worker, e — o mais importante — como **provar na prática as garantias de robustez** (auto-recuperação após crash, idempotência, semear do EBS, backoff, liveness).

> A especificação completa está no `README.md` da raiz. O guia do hub está em `docs/guia-hub.md`. Este documento é operacional.

---

## 1. Visão geral em 30 segundos

O fallback é o **seed de última instância** (§2.2, §9.2, §11.4): um **worker** (processo sem HTTP) que roda no EC2 de fallback e garante que um arquivo continue disponível mesmo quando todos os peers humanos saem do swarm.

Ciclo de vida:
1. O **hub** monitora quantos peers estão ativos numa rede. Quando cai para **≤ 4**, enfileira um comando `JOIN` na SQS; quando sobe de **> 4**, enfileira `LEAVE`.
2. O fallback **consome** esses comandos da SQS (long-poll), e via **WebTorrent** entra no swarm semeando a partir do disco local (EBS) no `JOIN`, ou sai e apaga a cópia no `LEAVE`.

Ele **não fala HTTP** e **não conhece o hub** — os dois só se comunicam pela fila SQS. O contrato das mensagens (produzido pelo hub) é:
- `{ "cmd": "JOIN", "networkId": "...", "fileId": "...", "infoHash": "..." }`
- `{ "cmd": "LEAVE", "networkId": "...", "fileId": "..." }`

---

## 2. Mapa do diretório (arquitetura limpa)

Mesma arquitetura do hub: dependências apontam para dentro; WebTorrent e SQS ficam atrás de **portas**, o que torna o núcleo testável sem infra real.

```
domain/
  command.ts                 # FallbackCommand (JOIN|LEAVE) — espelho do contrato do hub

application/                 # A LÓGICA (testável com fakes, sem AWS/torrent)
  parse-command.ts           #   valida o JSON cru da mensagem (zod)
  process-command.ts         #   dispatch JOIN/LEAVE + idempotência + write-ahead do estado
  restore-seeding.ts         #   no boot, re-semeia o que estava registrado (auto-recuperação)
  worker.ts                  #   processa um lote: parse -> process -> ack (ou não-ack em falha)
  backoff.ts                 #   política pura de recuo exponencial
  ports/
    command-consumer.ts      #   porta: receive()/ack()  (transporta strings)
    torrent-seeder.ts        #   porta: seed()/drop()/isSeeding()
    seed-state-store.ts      #   porta: add()/remove()/list()  (estado desejado durável)

infrastructure/              # O MUNDO EXTERNO (adapters)
  config/env.ts              #   config tipada (zod), falha rápido se faltar var
  sqs/sqs-command-consumer.ts        #   long-poll (ReceiveMessage) + DeleteMessage no ack
  webtorrent/webtorrent-seeder.ts    #   client.add/seed, não-bloqueante e error-safe
  persistence/file-seed-state-store.ts  #   estado desejado em seed-state.json (escrita atômica)

main/
  container.ts               # composition root — monta tudo. Comece a ler por aqui.
  index.ts                   # boot: restore -> loop de consumo; backoff, liveness, shutdown

testing/fakes.ts             # fakes das 3 portas, usados nos testes
```

**Duas "memórias" distintas (conceito central para entender a robustez):**
- **Estado desejado** (`SeedStateStore` → `seed-state.json` no disco): "o que eu *deveria* estar semeando". Durável, sobrevive a restart.
- **Estado ativo** (o `Map` dentro do `WebTorrentSeeder`, em RAM): "o que eu *estou* semeando agora". Some no restart.

A auto-recuperação é exatamente reconciliar os dois no boot: ler o estado desejado do disco e recriar o estado ativo.

**Como ler o código de um comando:** `index.ts` (loop) → `worker.ts` → `parse-command` → `process-command` → portas (`seed-state-store` + `torrent-seeder`) → adapters.

---

## 3. Setup

Pré-requisitos: **Node 20+**, **npm**, uma **fila SQS** (a mesma que o hub usa como `SQS_QUEUE_URL`) e credenciais AWS. Para o WebTorrent funcionar de verdade, rode numa máquina **sem bloqueio de BitTorrent** (não a corporativa).

```bash
cd fallback
npm install
cp .env.example .env
```

Variáveis do `.env`:

| Variável | Obrigatória? | Default | Para quê |
|---|---|---|---|
| `AWS_REGION` | **sim** | — | região da fila SQS |
| `SQS_QUEUE_URL` | **sim** | — | URL da fila de comandos (a mesma do hub) |
| `SQS_WAIT_TIME_SECONDS` | não | `20` | long-poll do ReceiveMessage (0–20) |
| `SEED_DIR` | não | `./data` | diretório local (EBS) onde baixa/semeia e grava o `seed-state.json` |
| `AWS_PROFILE` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | depende | — | credenciais (perfil OU chaves) |

Se faltar `AWS_REGION` ou `SQS_QUEUE_URL`, o worker **falha ao subir** com `invalid environment configuration`.

---

## 4. A fila SQS (e a DLQ recomendada)

O fallback **consome** a fila; o hub **produz**. Aponte os dois para a **mesma** `SQS_QUEUE_URL`.

Criar uma fila para teste:
```bash
aws sqs create-queue --queue-name ep-dsid-fallback --region us-east-1
# use o QueueUrl retornado como SQS_QUEUE_URL nos dois projetos
```

**DLQ (rede de segurança recomendada):** o worker acka mensagens malformadas para não reprocessá-las em loop, mas uma *dead-letter queue* garante que comandos problemáticos fiquem para inspeção em vez de sumirem. Configure uma redrive policy na fila principal (`maxReceiveCount` + ARN da DLQ). Uma mensagem que falhe o processamento N vezes vai para a DLQ automaticamente.

Semântica de entrega que o worker assume: **at-least-once**. Ele só dá `ack` (DeleteMessage) **após** processar com sucesso; em falha transitória, não acka → a mensagem volta após o *visibility timeout* e é retentada. A idempotência (§6) garante que a re-entrega não cause efeito duplicado.

---

## 5. Subir o worker

```bash
npm run dev     # tsx watch
```

Sequência de logs esperada no boot:
```
restored 0/0 seeded files      # nada a recuperar na primeira vez
fallback worker started        # entrou no loop de consumo da SQS
```

O worker fica em long-poll na fila. Nada mais é logado até chegar um comando ou passar o intervalo de liveness (~60s → `alive: responsible for N file(s)`).

---

## 6. Fluxo de teste ponta a ponta (com o hub)

O jeito realista de testar é acionar o fallback **pelo hub**, forçando o limiar de peers.

1. **Suba o hub** (ver `docs/guia-hub.md`) com o **mesmo** `SQS_QUEUE_URL` configurado (o hub precisa de `SQS_QUEUE_URL` setado, senão ele só loga os comandos em vez de enfileirar).
2. **Suba o fallback** (`npm run dev`).
3. No hub, crie uma rede e publique um arquivo (via os `curl` do guia do hub). Anote o `networkId`.
4. **Force o limiar:** faça ≤ 4 peers baterem heartbeat nessa rede e então parem (ou simplesmente não gere peers). No próximo sweep (`FALLBACK_SWEEP_INTERVAL_MS`, ~15s no hub), o hub enfileira um `JOIN`.
5. **Observe o fallback** consumir: ele loga o processamento, cria `SEED_DIR/<fileId>/`, grava o `seed-state.json`, e passa a semear.
6. Faça a rede crescer acima de 4 peers → o hub enfileira `LEAVE` → o fallback remove o torrent e apaga `SEED_DIR/<fileId>/`.

**Atalho sem o hub** (injetar um comando direto na fila para testar só o fallback):
```bash
aws sqs send-message --queue-url "$SQS_QUEUE_URL" --region us-east-1 \
  --message-body '{"cmd":"JOIN","networkId":"n1","fileId":"f-teste","infoHash":"<um-info-hash-valido>"}'
```
Para o `LEAVE`:
```bash
aws sqs send-message --queue-url "$SQS_QUEUE_URL" --region us-east-1 \
  --message-body '{"cmd":"LEAVE","networkId":"n1","fileId":"f-teste"}'
```

---

## 7. Rodar os testes automatizados

```bash
npm test           # 33 testes (Vitest) — NÃO precisa de SQS/WebTorrent: usa fakes
npm run test:watch
npx tsc -p tsconfig.json --noEmit   # só checagem de tipos
npm run build      # compila para dist/
```

O que a suíte cobre com fakes/tmpdir (sem infra): parse de comandos, idempotência do processor, write-ahead do estado, restore no boot, persistência em disco (arquivo real em tmpdir), e a política de backoff. O que ela **não** cobre é o WebTorrent real e a SQS real — a próxima seção.

---

## 8. Provar as garantias de robustez (o que os testes não cobrem)

Esta é a parte central. Cada item abaixo é uma garantia do serviço que só se prova com infra real ou matando o processo.

### 8.1. Auto-recuperação após crash (a garantia principal)
Prova que o fallback **se lembra sozinho** do que semear, sem o hub reenviar nada.

1. Envie um `JOIN` (via hub ou o `send-message` da seção 6). Confirme que o worker está semeando e que `SEED_DIR/seed-state.json` contém a entrada:
   ```bash
   cat data/seed-state.json     # deve listar { networkId, fileId, infoHash }
   ```
2. **Mate o processo abruptamente:** `Ctrl-C` (ou `kill -9 <pid>` para simular crash puro).
3. **Suba de novo:** `npm run dev`.
4. Observe o log de boot:
   ```
   restored 1/1 seeded files
   fallback worker started
   ```
   Ele voltou a semear o `f-teste` **sem nenhum comando novo do hub**. Essa é a auto-recuperação (fecha o furo de "fallback reinicia → hub não reenvia JOIN").

> **Limite conhecido (§13.3):** isso cobre restart de *processo*. Um *terminate* da instância EC2 apaga o EBS — mas aí os próprios bytes também se perdem, então é o mesmo modelo de durabilidade. Aceito no design AP.

### 8.2. Idempotência (re-entrega não duplica)
O SQS é at-least-once; a mesma mensagem pode chegar duas vezes.
- Envie o **mesmo `JOIN` duas vezes** (dois `send-message` idênticos). O worker deve semear **uma vez só** — o segundo é no-op (`isSeeding` já é true).
- Envie um `LEAVE` para um `fileId` que não está sendo semeado → no-op silencioso, sem erro.

### 8.3. Semear do EBS, não re-baixar (§2.2/§10.3)
- Após um `JOIN` que baixou o conteúdo para `SEED_DIR/<fileId>/`, reinicie o worker (8.1). No restore, como os bytes já estão no disco, ele deve **semear do cache** (`client.seed(path)`), não re-baixar da rede. Em conexões lentas isso é visível: o restore é imediato, sem espera por download.

### 8.4. Não trava e não morre (liveness)
- **Não-bloqueante:** envie um `JOIN` com um `infoHash` para o qual não há peers/metadados. O worker **não deve congelar** — ele registra o torrent e continua consumindo a fila (envie um segundo comando logo depois e veja que é processado).
- **Error-safe:** um erro de torrent (hash inválido, peer malicioso) é logado (`torrent error for ...`) e **não derruba o processo**.
- **Liveness:** deixe o worker ocioso ~60s e veja o log periódico `alive: responsible for N file(s)`.

### 8.5. Backoff em falha de fila
- Configure uma `SQS_QUEUE_URL` **inválida** (ou remova a permissão de `sqs:ReceiveMessage`) e suba o worker. Em vez de martelar a fila em busy-loop (100% CPU), ele deve logar `worker loop error, backing off Xms` com o atraso **crescendo** (1s, 2s, 4s… até o teto de 30s). Corrija a URL/permissão e veja que ele volta a operar (o contador de falhas reseta no primeiro sucesso).

### 8.6. Mensagem malformada (poison message)
- Envie um corpo inválido:
  ```bash
  aws sqs send-message --queue-url "$SQS_QUEUE_URL" --message-body '{lixo' --region us-east-1
  ```
  O worker loga `dropping malformed message` e **acka** (a mensagem sai da fila — retry não ajudaria). Se você configurou a DLQ (seção 4), comandos que falham o *processamento* (não o parse) acabam lá após N tentativas.

### 8.7. Graceful shutdown
- Com o worker rodando, `Ctrl-C` (SIGINT) → deve logar `received SIGINT, shutting down`, destruir o client WebTorrent e encerrar limpo (sem travar). Há um timeout de segurança de 5s que força a saída se o close travar.

---

## 9. Troubleshooting

| Sintoma | Causa provável |
|---|---|
| `invalid environment configuration` ao subir | falta `AWS_REGION` ou `SQS_QUEUE_URL` no `.env` |
| Worker sobe mas nunca recebe nada | o hub está com `SQS_QUEUE_URL` vazio (só loga, não enfileira), ou aponta para outra fila |
| `worker loop error, backing off` repetindo | URL da fila errada, credenciais sem `sqs:ReceiveMessage`, ou região errada |
| `JOIN` chega mas não semeia / trava o download | sem peers/seed para aquele `infoHash` — esperado; o worker não trava, só não completa o download |
| Torrent não funciona / trava conexões | máquina com BitTorrent bloqueado (ex.: rede corporativa) — rode em outra rede |
| `seed-state.json` não aparece | `SEED_DIR` sem permissão de escrita, ou nenhum `JOIN` processado ainda |
| Comandos somem sem efeito | sem DLQ, uma poison message é ackada e descartada — configure a DLQ para inspecionar |
| `tsx: command not found` | rode `npm install` dentro de `fallback/` |

---

Dúvidas sobre o "porquê" das decisões (por que fila e não chamada direta, por que idempotência, por que EBS efêmero é aceitável) → `README.md` da raiz (§4.5, §9, §13).
