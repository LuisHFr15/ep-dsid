# Documentação inicial das rotas do Hub

Este documento descreve as rotas HTTP atualmente expostas pelo Hub/API do projeto EP-DSID.

O Hub funciona como plano de controle do sistema. Ele gerencia autenticação, redes de compartilhamento, metadados de arquivos, versões, presença de peers e decisão lógica de fallback.

A versão atual do Hub está organizada em torno do conceito de `network`. Ou seja, arquivos e versões não são mais tratados como um catálogo global simples; eles pertencem a uma rede específica.

## Autenticação

A maioria das rotas exige autenticação via JWT.

O fluxo básico é:

1. Registrar usuário com `POST /register`.
2. Fazer login com `POST /auth`.
3. Usar o token retornado no header das próximas requisições:

```http
Authorization: Bearer <jwt>
```

As rotas públicas são:

```http
GET /health
POST /register
POST /auth
```

As demais rotas passam pelo middleware de autenticação.

---

# Rotas públicas

## GET /health

Verifica se o Hub está rodando.

### Request

```http
GET /health
```

### Response esperado

```json
{
  "status": "ok"
}
```

---

## POST /register

Registra um novo usuário.

### Request

```http
POST /register
Content-Type: application/json
```

### Body

```json
{
  "username": "alice",
  "password": "123456"
}
```

### Response esperado

```json
{
  "id": "user-id",
  "username": "alice",
  "createdAt": "2026-..."
}
```

O caso de uso cria o usuário, salva o hash da senha e retorna `id`, `username` e `createdAt`.

---

## POST /auth

Autentica um usuário e retorna um JWT.

### Request

```http
POST /auth
Content-Type: application/json
```

### Body

```json
{
  "username": "alice",
  "password": "123456"
}
```

### Response esperado

```json
{
  "jwt": "token.jwt.aqui"
}
```

O token contém o identificador do usuário autenticado e deve ser usado nas rotas protegidas.

---

# Rotas autenticadas de networks

Todas as rotas abaixo exigem:

```http
Authorization: Bearer <jwt>
```

---

## GET /networks

Lista as redes cadastradas.

### Request

```http
GET /networks
Authorization: Bearer <jwt>
```

### Query params opcionais

```text
q=<texto>
tag=<tag>
```

### Response esperado

```json
[
  {
    "id": "network-id",
    "title": "Minha rede",
    "description": "Descrição da rede",
    "tags": ["tag1", "tag2"],
    "ownerId": "user-id",
    "accessMode": "public",
    "updateMode": "collaborative",
    "activeFileId": "file-id"
  }
]
```

A listagem aceita filtro textual (`q`) e filtro por tag (`tag`).

---

## POST /networks

Cria uma nova network.

### Request

```http
POST /networks
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Body

```json
{
  "title": "Minha rede",
  "description": "Descrição da rede",
  "tags": ["exemplo", "teste"],
  "accessMode": "public",
  "updateMode": "collaborative"
}
```

### Campos

```text
title: título da rede
description: descrição da rede
tags: lista opcional de tags
accessMode: "public" ou "private"
updateMode: "centralized" ou "collaborative"
```

### Response esperado

```json
{
  "id": "network-id",
  "title": "Minha rede",
  "description": "Descrição da rede",
  "tags": ["exemplo", "teste"],
  "ownerId": "user-id",
  "accessMode": "public",
  "updateMode": "collaborative",
  "activeFileId": null,
  "createdAt": "2026-..."
}
```

Ao criar uma network, o usuário autenticado vira o dono (`ownerId`) e também ganha membership aprovada automaticamente.

---

## POST /networks/:networkId/access-requests

Solicita acesso a uma network.

### Request

```http
POST /networks/:networkId/access-requests
Authorization: Bearer <jwt>
```

### Body

Não precisa de body.

### Response esperado

```json
{
  "status": "approved"
}
```

ou:

```json
{
  "status": "pending"
}
```

Se a network for pública, o acesso tende a ser aprovado automaticamente. Se for privada, o pedido pode ficar pendente.

---

## GET /networks/:networkId/access-requests

Lista pedidos pendentes de acesso.

### Request

```http
GET /networks/:networkId/access-requests
Authorization: Bearer <jwt>
```

### Response esperado

```json
[
  {
    "userId": "user-id",
    "requestedAt": "2026-..."
  }
]
```

Apenas o dono da network pode listar pedidos pendentes.

---

## POST /networks/:networkId/access-decisions

Aprova ou rejeita um pedido de acesso.

### Request

```http
POST /networks/:networkId/access-decisions
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Body

