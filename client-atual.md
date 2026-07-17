# Documentação atual do Client

Este documento descreve o estado atual do `client` do projeto EP-DSID após os MVPs 0, 1, 2 e 3.

O client funciona, neste momento, como uma aplicação de linha de comando que conversa com o Hub/API. Ele ainda não faz transferência real de arquivos via WebTorrent. O foco atual é validar o plano de controle: autenticação, networks, metadados de arquivos, presença de peers e versionamento.

---

# Visão geral

O client atual permite:

```text
1. Verificar se o Hub está online
2. Registrar usuário
3. Fazer login e salvar sessão local
4. Listar e criar networks
5. Publicar arquivo ativo em uma network
6. Consultar o arquivo atual de uma network
7. Enviar heartbeat de peer
8. Listar peers ativos
9. Listar versões do arquivo ativo
10. Publicar nova versão
11. Promover uma versão específica
12. Manter heartbeat contínuo
```

A comunicação com o Hub é feita via HTTP, usando `fetch` no Node.js.

---

# Organização do client

A estrutura atual segue uma arquitetura em camadas:

```text
client/
  package.json
  tsconfig.json
  .client-session.json        # gerado localmente após login, não deve ir para o Git

  src/
    application/
      auth/
      file/
      health/
      network/
      presence/

    domain/
      auth/
      file/
      health/
      network/
      presence/

    infrastructure/
      config/
      hub/
      session/

    interface/
      cli/

    main/
```

## `domain/`

Contém tipos e contratos puros do domínio.

Exemplos:

```text
domain/auth/session.ts
domain/auth/session-store.ts
domain/network/network.ts
domain/file/network-file.ts
domain/presence/peer.ts
```

Essa camada não deve depender de HTTP, filesystem, CLI ou bibliotecas externas específicas.

## `application/`

Contém os casos de uso do client.

Exemplos:

```text
application/auth/login.ts
application/network/create-network.ts
application/file/announce-file.ts
application/file/publish-version.ts
application/presence/send-heartbeat.ts
application/presence/start-heartbeat.ts
```

Essa camada orquestra as ações do client. Por exemplo, um caso de uso pode carregar a sessão local, obter o JWT e chamar o Hub.

## `infrastructure/`

Contém implementações concretas para comunicação externa.

Exemplos:

```text
infrastructure/hub/hub-api.ts
infrastructure/hub/hub-types.ts
infrastructure/session/file-session-store.ts
infrastructure/config/client-config.ts
```

A classe `HubApi` concentra as chamadas HTTP para o Hub.

A classe `FileSessionStore` salva e carrega a sessão local do usuário.

## `interface/`

Contém a interface atual do usuário.

Neste momento, a interface é CLI:

```text
interface/cli/main.ts
```

Futuramente, essa camada pode ser expandida ou substituída por Electron/IPC.

## `main/`

Contém a composição das dependências.

```text
main/container.ts
```

O container instancia `HubApi`, `FileSessionStore` e os casos de uso.

---

# Configuração

O client lê a URL base do Hub a partir da variável de ambiente:

```text
HUB_BASE_URL
```

Se a variável não existir, usa o padrão:

```text
http://localhost:3000
```

Exemplo:

```powershell
$env:HUB_BASE_URL="http://localhost:3000"
```

---

# Sessão local

Após login, o client salva a sessão em:

```text
client/.client-session.json
```

Formato esperado:

```json
{
  "user": "alice",
  "jwt": "token.jwt.aqui"
}
```

Esse arquivo é estado local do usuário e não deve ser versionado.

Recomendação para `.gitignore`:

```gitignore
client/.client-session.json
```

---

# Comandos disponíveis

Todos os comandos podem ser executados da raiz do projeto com:

```powershell
npm.cmd --prefix client run dev -- <comando>
```

---

# MVP 0 — Health

## `health`

Verifica se o Hub está online.

### Comando

```powershell
npm.cmd --prefix client run dev -- health
```

### Chamada ao Hub

```http
GET /health
```

### Resposta esperada

```json
{
  "status": "ok"
}
```

---

# MVP 1 — Auth + Networks

## `auth:register`

Registra um novo usuário.

### Comando

```powershell
npm.cmd --prefix client run dev -- auth:register alice 123456
```

### Chamada ao Hub

```http
POST /register/
```

### Body enviado

```json
{
  "user": "alice",
  "password": "123456"
}
```

### Resposta esperada

```json
{
  "id": "user-id",
  "username": "alice",
  "createdAt": "2026-..."
}
```

---

## `auth:login`

Faz login e salva o JWT em sessão local.

### Comando

```powershell
npm.cmd --prefix client run dev -- auth:login alice 123456
```

### Chamada ao Hub

