import { randomUUID } from "node:crypto";

const EMPTY_ACTION = "-";
const SIM_PASSWORD = "sim-pass";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createRandomTables({
  seed,
  peers,
  ticks,
  setupTicks,
  actionWeights,
  heartbeatWeights,
}) {
  const random = createSeededRandom(seed);

  const actionTable = createEmptyTable(peers.length, ticks);
  const heartbeatTable = createEmptyTable(peers.length, ticks);

  actionTable[0][0] = "H";
  actionTable[0][1] = "A1";
  actionTable[0][2] = "A2";

  for (let peerIndex = 0; peerIndex < peers.length; peerIndex++) {
    for (let tick = setupTicks; tick < ticks; tick++) {
      actionTable[peerIndex][tick] = pickWeighted(actionWeights, random);
      heartbeatTable[peerIndex][tick] = pickWeighted(heartbeatWeights, random);
    }
  }

  if (ticks > setupTicks + 1 && peers.length >= 2) {
    actionTable[1][setupTicks] = "L";
  }

  if (ticks > setupTicks + 2 && peers.length >= 3) {
    actionTable[2][setupTicks + 1] = "D1";
    actionTable[3 % peers.length][setupTicks + 2] = "D2";
  }

  if (ticks > setupTicks + 4 && peers.length >= 5) {
    const burstTick = setupTicks + 3;
    for (let peerIndex = 0; peerIndex < Math.min(5, peers.length); peerIndex++) {
      heartbeatTable[peerIndex][burstTick] = "HB1";
    }
  }

  if (ticks > setupTicks + 5 && peers.length >= 7) {
    const file2Tick = setupTicks + 4;
    heartbeatTable[5][file2Tick] = "HB2";
    heartbeatTable[6][file2Tick] = "HB2";
  }

  return { actionTable, heartbeatTable };
}

function createEmptyTable(rows, columns) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => EMPTY_ACTION)
  );
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickWeighted(weights, random) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let value = random() * total;
  for (const [action, weight] of entries) {
    value -= weight;
    if (value <= 0) {
      return action;
    }
  }

  return entries.at(-1)[0];
}

export async function runScenario(scenario) {
  const context = {
    scenario,
    files: {},
    tokens: {},
    results: [],
    failures: [],
  };

  printScenarioHeader(scenario);

  await authenticatePeers(context);

  const totalTicks = getTotalTicks(scenario);

  for (let tick = 0; tick < totalTicks; tick++) {
    const timeLabel = `${tick * scenario.tickMs}ms`;
    console.log(`\n=== Tick ${tick} (${timeLabel}) ===`);

    const scheduledActions = collectActionsForTick(scenario, tick);

    if (scheduledActions.length === 0) {
      console.log("Nenhuma ação neste tick.");
    } else {
      await Promise.all(
        scheduledActions.map((scheduledAction) =>
          executeScheduledAction(scheduledAction, context)
        )
      );
    }

    if (tick < totalTicks - 1) {
      await sleep(scenario.tickMs);
    }
  }

  printReport(context);
}

async function authenticatePeers(context) {
  console.log("\nAutenticando peers (register + login)...");

  for (const peer of context.scenario.peers) {
    await request(context.scenario.hubUrl, "/register", {
      method: "POST",
      body: { user: peer, password: SIM_PASSWORD },
    });

    const login = await request(context.scenario.hubUrl, "/auth", {
      method: "POST",
      body: { user: peer, password: SIM_PASSWORD },
    });

    if (login.status !== 200 || !login.body?.jwt) {
      throw new Error(`falha ao autenticar ${peer}: status ${login.status}`);
    }

    context.tokens[peer] = login.body.jwt;
  }

  console.log(`${context.scenario.peers.length} peers autenticados.`);
}

function getTotalTicks(scenario) {
  const actionTicks = Math.max(...scenario.actionTable.map((row) => row.length));
  const heartbeatTicks = Math.max(...scenario.heartbeatTable.map((row) => row.length));
  return Math.max(actionTicks, heartbeatTicks);
}