```json
{
  "userId": "user-id",
  "decision": "approve"
}
```

ou:

```json
{
  "userId": "user-id",
  "decision": "reject"
}
```

### Response esperado

```json
{
  "userId": "user-id",
  "status": "approved"
}
```

ou:

```json
{
  "userId": "user-id",
  "status": "rejected"
}
```

Apenas o dono da network pode decidir pedidos de acesso.

---

# Rotas autenticadas de arquivos e versões

Na arquitetura atual, arquivos e versões pertencem a uma network.

---

## POST /networks/:networkId/files

Anuncia o arquivo inicial ou substitui o arquivo ativo da network por um novo arquivo.

### Request

```http
POST /networks/:networkId/files
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Body

```json
{
  "infoHash": "abc123",
  "filename": "arquivo.txt",
  "magnet": "magnet:?xt=urn:btih:abc123",
  "size": 12345
}
```

### Campos

```text
infoHash: hash do conteúdo/torrent
filename: nome do arquivo
magnet: magnet URI opcional
size: tamanho opcional
```

### Response esperado

```json
{
  "fileId": "file-id",
  "versionId": "version-id",
  "lamportTs": 1
}
```

Apenas o dono da network pode anunciar um novo arquivo inicial. O Hub gera um `fileId`, cria a primeira versão e define esse arquivo como ativo na network.

---

## POST /networks/:networkId/versions

Publica uma nova versão do arquivo ativo da network.

### Request

```http
POST /networks/:networkId/versions
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Body

```json
{
  "infoHash": "def456",
  "filename": "arquivo.txt",
  "magnet": "magnet:?xt=urn:btih:def456",
  "size": 12345,
  "parentVersionId": "version-id-anterior"
}
```

### Campos

```text
infoHash: hash da nova versão
filename: nome do arquivo
magnet: magnet URI opcional
size: tamanho opcional
parentVersionId: versão pai opcional
```

Se `parentVersionId` não for enviado, o Hub usa a versão atual como pai, quando existir.

### Response esperado

```json
{
  "fileId": "file-id",
  "versionId": "new-version-id",
  "lamportTs": 2,
  "parentVersionId": "version-id-anterior",
  "concurrent": false
}
```

Em redes colaborativas, usuários com permissão podem publicar versões. O Hub usa relógio de Lamport para ordenar versões.

---

## GET /networks/:networkId/file

Busca o arquivo atual da network.

### Request

```http
GET /networks/:networkId/file
Authorization: Bearer <jwt>
```

### Query param opcional

```text
versionId=<version-id>
```

Se `versionId` for informado, retorna aquela versão específica. Se não for informado, retorna a versão atual.

### Response esperado

```json
{
  "fileId": "file-id",
  "versionId": "version-id",
  "parentVersionId": null,
  "infoHash": "abc123",
  "magnet": "magnet:?xt=urn:btih:abc123",
  "filename": "arquivo.txt",
  "lamportTs": 1
}
```

---

## GET /networks/:networkId/versions

Lista as versões do arquivo ativo da network.

### Request

```http
GET /networks/:networkId/versions
Authorization: Bearer <jwt>
```

### Response esperado

```json
{
  "fileId": "file-id",
  "currentVersionId": "version-id-atual",
  "versions": [
    {
      "versionId": "version-id",
      "parentVersionId": null,
      "infoHash": "abc123",
      "filename": "arquivo.txt",
      "lamportTs": 1,
      "authorId": "user-id",
      "createdAt": "2026-...",
      "isCurrent": true,
      "concurrent": false
    }
  ]
}
```

Essa rota permite visualizar a DAG de versões do arquivo atual.

---

## POST /networks/:networkId/versions/:versionId/promote

Promove uma versão específica, criando uma nova versão de resolução baseada nela.

### Request

```http
POST /networks/:networkId/versions/:versionId/promote
Authorization: Bearer <jwt>
```

### Body

Não precisa de body.

### Response esperado

```json
{
  "fileId": "file-id",
  "versionId": "new-version-id",
  "lamportTs": 3,
  "parentVersionId": "version-id-promovida"
}
```

