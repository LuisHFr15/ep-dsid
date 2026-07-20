// Configuração do PM2 para o hub (API HTTP + avaliador de fallback).
//
// Antes de subir, gere o build: `npm run build` (compila para dist/) e crie a
// tabela uma vez: `npm run create-table`.
// Depois: `pm2 start ecosystem.config.js` (a partir desta pasta ou de qualquer
// lugar — cwd é fixado abaixo).
//
// IMPORTANTE: o hub mantém estado em memória (cache de presença e o mapa que
// controla se o fallback já entrou em cada rede, usado pelo sweep periódico).
// Ele DEVE rodar como uma única instância em modo fork. Em cluster/múltiplas
// instâncias, cada processo teria seu próprio estado e enviaria comandos
// JOIN/LEAVE redundantes ao SQS.

module.exports = {
  apps: [
    {
      name: "ep-dsid-hub",
      script: "dist/main/index.js",
      // Fixa o diretório de trabalho na pasta do pacote, para que o dotenv leia
      // o .env daqui, independentemente de onde o pm2 for invocado.
      cwd: __dirname,

      // Estado único: nunca rode em paralelo (ver nota acima).
      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      // Evita loop de reinício se o processo morrer logo no boot (ex: .env
      // inválido ou tabela ausente): precisa ficar 10s de pé para o reinício
      // não contar como falha.
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,

      // O shutdown gracioso (SIGTERM/SIGINT) faz flush da presença e fecha o
      // servidor HTTP, com um limite interno de 5s. Damos margem ao PM2.
      kill_timeout: 8000,

      // Logs com timestamp (as mensagens do app não trazem hora por conta própria).
      time: true,
      output: "./logs/hub-out.log",
      error: "./logs/hub-error.log",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
