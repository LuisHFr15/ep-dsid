// Configuração do PM2 para o worker de fallback.
//
// Antes de subir, gere o build: `npm run build` (compila para dist/).
// Depois: `pm2 start ecosystem.config.js` (a partir desta pasta ou de qualquer
// lugar — cwd é fixado abaixo).
//
// IMPORTANTE: o fallback é um worker com estado ÚNICO — um consumidor SQS, um
// seed-state.json e um Map de torrents em memória. Ele DEVE rodar como uma
// única instância em modo fork. Cluster ou múltiplas instâncias causariam
// seeding duplicado e corrida na escrita do seed-state.

module.exports = {
  apps: [
    {
      name: "ep-dsid-fallback",
      script: "dist/main/index.js",
      // Fixa o diretório de trabalho na pasta do pacote, para que o dotenv leia
      // o .env daqui e o SEED_DIR padrão (./data) resolva de forma consistente,
      // independentemente de onde o pm2 for invocado.
      cwd: __dirname,

      // Estado único: nunca rode em paralelo (ver nota acima).
      instances: 1,
      exec_mode: "fork",

      // O worker tem loop interno de retry com backoff para falhas transitórias
      // (rede/credencial), então o PM2 só precisa reiniciar em crash real.
      autorestart: true,
      // Evita loop de reinício se o processo morrer logo no boot (ex: .env
      // inválido): precisa ficar 10s de pé para o reinício não contar como falha.
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,

      // O shutdown gracioso (SIGTERM/SIGINT) fecha o seeder e pode levar até 5s.
      // Dá margem para o PM2 não mandar SIGKILL antes de terminar.
      kill_timeout: 8000,

      // Logs com timestamp (as mensagens do app não trazem hora por conta própria).
      time: true,
      output: "./logs/fallback-out.log",
      error: "./logs/fallback-error.log",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