```http
POST /auth/
```

### Body enviado

```json
{
  "user": "alice",
  "password": "123456"
}
```

### Resposta esperada do Hub

```json
{
  "jwt": "token.jwt.aqui"
}
```

### Efeito local

Cria ou atualiza:

```text
client/.client-session.json
```

---

## `auth:logout`

Remove a sessão local.

### Comando

```powershell
npm.cmd --prefix client run dev -- auth:logout
```

### Efeito local

Remove:

```text
client/.client-session.json
```

---

## `auth:whoami`

Mostra a sessão local atual.

### Comando

```powershell
npm.cmd --prefix client run dev -- auth:whoami
```

### Saída esperada

```text
Usuário: alice
JWT: token mascarado
```

---

## `networks:list`

Lista as networks disponíveis para o usuário autenticado.

### Comando

```powershell
npm.cmd --prefix client run dev -- networks:list
```

### Chamada ao Hub

```http
GET /networks/
Authorization: Bearer <jwt>
```

### Resposta esperada

```json
[
  {
    "id": "network-id",
    "title": "RedeMVP1",
    "description": "RedeDeTeste",
    "tags": ["mvp1", "teste"],
    "ownerId": "user-id",
    "accessMode": "public",
    "updateMode": "centralized",
    "activeFileId": null,
    "createdAt": "2026-..."
  }
]
```

---

## `networks:create`

Cria uma nova network.

### Comando

```powershell
npm.cmd --prefix client run dev -- networks:create RedeMVP1 RedeDeTeste public centralized mvp1,teste
```

### Chamada ao Hub

```http
POST /networks/
Authorization: Bearer <jwt>
```

### Body enviado

```json
{
  "title": "RedeMVP1",
  "description": "RedeDeTeste",
  "accessMode": "public",
  "updateMode": "centralized",
  "tags": ["mvp1", "teste"]
}
```

### Resposta esperada

```json
{
  "id": "network-id",
  "title": "RedeMVP1",
  "description": "RedeDeTeste",
  "tags": ["mvp1", "teste"],
  "ownerId": "user-id",
  "accessMode": "public",
  "updateMode": "centralized",
  "activeFileId": null,
  "createdAt": "2026-..."
}
```

---

# MVP 2 — Arquivo ativo + presença

## `network:file:publish`

Publica o arquivo inicial ou substitui o arquivo ativo da network.

### Comando

```powershell
npm.cmd --prefix client run dev -- network:file:publish <networkId> arquivo-mvp2.txt fake-infohash-mvp2 magnet:?xt=urn:btih:fake-infohash-mvp2 999
```

### Chamada ao Hub

```http
POST /networks/:networkId/files/
Authorization: Bearer <jwt>
```

### Body enviado

```json
{
  "filename": "arquivo-mvp2.txt",
  "infoHash": "fake-infohash-mvp2",
  "magnet": "magnet:?xt=urn:btih:fake-infohash-mvp2",
  "size": 999
}
```

### Resposta esperada

```json
{
  "fileId": "file-id",
  "versionId": "version-id",
  "lamportTs": 1
}
```

---

## `network:file:get`

Consulta o arquivo atual da network.

### Comando

```powershell
npm.cmd --prefix client run dev -- network:file:get <networkId>
```

### Chamada ao Hub

```http
GET /networks/:networkId/file/
Authorization: Bearer <jwt>
```

### Resposta esperada

```json
{
  "fileId": "file-id",
  "versionId": "version-id",
  "parentVersionId": null,
  "infoHash": "fake-infohash-mvp2",
  "magnet": "magnet:?xt=urn:btih:fake-infohash-mvp2",
  "filename": "arquivo-mvp2.txt",
  "lamportTs": 1
}
```

---

## `heartbeat:once`

Envia um único heartbeat para uma network.

### Comando

```powershell
npm.cmd --prefix client run dev -- heartbeat:once <networkId> peer-alice-mvp2
```

### Chamada ao Hub

```http
POST /heartbeat
Authorization: Bearer <jwt>
```

### Body enviado

```json
{
  "networkId": "network-id",
  "peerId": "peer-alice-mvp2"
}
```

### Resposta esperada

```json
{
  "networkId": "network-id",
  "peerId": "peer-alice-mvp2",
  "activePeers": 1,
  "shouldActivateFallback": true
}
```

---

## `network:peers`

Lista peers ativos em uma network.

### Comando

```powershell
npm.cmd --prefix client run dev -- network:peers <networkId>
```

### Chamada ao Hub

```http
GET /networks/:networkId/peers/
Authorization: Bearer <jwt>
```

### Resposta esperada após heartbeat

```json
{
  "networkId": "network-id",
  "activePeers": [
    {
      "peerId": "peer-alice-mvp2",
      "lastSeenAt": "2026-..."
    }
  ]
}
```

