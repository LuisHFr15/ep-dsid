import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts',
      fileName: () => 'main.js',
      formats: ['cjs']
    },
    rollupOptions: {
      // webtorrent é ESM-only, tem binários nativos e workers próprios — não é
      // bundlável de forma confiável no modo lib. Fica external e é copiado para
      // o pacote via packagerConfig (ver forge.config.ts).
      external: ['electron', 'webtorrent']
    }
  }
})