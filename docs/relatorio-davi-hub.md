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


A rota POST /announce permite simular a publicação de um arquivo no hub. Ela recebe metadados como título, descrição, visibilidade, magnet_uri e info_hash, gera identificadores para o arquivo e sua versão, e salva essas informações em memória.

A rota GET /files retorna a lista de arquivos registrados no catálogo em memória.

A rota GET /files/:file_id retorna os detalhes de um arquivo específico, incluindo a versão atual e os dados necessários para o futuro uso com WebTorrent, como magnet_uri e info_hash.

A rota POST /heartbeat registra a presença de um peer em um arquivo específico. A presença é controlada pela combinação de file_id e peer_uuid, permitindo contar quantos peers estão ativos para cada arquivo.

Regra de fallback

A implementação também calcula uma decisão inicial de fallback com base na quantidade de peers ativos por arquivo.

A regra utilizada foi:

active_peers <= 4  -> should_activate_fallback = true
active_peers > 4   -> should_activate_fallback = false

Essa regra ainda não aciona um fallback real. Por enquanto, ela apenas aparece na resposta da API para indicar se o fallback deveria ser ativado.

Timeout de peers

Foi adicionada uma lógica de timeout para peers inativos. Um peer com status online que fica mais de aproximadamente 30 segundos sem enviar heartbeat é marcado como offline e deixa de ser contado em active_peers.

Isso evita que peers que fecharam o cliente, perderam conexão ou pararam de responder continuem sendo considerados ativos indefinidamente.

A resposta do heartbeat também inclui expired_peers, indicando quantos peers foram expirados naquela chamada.

Simulador externo

Também foi criado um simulador externo em:

tools/simulator/

O simulador executa chamadas HTTP contra o hub como se fossem múltiplos clientes/peers.

Ele utiliza duas tabelas principais:

actionTable
heartbeatTable

A actionTable descreve ações principais por peer e por tempo, como health check, publicação de arquivos, listagem e consulta de detalhes.

A heartbeatTable descreve ações recorrentes de presença, como heartbeats online e marcação explícita de peers offline.

O simulador suporta cenários determinísticos e também cenários semi-aleatórios com seed, permitindo repetir execuções específicas quando algum comportamento inesperado aparece.

Ele valida automaticamente as respostas da API e gera um relatório final indicando quais ações passaram e quais falharam.

O que esta frente permite testar

Com essa implementação, já é possível testar localmente:

- se o hub está respondendo;
- se arquivos podem ser anunciados;
- se arquivos aparecem no catálogo;
- se os detalhes de um arquivo retornam a versão atual;
- se a presença de peers é registrada por arquivo;
- se a contagem de peers ativos está correta;
- se a regra de fallback responde à quantidade de peers ativos;
- se peers inativos expiram após o timeout;
- se múltiplos peers conseguem interagir com o hub em uma simulação.
Limitações atuais

Esta implementação ainda é temporária e não representa a versão final do sistema.

As principais limitações são:

- os dados ainda são armazenados apenas em memória, sem DynamoDB;
- as rotas novas ainda não exigem autenticação JWT;
- o fallback real via SQS ainda não foi implementado;
- ainda não há integração com WebTorrent real;
- ainda não há cliente Electron;
- o simulador testa o plano de controle da API, mas não transfere arquivos reais.
Próximos passos sugeridos

Os próximos passos naturais são:

1. integrar a persistência real com DynamoDB para arquivos e versões;
2. iniciar a frente do cliente, começando por um client-core reaproveitável no Electron;
3. futuramente integrar WebTorrent real ao cliente;
4. posteriormente conectar a decisão de fallback ao mecanismo real via SQS.