---

# MVP 3 — Versionamento + heartbeat contínuo

## `network:versions:list`

Lista as versões do arquivo ativo da network.

### Comando

```powershell
npm.cmd --prefix client run dev -- network:versions:list <networkId>
```

### Chamada ao Hub

```http
GET /networks/:networkId/versions/
Authorization: Bearer <jwt>
```

### Resposta esperada

```json
{
  "fileId": "file-id",
  "currentVersionId": "version-id-atual",
  "versions": [
    {
      "versionId": "version-id",
      "parentVersionId": null,
      "infoHash": "fake-infohash-mvp2",
      "filename": "arquivo-mvp2.txt",
      "lamportTs": 1,
      "authorId": "user-id",
      "createdAt": "2026-...",
      "isCurrent": true,
      "concurrent": false
    }
  ]
}
```

---

## `network:version:publish`

Publica uma nova versão do arquivo ativo da network.

### Comando sem `parentVersionId`

```powershell
npm.cmd --prefix client run dev -- network:version:publish <networkId> arquivo-mvp3-v2.txt fake-infohash-mvp3-v2 magnet:?xt=urn:btih:fake-infohash-mvp3-v2 1000
```

### Comando com `parentVersionId`

```powershell
npm.cmd --prefix client run dev -- network:version:publish <networkId> arquivo-mvp3-v3.txt fake-infohash-mvp3-v3 magnet:?xt=urn:btih:fake-infohash-mvp3-v3 1000 <parentVersionId>
```

### Chamada ao Hub

```http
POST /networks/:networkId/versions/
Authorization: Bearer <jwt>
```

### Body enviado

```json
{
  "filename": "arquivo-mvp3-v2.txt",
  "infoHash": "fake-infohash-mvp3-v2",
  "magnet": "magnet:?xt=urn:btih:fake-infohash-mvp3-v2",
  "size": 1000
}
```

Quando `parentVersionId` é informado, o body inclui também:

```json
{
  "parentVersionId": "version-id-pai"
}
```

### Resposta esperada

```json
{
  "fileId": "file-id",
  "versionId": "new-version-id",
  "lamportTs": 2,
  "parentVersionId": "version-id-anterior",
  "concurrent": false
}
```

---

## `network:version:promote`

Promove uma versão específica, criando uma nova versão baseada nela.

### Comando

```powershell
npm.cmd --prefix client run dev -- network:version:promote <networkId> <versionId>
```

### Chamada ao Hub

```http
POST /networks/:networkId/versions/:versionId/promote/
Authorization: Bearer <jwt>
```

### Resposta esperada

```json
{
  "fileId": "file-id",
  "versionId": "new-version-id",
  "lamportTs": 3,
  "parentVersionId": "version-id-promovida"
}
```

---

## `heartbeat:start`

Inicia heartbeat contínuo para uma network.

### Comando

```powershell
npm.cmd --prefix client run dev -- heartbeat:start <networkId> peer-alice-continuous 10000
```

### Comportamento

O comando:

```text
1. Carrega a sessão local
2. Lê o JWT salvo
3. Entra em loop
4. Envia POST /heartbeat
5. Mostra a resposta
6. Aguarda intervalMs
7. Repete
```

### Parar o comando

```text
Ctrl+C
```

### Intervalo padrão

Se `intervalMs` não for informado, o client usa:

```text
10000 ms
```

ou seja, 10 segundos.

---

# Runner externo

Os testes locais podem ser executados por um runner externo em Python/notebook, lendo arquivos `.txt`.

A pasta atual de comandos fica em:

```text
tools/client-runner/commands/
```

Sugestão de organização:

```text
tools/client-runner/commands/
  mvp0-health.txt
  mvp1-auth-networks.txt
  mvp2-main-flow.txt
  mvp2-publish-file.txt
  mvp3-versioning.txt
  mvp3-heartbeat-start.txt
```

---

# Formato dos arquivos `.txt`

O runner atual aceita comandos completos de PowerShell e variáveis simples.

Exemplo:

```text
NETWORK_ID=e0d666a7-c66b-4aa8-a639-d2a4420ed762
PEER_ID=peer-alice-mvp2

npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- network:file:get ${NETWORK_ID}
npm --prefix client run dev -- heartbeat:once ${NETWORK_ID} ${PEER_ID}
npm --prefix client run dev -- network:peers ${NETWORK_ID}
```

O runner:

```text
1. Lê variáveis no formato NOME=valor
2. Substitui ${NOME} nos comandos
3. Executa cada linha no PowerShell
4. Mostra stdout, stderr e exit-code
```

---

# Arquivo `mvp0-health.txt`