Essa rota é usada para resolver/promover uma versão existente. O Hub cria uma nova versão tendo a versão promovida como pai.

---

# Rotas autenticadas de presença

## GET /networks/:networkId/peers

Lista peers ativos em uma network.

### Request

```http
GET /networks/:networkId/peers
Authorization: Bearer <jwt>
```

### Response esperado

```json
{
  "networkId": "network-id",
  "activePeers": [
    {
      "peerId": "peer-1",
      "lastSeenAt": "2026-..."
    }
  ]
}
```

A rota retorna apenas peers considerados ativos de acordo com a política de presença.

---

## POST /heartbeat

Registra heartbeat de um peer em uma network.

### Request

```http
POST /heartbeat
Authorization: Bearer <jwt>
Content-Type: application/json
```

### Body atual

```json
{
  "networkId": "network-id",
  "peerId": "peer-1"
}
```

O `userId` não vem no body. Ele vem do JWT.

### Response esperado

```json
{
  "networkId": "network-id",
  "peerId": "peer-1",
  "activePeers": 3,
  "shouldActivateFallback": true
}
```

A presença é registrada por network e peer. O Hub salva o peer como online, atualiza `lastSeenAt`, remove peers expirados e calcula a quantidade de peers ativos da network.

A regra de fallback é:

```text
activePeers <= 4  -> shouldActivateFallback = true
activePeers > 4   -> shouldActivateFallback = false
```

---

# Comportamento de presença e fallback

A presença atual é baseada em:

```text
networkId
peerId
userId
status
lastSeenAt
```

Um heartbeat cria ou atualiza um registro de presença online para aquele peer naquela network.

Peers que passam do tempo limite sem heartbeat são considerados expirados e podem ser marcados como offline.

A avaliação de fallback usa a quantidade de peers ativos em uma network. Quando há poucos peers ativos, o Hub pode decidir que o fallback deve entrar no swarm. Quando há peers suficientes, o fallback pode sair.

A integração com fila/SQS aparece separada da resposta direta do heartbeat. A classe de avaliação de fallback envia comandos `JOIN` ou `LEAVE` para a fila quando detecta mudança de estado.

---

# Erros esperados

O Hub usa erros de aplicação padronizados.

Principais códigos:

```text
VALIDATION            -> 400
INVALID_CREDENTIALS   -> 401
UNAUTHORIZED          -> 401
FORBIDDEN             -> 403
NOT_FOUND             -> 404
CONFLICT              -> 409
```

Exemplos:

## Token ausente ou inválido

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "authentication required"
  }
}
```

## Usuário sem permissão

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "access denied"
  }
}
```

## Network ou arquivo não encontrado

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "network not found"
  }
}
```

---

# Fluxo básico de uso

Um fluxo mínimo de interação com o Hub é:

```text
1. GET /health
2. POST /register
3. POST /auth
4. Guardar jwt
5. POST /networks
6. POST /networks/:networkId/files
7. GET /networks/:networkId/file
8. POST /heartbeat
9. GET /networks/:networkId/peers
10. POST /networks/:networkId/versions
11. GET /networks/:networkId/versions
```

Exemplo conceitual:

```text
Usuário cria conta
↓
Usuário faz login
↓
Cliente recebe JWT
↓
Usuário cria uma network
↓
Usuário anuncia um arquivo na network
↓
Outro cliente autorizado consulta o arquivo atual
↓
Cliente envia heartbeat dizendo que está ativo naquela network
↓
Hub calcula peers ativos e fallback
↓
Clientes podem publicar novas versões
```

---

# Observações importantes

1. O Hub atual não expõe mais as rotas globais antigas:

```http
POST /announce
GET /files
GET /files/:file_id
```

2. O modelo atual é baseado em networks:

```http
/networks/:networkId/files
/networks/:networkId/file
/networks/:networkId/versions
```

3. O heartbeat atual é por network, não por `file_id` global.

4. Quase todas as rotas relevantes exigem JWT.

5. O Hub já possui integração com DynamoDB para repositórios e presença, além de uma camada de cache de presença em memória.

6. O plano de dados P2P via WebTorrent ainda é representado por metadados como `infoHash` e `magnet`, mas a transferência real dos bytes ocorre fora do Hub.
