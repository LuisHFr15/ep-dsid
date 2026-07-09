import { createRandomTables, runScenario } from "./helpers.mjs";

const HUB_URL = process.env.HUB_URL ?? "http://localhost:3000";

const SIMULATION_MODE = "fixed";
// const SIMULATION_MODE = "random";

const RANDOM_SEED = 12345;
const RANDOM_TICKS = 60;

const baseScenario = {
  name: "simulador deterministico com 2 redes e heartbeats",
  hubUrl: HUB_URL,

  // Cada coluna da tabela representa 1 avanço de tempo.
  tickMs: 2_000,

  // Regra do projeto:
  // activePeers <= 4  => fallback true
  // activePeers > 4   => fallback false
  fallbackThreshold: 4,

  peers: [
    "peer-1",
    "peer-2",
    "peer-3",
    "peer-4",
    "peer-5",
    "peer-6",
    "peer-7",
  ],

  files: {
    file1: {
      title: "relatorio-file-1.pdf",
      description: "Rede 1 criada pelo simulador",
      accessMode: "public",
      updateMode: "centralized",
    },

    file2: {
      title: "relatorio-file-2.pdf",
      description: "Rede 2 criada pelo simulador",
      accessMode: "public",
      updateMode: "centralized",
    },
  },

  /*
    Códigos de ações principais:

    -   = nenhuma ação
    H   = GET /health
    A1  = cria rede + publica versão para file1 (POST /networks + /versions)
    A2  = cria rede + publica versão para file2
    L   = GET /networks
    D1  = GET /networks/:id/file para file1
    D2  = GET /networks/:id/file para file2

    Cada linha corresponde ao peer na mesma posição do array "peers".
    Cada coluna é um tick de tempo. Todas as ações usam o JWT do peer.
  */
  actionTable: [
    // t0   t1    t2    t3   t4    t5
    ["H",  "A1", "A2", "L", "D1", "D2"], // peer-1
    ["-",  "-",  "-",  "L", "D1", "-"],  // peer-2
    ["-",  "-",  "-",  "L", "-",  "D2"], // peer-3
    ["-",  "-",  "-",  "-", "D1", "D2"], // peer-4
    ["-",  "-",  "-",  "-", "-",  "L"],  // peer-5
    ["-",  "-",  "-",  "-", "-",  "D2"], // peer-6
    ["-",  "-",  "-",  "-", "-",  "L"],  // peer-7
  ],

  /*
    Códigos de heartbeat:

    -     = nenhuma ação
    HB1   = POST /heartbeat para a rede de file1
    HB2   = POST /heartbeat para a rede de file2

    Presença offline não é enviada pelo cliente: o hub expira o peer por
    timeout (~30s sem batida). Para "sair", o peer simplesmente para de bater.
  */
  heartbeatTable: [
  // t0   t1   t2   t3    t4    t5    t6    t7    t8    t9    t10   t11   t12   t13   t14   t15   t16   t17   t18   t19   t20
  ["-",  "-",  "-",  "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-1
  ["-",  "-",  "-",  "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-2
  ["-",  "-",  "-",  "HB1", "HB1", "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "HB1"], // peer-3 expira e volta
  ["-",  "-",  "-",  "-",   "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-4
  ["-",  "-",  "-",  "-",   "-",   "HB1", "HB1", "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-"],   // peer-5 para de bater
  ["-",  "-",  "-",  "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2"], // peer-6
  ["-",  "-",  "-",  "-",   "HB2", "HB2", "HB2", "HB2", "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-"],   // peer-7 para de bater
  ],
};

let scenario;
if (SIMULATION_MODE === "random") {
  const seed = RANDOM_SEED;

  const randomTables = createRandomTables({
    seed,
    peers: baseScenario.peers,
    ticks: RANDOM_TICKS,

    /*
      Os 3 primeiros ticks são setup determinístico:
      t0: health
      t1: cria rede file1
      t2: cria rede file2

      Depois disso entra a fase aleatória.
    */
    setupTicks: 3,

    actionWeights: {
      "-": 40,
      L: 20,
      D1: 15,
      D2: 15,
      A1: 0,
      A2: 0,
      H: 2,
    },

    heartbeatWeights: {
      "-": 35,
      HB1: 35,
      HB2: 30,
    },
  });

  scenario = {
    ...baseScenario,
    name: `simulador aleatorio com seed ${seed}`,
    mode: SIMULATION_MODE,
    seed,
    ...randomTables,
  };
} else {
  scenario = {
    ...baseScenario,
    mode: SIMULATION_MODE,
  };
}

await runScenario(scenario);
