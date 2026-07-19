# Guia de Empacotamento — gerar o instalador do cliente

Como transformar o cliente Electron num instalador (`.exe` no Windows, `.deb`/`.zip`
no Linux) para distribuir aos amigos e testar juntos.

O empacotamento usa o **Electron Forge**, já configurado em `client/forge.config.ts`.

---

## 1. Antes de começar

- O `.exe`/instalador embute o endereço do hub. O padrão está fixado em
  `client/src/main/index.ts` (`HUB_BASE_URL`, hoje o EC2 de teste). **Confirme que
  esse IP é o do seu hub em produção antes de buildar** — o amigo não vai definir
  variável de ambiente, então o app usa exatamente esse valor.
- O `webtorrent` precisa estar instalado (já está em `dependencies`). Se clonou do
  zero: `npm install --registry https://registry.npmjs.org` dentro de `client/`.
- **Regra de ouro do Electron Forge:** você gera o instalador para a plataforma em
  que roda o comando. Um Windows gera `.exe`; um Linux gera `.deb`. Fazer
  cross-build (ex: `.exe` a partir do Linux) exige ferramentas extras (ver §4).

---

## 2. Empacotar no Windows (gera o `.exe`)

Numa máquina Windows, dentro de `client/`:

```powershell
npm install --registry https://registry.npmjs.org
npm run make
```

Saída em `client/out/make/`:
- `squirrel.windows/x64/EP-DSID-Setup.exe` — **este é o instalador** que você manda
  para os amigos. Eles dão duplo-clique e o app se instala.
- `zip/win32/x64/EP-DSID-win32-x64-<versão>.zip` — versão **portátil** (roda sem
  instalar; é só extrair e abrir o `ep-dsid.exe`). Bom plano B se o instalador der
  problema de antivírus/SmartScreen.

> **SmartScreen:** como o app não é assinado, o Windows pode mostrar "Windows
> protegeu o seu PC". O amigo clica em **Mais informações → Executar assim mesmo**.
> É esperado para app não assinado — não é vírus.

---

## 3. Empacotar no Linux (gera `.deb` e `.zip`)

Numa máquina Linux (Debian/Ubuntu), dentro de `client/`:

```bash
npm install --registry https://registry.npmjs.org
npm run make
```

Saída em `client/out/make/`:
- `deb/x64/ep-dsid_<versão>_amd64.deb` — instala com
  `sudo dpkg -i ep-dsid_*_amd64.deb` (ou duplo-clique no gerenciador de pacotes).
- `zip/linux/x64/EP-DSID-linux-x64-<versão>.zip` — portátil: extrair e rodar `./ep-dsid`.

---

## 4. Cross-build (gerar `.exe` fora do Windows)

Se você só tem Linux/Mac e precisa do `.exe`, o maker do Windows (Squirrel) exige
o **Wine** instalado:

```bash
# Debian/Ubuntu
sudo apt install wine
# macOS (Homebrew)
brew install --cask wine-stable
```

Depois, force o alvo do Windows:

```bash
npx electron-forge make --targets @electron-forge/maker-zip --platform win32
# o zip win32 é o mais confiável via Wine; o Squirrel (.exe) pode ser instável
# fora do Windows. Se possível, gere o .exe numa máquina Windows de verdade.
```

Na prática, para um teste com amigos, o caminho mais simples é: **gere o `.exe` num
Windows** e o **`.deb`/`.zip` num Linux**. Se só tiver uma plataforma, distribua o
**`.zip` portátil** correspondente — ele não precisa de instalador.

---

## 5. O que mandar para cada amigo

| SO do amigo | Arquivo | Como usar |
|---|---|---|
| Windows | `EP-DSID-Setup.exe` | duplo-clique, instala |
| Windows (portátil) | `EP-DSID-win32-x64-*.zip` | extrair, abrir `ep-dsid.exe` |
| Linux (Debian/Ubuntu) | `ep-dsid_*_amd64.deb` | `sudo dpkg -i ...` |
| Linux (portátil) | `EP-DSID-linux-x64-*.zip` | extrair, rodar `./ep-dsid` |

---

## 6. Pré-requisitos do teste conjunto

Para o P2P funcionar entre os amigos:
1. **O hub precisa estar no ar** e acessível pela internet (o EC2, na porta do
   `HUB_BASE_URL` embutido). Confirme que o security group libera essa porta.
2. Cada amigo abre o app, **registra um usuário**, entra numa rede e publica/baixa.
3. **Rede sem bloqueio de BitTorrent** — WebTorrent usa WebRTC/trackers públicos;
   algumas redes corporativas/faculdade bloqueiam. Se um peer não conecta, testem
   em outra rede (ex: 4G).
4. Se ninguém estiver semeando e houver ≤4 peers, o **fallback** (se ligado) entra
   como seeder — confira os logs do fallback (`[fallback] JOIN ...`).

---

## 7. Detalhe técnico (por que a config é assim)

O `webtorrent` é marcado como `external` no `vite.main.config.ts` (não é bundlado —
é ESM com binários nativos e workers, que não bundlam de forma confiável). Por
padrão, o plugin-vite do Forge descartaria o `node_modules` inteiro do pacote, o que
quebraria o P2P com "Cannot find module 'webtorrent'". Por isso o
`forge.config.ts` sobrescreve `packagerConfig.ignore` para **preservar o
node_modules** — o packager remove as devDependencies no prune, então só o
webtorrent e suas dependências de produção vão para o instalador.