function collectActionsForTick(scenario, tick) {
  const scheduled = [];

  for (let peerIndex = 0; peerIndex < scenario.peers.length; peerIndex++) {
    const peer = scenario.peers[peerIndex];

    const actionCode = scenario.actionTable?.[peerIndex]?.[tick] ?? EMPTY_ACTION;
    const heartbeatCode = scenario.heartbeatTable?.[peerIndex]?.[tick] ?? EMPTY_ACTION;

    for (const code of expandCell(actionCode)) {
      scheduled.push({ source: "actionTable", tick, peer, code });
    }

    for (const code of expandCell(heartbeatCode)) {
      scheduled.push({ source: "heartbeatTable", tick, peer, code });
    }
  }

  return scheduled.filter((action) => action.code !== EMPTY_ACTION);
}

function expandCell(cell) {
  if (!cell || cell === EMPTY_ACTION) {
    return [];
  }

  if (Array.isArray(cell)) {
    return cell;
  }

  return String(cell)
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function executeScheduledAction(scheduledAction, context) {
  const { tick, peer, code, source } = scheduledAction;
  const label = `[tick ${tick}] [${peer}] [${code}]`;

  try {
    const result = await executeAction(scheduledAction, context);
    const validationErrors = validateActionResult(scheduledAction, result, context);

    const record = {
      ok: validationErrors.length === 0,
      tick,
      peer,
      code,
      source,
      request: result.request,
      response: result.response,
      validationErrors,
    };

    context.results.push(record);

    if (record.ok) {
      printSuccess(label, result.response.body);
    } else {
      context.failures.push(record);
      printFailure(label, validationErrors, result.response.body);
    }
  } catch (error) {
    const record = { ok: false, tick, peer, code, source, error };
    context.results.push(record);
    context.failures.push(record);
    console.log(`FAIL ${label} erro inesperado`);
    console.log(`   ${error.message}`);
  }
}

async function executeAction(scheduledAction, context) {
  const { peer, code } = scheduledAction;

  if (code === "H") {
    return executeHealth(context);
  }

  if (code === "L") {
    return executeList(peer, context);
  }

  if (code.startsWith("A")) {
    return executeAnnounce(fileKeyFromCode(code), peer, context);
  }

  if (code.startsWith("D")) {
    return executeDetails(fileKeyFromCode(code), peer, context);
  }

  if (code.startsWith("HB")) {
    return executeHeartbeat(fileKeyFromCode(code), peer, context);
  }

  throw new Error(`Ação desconhecida: ${code}`);
}

function fileKeyFromCode(code) {
  const match = code.match(/\d+/);
  if (!match) {
    throw new Error(`Código de ação não possui número de arquivo: ${code}`);
  }
  return `file${match[0]}`;
}

async function executeHealth(context) {
  const response = await request(context.scenario.hubUrl, "/health");
  return { request: { method: "GET", path: "/health" }, response };
}

async function executeAnnounce(fileKey, peer, context) {
  const fileConfig = context.scenario.files[fileKey];
  if (!fileConfig) {
    throw new Error(`Arquivo não configurado no cenário: ${fileKey}`);
  }

  const token = getToken(peer, context);
  const createBody = {
    title: fileConfig.title,
    description: fileConfig.description ?? "",
    accessMode: fileConfig.accessMode ?? "public",
    updateMode: fileConfig.updateMode ?? "centralized",
  };

  const createResponse = await request(context.scenario.hubUrl, "/networks", {
    method: "POST",
    body: createBody,
    token,
  });

  if (createResponse.status !== 201 || !createResponse.body?.id) {
    return { request: { method: "POST", path: "/networks", body: createBody, fileKey }, response: createResponse };
  }

  const networkId = createResponse.body.id;
  const fakeHash = randomUUID().replaceAll("-", "");
  const publishBody = {
    infoHash: fakeHash,
    filename: fileConfig.title,
    magnet: `magnet:?xt=urn:btih:${fakeHash}`,
  };

  const publishResponse = await request(
    context.scenario.hubUrl,
    `/networks/${networkId}/versions`,
    { method: "POST", body: publishBody, token }
  );

  if (publishResponse.status === 201) {
    context.files[fileKey] = {
      ...fileConfig,
      networkId,
      ownerPeer: peer,
      fileId: publishResponse.body?.fileId,
      versionId: publishResponse.body?.versionId,
      infoHash: fakeHash,
    };
  }

  return {
    request: { method: "POST", path: `/networks/${networkId}/versions`, body: publishBody, fileKey },
    response: publishResponse,
  };
}

async function executeList(peer, context) {
  const response = await request(context.scenario.hubUrl, "/networks", {
    token: getToken(peer, context),
  });
  return { request: { method: "GET", path: "/networks" }, response };
}

async function executeDetails(fileKey, peer, context) {
  const file = getKnownFile(fileKey, context);
  const path = `/networks/${file.networkId}/file`;
  const response = await request(context.scenario.hubUrl, path, {
    token: getToken(peer, context),
  });
  return { request: { method: "GET", path, fileKey }, response };
}

async function executeHeartbeat(fileKey, peer, context) {
  const file = getKnownFile(fileKey, context);
  const body = { networkId: file.networkId, peerId: peer };

  const response = await request(context.scenario.hubUrl, "/heartbeat", {
    method: "POST",
    body,
    token: getToken(peer, context),
  });

  return { request: { method: "POST", path: "/heartbeat", body, fileKey }, response };
}

function getToken(peer, context) {
  const token = context.tokens[peer];
  if (!token) {
    throw new Error(`peer ${peer} não autenticado.`);
  }
  return token;
}

function getKnownFile(fileKey, context) {
  const file = context.files[fileKey];
  if (!file) {
    throw new Error(
      `A ação precisa de ${fileKey}, mas essa rede ainda não foi criada.`
    );
  }
  return file;
}

async function request(hubUrl, path, options = {}) {
  const method = options.method ?? "GET";

  const headers = { "Content-Type": "application/json" };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const fetchOptions = { method, headers };
  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const httpResponse = await fetch(`${hubUrl}${path}`, fetchOptions);
  const rawText = await httpResponse.text();

  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = rawText;
  }

  return { status: httpResponse.status, ok: httpResponse.ok, body, rawText };
}