```text
# MVP 0 - health

npm --prefix client run dev -- health
```

---

# Arquivo `mvp1-auth-networks.txt`

```text
# MVP 1 - autenticação + networks
# Se o usuário alice já existir, comente a linha auth:register.

npm --prefix client run dev -- auth:register alice 123456
npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- auth:whoami

npm --prefix client run dev -- networks:create RedeMVP1 RedeDeTeste public centralized mvp1,teste
npm --prefix client run dev -- networks:list
```

---

# Arquivo `mvp2-main-flow.txt`

```text
# MVP 2 - fluxo principal: arquivo + heartbeat + peers

NETWORK_ID=e0d666a7-c66b-4aa8-a639-d2a4420ed762
PEER_ID=peer-alice-mvp2

npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- network:file:get ${NETWORK_ID}
npm --prefix client run dev -- heartbeat:once ${NETWORK_ID} ${PEER_ID}
npm --prefix client run dev -- network:peers ${NETWORK_ID}
```

---

# Arquivo `mvp2-publish-file.txt`

```text
# MVP 2 - publica arquivo na network
# Rode apenas quando quiser criar/substituir arquivo ativo da network.

NETWORK_ID=e0d666a7-c66b-4aa8-a639-d2a4420ed762
FILENAME=arquivo-mvp2.txt
INFO_HASH=fake-infohash-mvp2
MAGNET=magnet:?xt=urn:btih:fake-infohash-mvp2
SIZE=999

npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- network:file:publish ${NETWORK_ID} ${FILENAME} ${INFO_HASH} ${MAGNET} ${SIZE}
npm --prefix client run dev -- network:file:get ${NETWORK_ID}
```

---

# Arquivo `mvp3-versioning.txt`

```text
# MVP 3 - versionamento

NETWORK_ID=e0d666a7-c66b-4aa8-a639-d2a4420ed762

VERSION_FILENAME=arquivo-mvp3-v2.txt
VERSION_INFO_HASH=fake-infohash-mvp3-v2
VERSION_MAGNET=magnet:?xt=urn:btih:fake-infohash-mvp3-v2
VERSION_SIZE=1000

npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- network:file:get ${NETWORK_ID}
npm --prefix client run dev -- network:versions:list ${NETWORK_ID}
npm --prefix client run dev -- network:version:publish ${NETWORK_ID} ${VERSION_FILENAME} ${VERSION_INFO_HASH} ${VERSION_MAGNET} ${VERSION_SIZE}
npm --prefix client run dev -- network:file:get ${NETWORK_ID}
npm --prefix client run dev -- network:versions:list ${NETWORK_ID}
```

---

# Arquivo `mvp3-heartbeat-start.txt`

```text
# MVP 3 - heartbeat contínuo
# Este comando fica rodando até Ctrl+C.

NETWORK_ID=e0d666a7-c66b-4aa8-a639-d2a4420ed762
PEER_ID=peer-alice-continuous
INTERVAL_MS=10000

npm --prefix client run dev -- auth:login alice 123456
npm --prefix client run dev -- heartbeat:start ${NETWORK_ID} ${PEER_ID} ${INTERVAL_MS}
```

---

# Dependências locais para rodar

Para testar o client contra o hub local, a ordem recomendada é:

```text
1. Subir DynamoDB local
2. Subir Hub
3. Rodar comandos do client
```

O client depende do Hub funcionando. O Hub, por sua vez, depende do DynamoDB local para persistência.

---

# Estado dos MVPs

```text
✅ MVP 0 — Base + health
✅ MVP 1 — Auth + networks
✅ MVP 2 — Arquivo ativo + heartbeat once + peers
✅ MVP 3 — Versionamento + heartbeat contínuo
⬜ MVP 4 — Acesso privado + multiusuário
⬜ MVP 5 — Arquivos locais + P2P fake
⬜ MVP 6 — WebTorrent real / Electron
```

---

# Próximos passos planejados

## MVP 4 — Acesso privado + multiusuário

Adicionar comandos para:

```text
network:access:request <networkId>
network:access:list <networkId>
network:access:decide <networkId> <userId> <approve|reject>
```

Objetivo:

```text
1. Alice cria network privada
2. Bob pede acesso
3. Alice lista pedidos pendentes
4. Alice aprova ou rejeita Bob
5. Bob passa a conseguir acessar a network se aprovado
```

## MVP 5 — Arquivos locais + P2P fake

Adicionar leitura de arquivos reais do disco, obtendo:

```text
filename
size
```

E gerar metadados fake para:

```text
infoHash
magnet
```

## MVP 6 — WebTorrent real / Electron

Trocar a camada P2P fake por uma implementação real com WebTorrent e preparar integração com interface gráfica.
