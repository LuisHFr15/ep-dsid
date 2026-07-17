# Known Limitations

Este documento registra comportamentos simplificados, exceções não tratadas e decisões temporárias adotadas durante os MVPs.

Cada item deve indicar:

- MVP de origem;
- comportamento atual;
- comportamento esperado no produto final;
- impacto;
- momento provável de revisão;
- status.

## Status possíveis

- **Open** — identificado, ainda sem decisão de correção;
- **Accepted for MVP** — limitação aceita conscientemente no MVP atual;
- **Scheduled** — correção associada a um MVP futuro;
- **Resolved** — comportamento corrigido e coberto por teste;
- **Won't fix** — comportamento mantido por decisão de produto.

---

## KL-001 — Redes privadas aparecem sem detalhes para usuários sem acesso

**MVP de origem:** MVP 7  
**Status:** Accepted for MVP

### Comportamento atual

A listagem geral pode exibir redes privadas para usuários sem acesso. As consultas de arquivo, versões e peers retornam `403`, e o client representa esses detalhes como indisponíveis.

### Comportamento final esperado

Definir explicitamente se redes privadas devem ser descobertas por usuários externos e como a interface deve representar redes visíveis, solicitáveis e acessíveis.

### Impacto

- uma rede privada pode aparecer sem conteúdo;
- o usuário pode interpretar a ausência de detalhes como erro;
- listagem e autorização de leitura possuem semânticas diferentes.

### Revisão prevista

Revisar durante o refinamento de descoberta e autorização de redes.

---

## KL-002 — Leitura não garante autorização para contribuir

**MVP de origem:** MVP 6  
**Status:** Accepted for MVP

### Comportamento atual

O Hub possui regras próprias para leitura, publicação e promoção. Nos testes do MVP 8A serão usados apenas usuários e redes nos quais publicação e promoção funcionem.

### Comportamento final esperado

A interface deve informar claramente quais ações cada usuário pode executar em cada rede, e os testes devem cobrir redes centralizadas, colaborativas, públicas e privadas.

### Impacto

- um usuário pode conseguir baixar e não conseguir republicar;
- alguns fluxos do FakeTorrent podem falhar por autorização;
- o MVP 8A evita deliberadamente esses cenários.

### Revisão prevista

Revisar ao consolidar permissões e capacidades exibidas pelo client.

---

## KL-003 — `infoHash` e `magnet` contêm caminho absoluto local

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

O `FakeTorrentEngine` usa o caminho absoluto da cópia local como valor de `infoHash` e `magnet`.

### Motivo

Permitir que outro client, executado na mesma máquina, encontre a origem e copie diretamente o arquivo sem implementar descoberta P2P.

### Comportamento final esperado

- `infoHash` deve ser o identificador real produzido pela engine BitTorrent;
- `magnet` deve ser um magnet URI válido;
- caminhos locais não devem ser enviados ao Hub.

### Impacto

- não funciona entre máquinas;
- expõe a estrutura local de diretórios;
- mover ou excluir o arquivo invalida a origem;
- o valor não representa identidade de conteúdo.

### Revisão prevista

Remover ao implementar `WebTorrentEngine`.

---

## KL-004 — Cada download cria e promove uma versão artificial

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

Sempre que um usuário baixa o arquivo atual, o client:

1. copia o arquivo para a workspace local;
2. publica uma nova versão com o mesmo conteúdo;
3. promove essa nova versão;
4. faz o Hub apontar para a cópia recém-materializada.

### Motivo

Manter o Hub apontando para uma origem local recente sem implementar descoberta de múltiplos peers ou sincronização de disponibilidade.

### Comportamento final esperado

Um download não deve criar uma versão. Uma nova versão deve representar alteração de conteúdo ou publicação explícita.

### Impacto

- histórico inflado;
- versões consecutivas podem possuir conteúdo idêntico;
- versão representa também mudança de localização física;
- `parentVersionId` cresce a cada download.

### Revisão prevista

Remover quando WebTorrent e disponibilidade por peers substituírem o caminho local.

---

## KL-005 — O FakeTorrent possui responsabilidades extras

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

A interface `TorrentEngine` recebe `networkId`, `networkTitle` e a raiz da workspace. A implementação fake cria a pasta legível da rede e materializa arquivos diretamente nela.

### Comportamento final esperado

Reavaliar a separação entre:

- engine de transferência;
- materialização da biblioteca;
- resolução do caminho da rede;
- sincronização local.

### Impacto

A interface atual é específica do estágio local do TorrentHub e é mais larga do que uma abstração mínima de WebTorrent.

### Revisão prevista

Refatorar antes ou durante a implementação do `WebTorrentEngine`.

---

## KL-006 — Apenas uma origem física é usada

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

O caminho presente no `magnet` aponta para uma única cópia local. Não há descoberta, seleção ou combinação de múltiplas origens.

### Comportamento final esperado

A engine real deve descobrir peers e baixar o conteúdo sem depender de um caminho de filesystem remoto.

### Impacto

Se a origem for movida, excluída ou ficar indisponível, o download falha mesmo que outra pessoa tenha uma cópia.

