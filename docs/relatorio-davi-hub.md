# Relatório — Frente Hub/API em memória e simulador

Nesta frente foi implementada uma versão inicial do plano de controle do Hub/API usando armazenamento temporário em memória. O objetivo foi permitir testes locais dos contratos HTTP principais sem depender, neste momento, da integração com DynamoDB.

A implementação atual permite publicar arquivos, listar o catálogo, consultar detalhes de um arquivo específico e registrar presença de peers por arquivo.

## Funcionalidades implementadas

Foi criado um `MemoryStore` para armazenar temporariamente arquivos, versões e presença de peers durante a execução do servidor. Esses dados ficam apenas em RAM e são perdidos quando o processo do hub é reiniciado.

Foram adicionadas as seguintes rotas:

```text
POST /announce
GET /files
GET /files/:file_id
POST /heartbeat