function validateActionResult(scheduledAction, result, context) {
  const { code } = scheduledAction;

  if (code === "H") {
    return validateHealth(result);
  }

  if (code === "L") {
    return validateList(result, context);
  }

  if (code.startsWith("A")) {
    return validateAnnounce(result);
  }

  if (code.startsWith("D")) {
    return validateDetails(result);
  }

  if (code.startsWith("HB")) {
    return validateHeartbeat(result, context);
  }

  return [`Não existe validador para a ação ${code}`];
}

function validateHealth(result) {
  const errors = [];
  expectStatus(result, 200, errors);
  if (result.response.body?.status !== "ok") {
    errors.push(`body.status deveria ser "ok", recebido: ${formatValue(result.response.body?.status)}`);
  }
  return errors;
}

function validateAnnounce(result) {
  const errors = [];
  expectStatus(result, 201, errors);
  expectField(result.response.body, "fileId", errors);
  expectField(result.response.body, "versionId", errors);
  return errors;
}

function validateList(result, context) {
  const errors = [];
  expectStatus(result, 200, errors);

  if (!Array.isArray(result.response.body)) {
    errors.push("body deveria ser um array.");
    return errors;
  }

  const knownFiles = Object.values(context.files);
  for (const file of knownFiles) {
    const found = result.response.body.some((item) => item.id === file.networkId);
    if (!found) {
      errors.push(`GET /networks não retornou a rede conhecida ${file.networkId}.`);
    }
  }

  return errors;
}

function validateDetails(result) {
  const errors = [];
  expectStatus(result, 200, errors);

  const body = result.response.body;
  expectField(body, "fileId", errors);
  expectField(body, "versionId", errors);
  expectField(body, "infoHash", errors);

  return errors;
}

