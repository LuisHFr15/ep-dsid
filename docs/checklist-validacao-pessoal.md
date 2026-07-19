# Checklist de Validação — testes no PC pessoal

Roteiro do que **não conseguimos testar na máquina corporativa** (Electron e
BitTorrent bloqueados) e do que as mudanças recentes de segurança/UX podem ter
afetado. Cada item tem: o que testar, como, e o resultado esperado. Marque `[x]`
ao validar.

O catálogo completo de limitações conhecidas está em `KNOWN_LIMITATIONS.md` —
este arquivo é o **roteiro de teste**, não duplica o catálogo.

---

## A. Mudanças de segurança recentes (regressão)

Estas mudanças foram feitas sem poder rodar o app aqui. O risco é terem quebrado
o fluxo normal — o objetivo é confirmar que **não** quebraram.

- [ ] **Publicar continua funcionando (bind ao diálogo nativo).**
  Agora só arquivos escolhidos pelo botão de seleção podem ser publicados.
  - Passos: abra uma rede → botão de publicar → escolha um arquivo pelo diálogo → confirme.
  - Esperado: publica normalmente, aparece nova versão, o torrent começa a semear.
  - ⚠ Se der "Selecione o arquivo pelo botão antes de publicar" num fluxo legítimo,
    o bind quebrou algo — reporte.

- [ ] **CSP não quebrou a interface.**
  Foi adicionada uma Content-Security-Policy (estrita em produção, relaxada em dev).
  - Passos: `HUB_BASE_URL=http://localhost:3000 npm run dev`, abra o DevTools (Console).
  - Esperado: a UI carrega completa (estilos, fontes Inter, ícones); **nenhum** erro
    vermelho de `Content Security Policy` / `Refused to load/connect` no console.
  - ⚠ Se algum estilo/fonte sumir ou aparecer erro de CSP, me avise qual recurso foi
    bloqueado (a política precisa liberar aquela origem).

- [ ] **`session.json` gravado com permissão restrita (0600).**
  - Passos: faça login no app; localize a pasta de dados do Electron
    (no Linux costuma ser `~/.config/<nome-do-app>/`; procure o arquivo com
    `find ~/.config -name session.json 2>/dev/null`).
  - Rode `ls -l` no arquivo. Esperado: `-rw-------` (só o dono lê/escreve).

- [ ] **Download cai na pasta certa (sanitização de nome).**
  - Passos: em outra máquina/rede, baixe o arquivo atual de uma rede.
  - Esperado: o arquivo aparece dentro da pasta da rede no workspace, com nome legível.
  - (Opcional, se souber forjar) um nome com `../` no hub **não** deve escrever fora
    da pasta da rede.

---

## B. Mudanças de UX recentes

- [ ] **Aba Peers mostra nickname, não UUID.**
  - Passos: entre numa rede com peers online, abra a aba Peers.
  - Esperado: cada peer aparece com o **nome de usuário** (ex: `alice`), não um
    hash/UUID; e **sem** aviso de "poucos peers / fallback".

- [ ] **Workspace autoconfigurado no primeiro boot.**
  - Passos: apague o `workspace.json` da pasta de dados e reinicie o app.
  - Esperado: a pasta `~/Documents/EP-DSID` é criada sozinha; a tela de Workspace
    mostra essa pasta como configurada (sem obrigar o usuário a escolher).

---

## C. Fallback e logs (precisa de SQS + rede sem bloqueio)

- [ ] **Logs de JOIN/LEAVE legíveis no fallback.**
  - Passos: com hub + fallback + SQS ligados, faça uma rede cair para ≤4 peers
    (feche clientes) e depois voltar a >4.
  - Esperado no console do fallback:
    `[fallback] JOIN — entrando na rede=... arquivo=... — começando a semear`
    e, ao sair, `[fallback] LEAVE — saindo da rede=... — parando de semear`.
    JOINs redundantes aparecem como `JOIN ignorado (já semeando)`.

- [ ] **Hub loga o envio de comandos.**
  - Esperado no console do hub: `fallback -> JOIN rede=... arquivo=...`
    (antes, com SQS configurado, o hub não logava nada).

- [ ] **JOIN redundante após restart do hub é absorvido.**
  - Passos: com o fallback já semeando uma rede, reinicie o hub.
  - Esperado: o hub pode reenviar um JOIN (o `Map` de estado é em memória), mas o
    fallback loga `JOIN ignorado (já semeando)` e nada quebra. É o comportamento
    esperado — não é erro.

---

## D. Cenários de usabilidade ainda não cobertos

Pontos frágeis a exercitar de verdade (P2P real, várias máquinas):

- [ ] **Arquivo indisponível: rede sem peers e sem fallback.**
  Publique numa rede, feche o único seeder, e tente baixar de outra máquina antes
  de o fallback entrar. Esperado: download não completa / fica esperando — confirmar
  que a UI comunica isso de forma clara (não trava sem feedback).

- [ ] **Reconexão após queda.** Derrube o hub por alguns segundos durante o uso do
  cliente e volte. Esperado: o cliente se recupera (heartbeat/presença volta) sem
  precisar reiniciar.

- [ ] **Dois publicadores quase simultâneos** na mesma rede colaborativa (concorrência
  de escrita). Esperado: ambas as versões existem no DAG; a promoção resolve por LWW
  sem perder dados. (Ver KL sobre concorrência em `KNOWN_LIMITATIONS.md`.)

- [ ] **Download de arquivo grande** (centenas de MB): progresso e conclusão na aba
  Transferências; memória estável.

- [ ] **Vários peers reais** (3+ máquinas) compartilhando a mesma rede: confirmar que
  a contagem de peers e a troca P2P funcionam ponta a ponta.

---

> Encontrou um comportamento fora do esperado? Anote o item, o que viu e o log
> relevante — a gente transforma em correção ou em nova entrada no
> `KNOWN_LIMITATIONS.md`.
