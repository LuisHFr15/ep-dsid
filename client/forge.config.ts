import type { ForgeConfig } from '@electron-forge/shared-types'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'EP-DSID',
    executableName: 'ep-dsid',
    // O plugin-vite, por padrão, define um ignore que descarta TUDO fora de
    // /.vite — incluindo node_modules. Isso quebra o webtorrent, que é external
    // (não bundlado) e precisa existir em node_modules em runtime. Sobrescrevemos
    // o ignore para preservar também node_modules; o packager remove as
    // devDependencies no prune, então só as deps de produção (webtorrent + suas
    // transitivas) vão para o pacote.
    ignore: (file: string) => {
      if (!file) return false
      if (file.startsWith('/.vite')) return false
      if (file === '/package.json') return false
      if (file.startsWith('/node_modules')) return false
      return true
    },
  },
  rebuildConfig: {},
  makers: [
    // Windows: instalador .exe (Squirrel). Fora do Windows exige Wine instalado.
    new MakerSquirrel({
      name: 'ep-dsid',
      setupExe: 'EP-DSID-Setup.exe',
    }),
    // Portátil (roda sem instalar) — plano B à prova de falhas para Windows e Linux.
    new MakerZIP({}, ['win32', 'linux']),
    // Linux Debian/Ubuntu: pacote .deb.
    new MakerDeb({
      options: {
        name: 'ep-dsid',
        productName: 'EP-DSID',
        bin: 'ep-dsid',
        description: 'Cliente EP-DSID de compartilhamento de arquivos P2P',
        productDescription:
          'App desktop do EP-DSID: compartilhamento de arquivos P2P (WebTorrent) coordenado por um hub central.',
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    })
  ]
}

export default config