function validateHeartbeat(result, context) {
  const errors = [];
  expectStatus(result, 200, errors);

  const body = result.response.body;
  const requestBody = result.request.body;

  if (body?.networkId !== requestBody.networkId) {
    errors.push(`body.networkId deveria ser ${requestBody.networkId}, recebido: ${formatValue(body?.networkId)}`);
  }

  if (body?.peerId !== requestBody.peerId) {
    errors.push(`body.peerId deveria ser ${requestBody.peerId}, recebido: ${formatValue(body?.peerId)}`);
  }

  if (typeof body?.activePeers !== "number") {
    errors.push(`body.activePeers deveria ser number, recebido: ${formatValue(body?.activePeers)}`);
  } else if (body.activePeers < 0) {
    errors.push(`body.activePeers não pode ser negativo: ${body.activePeers}`);
  }

  if (typeof body?.shouldActivateFallback !== "boolean") {
    errors.push(`body.shouldActivateFallback deveria ser boolean, recebido: ${formatValue(body?.shouldActivateFallback)}`);
  }

  if (typeof body?.activePeers === "number" && typeof body?.shouldActivateFallback === "boolean") {
    const expectedFallback = body.activePeers <= context.scenario.fallbackThreshold;
    if (body.shouldActivateFallback !== expectedFallback) {
      errors.push(
        `regra de fallback violada: activePeers=${body.activePeers}, esperado shouldActivateFallback=${expectedFallback}, recebido ${body.shouldActivateFallback}.`
      );
    }
  }

  return errors;
}

function expectStatus(result, expectedStatus, errors) {
  if (result.response.status !== expectedStatus) {
    errors.push(`status HTTP deveria ser ${expectedStatus}, recebido ${result.response.status}.`);
  }
}

function expectField(object, field, errors) {
  if (object === null || object === undefined) {
    errors.push(`body ausente; não foi possível validar campo ${field}.`);
    return;
  }
  if (!(field in object)) {
    errors.push(`campo obrigatório ausente: ${field}.`);
  }
}

function printScenarioHeader(scenario) {
  console.log("==============================================");
  console.log(`Simulador: ${scenario.name}`);
  console.log(`Hub URL: ${scenario.hubUrl}`);
  console.log(`Tick: ${scenario.tickMs}ms`);
  console.log(`Peers: ${scenario.peers.length}`);
  console.log(`Arquivos configurados: ${Object.keys(scenario.files).join(", ")}`);
  console.log("==============================================");
}

function printSuccess(label, body) {
  const suffix = summarizeBody(body);
  console.log(`OK ${label} passou${suffix}`);
}

function printFailure(label, errors, body) {
  console.log(`FAIL ${label} falhou`);
  for (const error of errors) {
    console.log(`   - ${error}`);
  }
  console.log("   Resposta recebida:");
  console.log(indent(JSON.stringify(body, null, 2), 3));
}

function printReport(context) {
  const total = context.results.length;
  const passed = context.results.filter((result) => result.ok).length;
  const failed = context.failures.length;

  console.log("\n==============================================");
  console.log("Relatório final");
  console.log("==============================================");
  console.log(`Cenário: ${context.scenario.name}`);
  console.log(`Ações executadas: ${total}`);
  console.log(`Passaram: ${passed}`);
  console.log(`Falharam: ${failed}`);

  console.log("\nRedes criadas:");
  for (const [key, file] of Object.entries(context.files)) {
    console.log(`- ${key}: ${file.networkId} (${file.title})`);
  }

  if (failed > 0) {
    console.log("\nFalhas:");
    for (const failure of context.failures) {
      console.log(`\n- tick ${failure.tick}, peer ${failure.peer}, ação ${failure.code}`);
      if (failure.error) {
        console.log(`  erro: ${failure.error.message}`);
        continue;
      }
      for (const validationError of failure.validationErrors) {
        console.log(`  - ${validationError}`);
      }
      console.log("  resposta:");
      console.log(indent(JSON.stringify(failure.response?.body, null, 2), 2));
    }

    console.log("\nStatus: simulação falhou");
    process.exitCode = 1;
  } else {
    console.log("\nStatus: simulação concluída com sucesso");
  }

  console.log("==============================================");
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") {
    return "";
  }

  if ("activePeers" in body && "shouldActivateFallback" in body) {
    return `: activePeers=${body.activePeers}, fallback=${body.shouldActivateFallback}`;
  }

  if ("fileId" in body && "versionId" in body) {
    return `: fileId=${body.fileId}, versionId=${body.versionId}`;
  }

  if (Array.isArray(body)) {
    return `: ${body.length} item(ns)`;
  }

  return "";
}

function formatValue(value) {
  return JSON.stringify(value);
}

function indent(text, spaces) {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
