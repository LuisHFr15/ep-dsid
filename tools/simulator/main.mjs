import { createRandomTables, runScenario } from "./helpers.mjs";

const HUB_URL = process.env.HUB_URL ?? "http://localhost:3000";

const SIMULATION_MODE = "fixed";
// const SIMULATION_MODE = "random";
// const SIMULATION_MODE = "fixed";

const RANDOM_SEED = 12345;
const RANDOM_TICKS = 60;

const baseScenario = {
  name: "MVP 6A - simulador deterministico com 2 arquivos e heartbeats",
  hubUrl: HUB_URL,

  // Cada coluna da tabela representa 1 avanço de tempo.
  tickMs: 2_000,

  // Regra atual do projeto:
  // active_peers <= 4  => fallback true
  // active_peers > 4   => fallback false
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
      description: "Arquivo 1 criado pelo simulador",
      visibility: "public",
    },

    file2: {
      title: "relatorio-file-2.pdf",
      description: "Arquivo 2 criado pelo simulador",
      visibility: "public",
    },
  },

  /*
    Códigos de ações principais:

    -   = nenhuma ação
    H   = GET /health
    A1  = POST /announce para file1
    A2  = POST /announce para file2
    L   = GET /files
    D1  = GET /files/:file_id para file1
    D2  = GET /files/:file_id para file2

    Cada linha corresponde ao peer na mesma posição do array "peers".
    Cada coluna é um tick de tempo.
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
    HB1   = POST /heartbeat online para file1
    HB2   = POST /heartbeat online para file2
    OFF1  = POST /heartbeat offline para file1
    OFF2  = POST /heartbeat offline para file2

    Esta tabela fica separada porque heartbeat representa presença recorrente.
  */
  heartbeatTable: [
  // t0   t1   t2   t3    t4    t5    t6    t7     t8    t9    t10   t11   t12   t13   t14   t15   t16   t17   t18   t19   t20
  ["-",  "-",  "-",  "HB1", "HB1", "HB1", "HB1", "HB1",  "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-1
  ["-",  "-",  "-",  "HB1", "HB1", "HB1", "HB1", "HB1",  "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-2
  ["-",  "-",  "-",  "HB1", "HB1", "-",   "-",   "-",    "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "HB1"], // peer-3 expira
  ["-",  "-",  "-",  "-",   "HB1", "HB1", "HB1", "HB1",  "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1", "HB1"], // peer-4
  ["-",  "-",  "-",  "-",   "-",   "HB1", "HB1", "OFF1", "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-"],   // peer-5 offline explícito

  ["-",  "-",  "-",  "HB2", "HB2", "HB2", "HB2", "HB2",  "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2", "HB2"], // peer-6
  ["-",  "-",  "-",  "-",   "HB2", "HB2", "HB2", "HB2",  "OFF2", "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-",   "-"],   // peer-7 offline explícito
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
      t1: announce file1
      t2: announce file2

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
      HB1: 30,
      HB2: 25,
      OFF1: 5,
      OFF2: 5,
    },
  });

  scenario = {
    ...baseScenario,
    name: `MVP 6B - simulador aleatorio com seed ${seed}`,
    mode: SIMULATION_MODE,
    seed,
    ...randomTables,
  };
} else {
  scenario = {
    ...baseScenario,
    name: "MVP 6A - simulador deterministico com 2 arquivos e heartbeats",
    mode: SIMULATION_MODE,

  };
}

await runScenario(scenario);