### Revisão prevista

Remover com WebTorrent.

---

## KL-007 — Exclusão local não atualiza disponibilidade no Hub

**MVP de origem:** MVP 8A  
**Status:** Scheduled

### Comportamento atual

Se um usuário excluir um arquivo materializado, o Hub continua apontando para os metadados publicados. A ausência só é percebida em uma tentativa de download.

### Comportamento final esperado

O client deve detectar mudanças e exclusões, atualizar seu estado de disponibilidade e evitar anunciar conteúdo que não possui.

### Impacto

- metadados podem apontar para arquivo inexistente;
- download falha somente em tempo de execução;
- presença online não garante posse da versão.

### Revisão prevista

MVP 9 — monitoramento e sincronização.

---

## KL-008 — Presença não informa quais versões o peer possui

**MVP de origem:** MVP 5/6  
**Status:** Scheduled

### Comportamento atual

O heartbeat indica presença na rede, mas não informa se o peer possui o arquivo atual ou uma versão específica.

### Comportamento final esperado

Separar claramente:

- peer online na rede;
- peer que possui uma versão completa;
- peer apto a servir o conteúdo.

### Impacto

O Hub não consegue inferir disponibilidade real apenas pelo heartbeat.

### Revisão prevista

Reavaliar durante os MVPs de sincronização e WebTorrent.

---

## KL-009 — Versões antigas podem apontar para conteúdo sobrescrito

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

Uma pasta de rede mantém uma única cópia materializada por nome de arquivo. Uma nova versão pode sobrescrever o arquivo no mesmo caminho, enquanto versões antigas continuam registradas no Hub.

### Comportamento final esperado

Definir se versões antigas precisam continuar materializáveis e como o conteúdo imutável será localizado pela engine real.

### Impacto

O histórico lógico existe, mas uma versão antiga pode não ser recuperável pelo FakeTorrent.

### Revisão prevista

Revisar com WebTorrent e política de retenção de versões.

---

## KL-010 — Nome de arquivo é único dentro de uma rede

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

O client assume que, dentro de uma rede, o nome do arquivo identifica unicamente o arquivo materializado.

### Comportamento final esperado

Confirmar se a regra será permanente ou se o modelo deverá suportar múltiplos arquivos, subdiretórios e torrents com vários arquivos.

### Impacto

O MVP 8A não cobre colisões de nome nem torrents multi-arquivo.

### Revisão prevista

Revisar antes de suportar torrents multi-arquivo.

---

## KL-011 — Concorrência de escrita local é limitada

**MVP de origem:** MVP 7/8A  
**Status:** Open

### Comportamento atual

Stores JSON usam substituição de arquivo, mas não há lock entre processos. Dois comandos concorrentes do mesmo usuário podem sobrescrever atualizações.

### Comportamento final esperado

Adicionar estratégia adequada para estado concorrente, armazenamento transacional ou processo único por contexto.

### Impacto

Execuções simultâneas sobre o mesmo `CLIENT_DATA_DIR` podem perder atualizações.

### Revisão prevista

Reavaliar na migração para Electron e runtimes persistentes.

---

## Critério para marcar uma limitação como resolvida

Uma limitação só deve ser marcada como **Resolved** quando:

- o comportamento temporário deixou de existir;
- o código específico foi removido ou substituído;
- existe teste cobrindo o comportamento esperado;
- a documentação e os comandos não dependem mais da limitação.

---

## KL-011 — FakeTorrent usa caminho absoluto como magnet e infoHash

**MVP de origem:** MVP 8A  
**Status:** Accepted for MVP

### Comportamento atual

O FakeTorrent usa o caminho absoluto da cópia publicada nos campos `magnet`
e `infoHash`.

### Comportamento final esperado

O WebTorrent deve fornecer um info hash e um magnet URI reais.

### Impacto

- funciona apenas na mesma máquina;
- depende da origem permanecer no mesmo caminho;
- não representa descoberta de múltiplos peers.

### Revisão prevista

Substituição do FakeTorrent pelo WebTorrent.

---

## KL-012 — Download não registra disponibilidade no Hub

**MVP de origem:** MVP 8B  
**Status:** Accepted for MVP

### Comportamento atual

O download copia o arquivo e registra a materialização apenas no manifesto local
`library.json`. O Hub continua apontando para a origem que publicou a versão.

### Comportamento final esperado

A disponibilidade deve ser representada pela engine P2P e pela presença real dos
seeders, sem criar uma nova versão apenas porque outro usuário baixou o arquivo.

### Revisão prevista

Integração do WebTorrent e evolução do modelo de presença/disponibilidade.

---

## KL-013 — Reconciliação da biblioteca é manual

**MVP de origem:** MVP 8B  
**Status:** Accepted for MVP

### Comportamento atual

A existência dos arquivos registrados é conferida apenas quando o usuário executa:

```text
library:reconcile
```

### Comportamento final esperado

O client deve executar verificações periódicas e detectar mudanças locais e remotas.

### Revisão prevista

MVP 9 — polling, detecção e sincronização controlada.
