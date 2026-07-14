# Rodando o Hub localmente com DynamoDB Local

Este documento descreve o que foi necessário configurar para rodar o Hub do projeto localmente, usando o servidor Node.js na máquina de desenvolvimento e o DynamoDB Local como banco.

## Contexto

O Hub roda localmente na porta `3000`, mas a versão atual do projeto não usa mais apenas memória para persistência. Ele depende de um DynamoDB para salvar usuários, redes, permissões, arquivos, versões e presença de peers.

Para desenvolvimento local, usamos:

```text
Hub Node.js local  -> http://localhost:3000
DynamoDB Local     -> http://127.0.0.1:8000
```

Assim, o ambiente fica local de ponta a ponta para testar o plano de controle do Hub: autenticação, networks, arquivos, versões, heartbeat e peers ativos.

> Observação: isso valida o Hub/API e a persistência local. A transferência real de bytes via WebTorrent é uma parte separada do sistema.

---

## Pré-requisitos

Para rodar localmente, foi necessário ter:

```text
Node.js / npm
Java 17 ou superior
DynamoDB Local baixado
Dependências do hub instaladas
Arquivo .env configurado
```

### Java

O DynamoDB Local baixado exige Java 17 ou superior.

Se o comando abaixo mostrar Java 8, ele não funciona com a versão atual do DynamoDB Local:

```powershell
java -version
```

Exemplo de problema encontrado:

```text
java version "1.8.0_441"
```

Esse Java é antigo demais. Foi necessário instalar um JDK 17.

Uma forma de instalar pelo terminal no Windows é:

```powershell
winget install -e --id EclipseAdoptium.Temurin.17.JDK
```

Depois da instalação, pode ser necessário fechar e abrir o PowerShell. Se mesmo assim o Java antigo continuar aparecendo, ajuste temporariamente o `JAVA_HOME` e o `Path` da sessão:

```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
```

Confirme:

```powershell
java -version
```

O esperado é aparecer algo como:

```text
openjdk version "17..."
```

---

## Estrutura esperada do projeto

O DynamoDB Local foi baixado e colocado na raiz do projeto, no mesmo nível das pastas `hub` e `client`.

Estrutura esperada:

```text
ep-dsid/
├── hub/
├── client/
└── dynamodb_local_latest/
    ├── DynamoDBLocal.jar
    └── DynamoDBLocal_lib/
```

---

## Configuração do `.env`

O arquivo fica em:

```text
hub/.env
```

Configuração usada para rodar localmente:

```env
PORT=3000

AWS_REGION=us-east-1
DYNAMO_TABLE=ep-dsid-hub
DYNAMO_ENDPOINT=http://127.0.0.1:8000

AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

JWT_SECRET=troque-este-segredo
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10
```

### Importante sobre `AWS_PROFILE`

Não deixe `AWS_PROFILE` ativo junto com `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.

Evite isto:

```env
AWS_PROFILE=algum-profile
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

O SDK da AWS pode tentar priorizar o `AWS_PROFILE` e ignorar as credenciais locais, causando erro de credenciais.

Para DynamoDB Local, use apenas:

```env
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

E remova ou comente:

```env
# AWS_PROFILE=
```

---

## Como rodar

São usados três terminais.

---

## Terminal 1 — subir o DynamoDB Local

Na raiz do projeto:

```powershell
cd "C:\Users\Davi Araujo\OneDrive\Documents\GitHub\ep-dsid"
```

Rodar:

```powershell
java "-Djava.library.path=./dynamodb_local_latest/DynamoDBLocal_lib" -jar ./dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -port 8000
```

Esse terminal deve ficar aberto. Se o prompt não voltar, isso é normal: o DynamoDB Local está rodando.

O endpoint usado pelo Hub será:

```text
http://127.0.0.1:8000
```

---

## Terminal 2 — criar a tabela e rodar o Hub

Abra outro PowerShell e entre na pasta do Hub:

```powershell
cd "C:\Users\Davi Araujo\OneDrive\Documents\GitHub\ep-dsid\hub"
```

Crie a tabela no DynamoDB Local:

```powershell
npm.cmd run create-table
```

Se a tabela já existir, o erro de tabela existente não é um problema para continuar.

Depois rode o Hub:

```powershell
npm.cmd run dev
```

Saída esperada:

```text
hub listening on 3000
```

---

## Terminal 3 — testar se o Hub está respondendo

Com o DynamoDB Local e o Hub rodando, teste:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
```

Resposta esperada:

```text
status
------
ok
```

---

## Fluxo básico para testar a API

Depois que o Hub estiver rodando, o fluxo mínimo para testar as rotas principais é:

```text
1. GET /health
2. POST /register
3. POST /auth
4. Guardar o JWT retornado
5. POST /networks
6. POST /networks/:networkId/files
7. GET /networks/:networkId/file
8. POST /heartbeat
9. GET /networks/:networkId/peers
10. POST /networks/:networkId/versions
11. GET /networks/:networkId/versions
```

As rotas públicas são:

```text
GET /health
POST /register
POST /auth
```

As demais exigem header de autenticação:

```http
Authorization: Bearer <jwt>
```

---

## Problemas encontrados e soluções

### 1. Conflito de credenciais AWS

Erro observado:

```text
Multiple credential sources detected:
Both AWS_PROFILE and AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
```

Solução:

- Remover `AWS_PROFILE` do `.env`.
- Usar apenas credenciais locais fake:

```env
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

Se existir variável na sessão do PowerShell, remover com:

```powershell
Remove-Item Env:AWS_PROFILE -ErrorAction SilentlyContinue
```

---

### 2. DynamoDB Local não estava rodando

Erro observado:

```text
ECONNREFUSED ::1:8000
```

Significado:

```text
O Hub tentou conectar no DynamoDB Local, mas não havia serviço escutando na porta 8000.
```

Soluções:

- Subir o DynamoDB Local antes do Hub.
- Usar `127.0.0.1` no `.env` em vez de `localhost`:

```env
DYNAMO_ENDPOINT=http://127.0.0.1:8000
```

Isso evita problemas de resolução IPv6 para `::1`.

---

### 3. Docker não estava instalado

Erro observado:

```text
docker : O termo 'docker' não é reconhecido
```

Solução usada:

```text
Rodar o DynamoDB Local com Java, sem Docker.
```

---

### 4. Java antigo

Erro observado:

```text
UnsupportedClassVersionError
class file version 61.0
this version only recognizes class file versions up to 52.0
```

Significado:

```text
61.0 = Java 17
52.0 = Java 8
```

Solução:

```powershell
winget install -e --id EclipseAdoptium.Temurin.17.JDK
```

Depois ajustar o terminal para usar Java 17, se necessário.

---

## Resumo rápido dos comandos

### Terminal 1

```powershell
cd "C:\Users\Davi Araujo\OneDrive\Documents\GitHub\ep-dsid"
java "-Djava.library.path=./dynamodb_local_latest/DynamoDBLocal_lib" -jar ./dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -port 8000
```

### Terminal 2

```powershell
cd "C:\Users\Davi Araujo\OneDrive\Documents\GitHub\ep-dsid\hub"
npm.cmd run create-table
npm.cmd run dev
```

### Terminal 3

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
```

---

## Resultado esperado

Com tudo configurado corretamente:

```text
DynamoDB Local roda na porta 8000
Hub roda na porta 3000
GET /health retorna { status: "ok" }
Rotas protegidas funcionam com JWT
Dados são persistidos no DynamoDB Local
```
