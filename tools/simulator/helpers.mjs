import { randomUUID } from "node:crypto";

const EMPTY_ACTION = "-";

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

  /*
    Setup fixo mínimo:
    - peer-1 faz health
    - peer-1 anuncia file1
    - peer-1 anuncia file2

    Isso garante que D1, D2, HB1 e HB2 tenham arquivos existentes.
  */
  actionTable[0][0] = "H";
  actionTable[0][1] = "A1";
  actionTable[0][2] = "A2";

  for (let peerIndex = 0; peerIndex < peers.length; peerIndex++) {
    for (let tick = setupTicks; tick < ticks; tick++) {
      actionTable[peerIndex][tick] = pickWeighted(actionWeights, random);
      heartbeatTable[peerIndex][tick] = pickWeighted(heartbeatWeights, random);
    }
  }

  /*
    Garante alguns eventos úteis para o teste.
    Mesmo sendo aleatório, queremos forçar algumas situações importantes:
    - listagem depois dos announces
    - detalhes dos dois arquivos
    - vários heartbeats simultâneos em file1 para passar do threshold
    - alguns heartbeats em file2 para provar separação por arquivo
  */
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

  return {
    actionTable,
    heartbeatTable,
  };
}

function createEmptyTable(rows, columns) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => EMPTY_ACTION)
  );
}

function createSeededRandom(seed) {
  /*
    Gerador simples e reproduzível.
    Não é para criptografia; é só para simulação determinística.
  */
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
    results: [],
    failures: [],
  };

  printScenarioHeader(scenario);

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

function getTotalTicks(scenario) {
  const actionTicks = Math.max(...scenario.actionTable.map((row) => row.length));
  const heartbeatTicks = Math.max(
    ...scenario.heartbeatTable.map((row) => row.length)
  );

  return Math.max(actionTicks, heartbeatTicks);
}

function collectActionsForTick(scenario, tick) {
  const scheduled = [];

  for (let peerIndex = 0; peerIndex < scenario.peers.length; peerIndex++) {
    const peer = scenario.peers[peerIndex];

    const actionCode = scenario.actionTable?.[peerIndex]?.[tick] ?? EMPTY_ACTION;
    const heartbeatCode =
      scenario.heartbeatTable?.[peerIndex]?.[tick] ?? EMPTY_ACTION;

    for (const code of expandCell(actionCode)) {
      scheduled.push({
        source: "actionTable",
        tick,
        peer,
        code,
      });
    }

    for (const code of expandCell(heartbeatCode)) {
      scheduled.push({
        source: "heartbeatTable",
        tick,
        peer,
        code,
      });
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
    const record = {
      ok: false,
      tick,
      peer,
      code,
      source,
      error,
    };

    context.results.push(record);
    context.failures.push(record);

    console.log(`❌ ${label} erro inesperado`);
    console.log(`   ${error.message}`);
  }
}

async function executeAction(scheduledAction, context) {
  const { peer, code } = scheduledAction;

  if (code === "H") {
    return executeHealth(context);
  }

  if (code === "L") {
    return executeList(context);
  }

  if (code.startsWith("A")) {
    const fileKey = fileKeyFromCode(code);
    return executeAnnounce(fileKey, context);
  }

  if (code.startsWith("D")) {
    const fileKey = fileKeyFromCode(code);
    return executeDetails(fileKey, context);
  }

  if (code.startsWith("HB")) {
    const fileKey = fileKeyFromCode(code);
    return executeHeartbeat({
      fileKey,
      peer,
      status: "online",
      context,
    });
  }

  if (code.startsWith("OFF")) {
    const fileKey = fileKeyFromCode(code);
    return executeHeartbeat({
      fileKey,
      peer,
      status: "offline",
      context,
    });
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

  return {
    request: {
      method: "GET",
      path: "/health",
    },
    response,
  };
}

async function executeAnnounce(fileKey, context) {
  const fileConfig = context.scenario.files[fileKey];

  if (!fileConfig) {
    throw new Error(`Arquivo não configurado no cenário: ${fileKey}`);
  }

  const fakeHash = randomUUID().replaceAll("-", "");

  const body = {
    title: fileConfig.title,
    description: fileConfig.description,
    visibility: fileConfig.visibility ?? "public",
    magnet_uri: `magnet:?xt=urn:btih:${fakeHash}`,
    info_hash: fakeHash,
  };

  const response = await request(context.scenario.hubUrl, "/announce", {
    method: "POST",
    body,
  });

  if (response.status === 201 && response.body?.file_id) {
    context.files[fileKey] = {
      ...fileConfig,
      ...response.body,
      info_hash: body.info_hash,
      magnet_uri: body.magnet_uri,
    };
  }

  return {
    request: {
      method: "POST",
      path: "/announce",
      body,
      fileKey,
    },
    response,
  };
}

async function executeList(context) {
  const response = await request(context.scenario.hubUrl, "/files");

  return {
    request: {
      method: "GET",
      path: "/files",
    },
    response,
  };
}

async function executeDetails(fileKey, context) {
  const file = getKnownFile(fileKey, context);

  const path = `/files/${file.file_id}`;
  const response = await request(context.scenario.hubUrl, path);

  return {
    request: {
      method: "GET",
      path,
      fileKey,
    },
    response,
  };
}

async function executeHeartbeat({ fileKey, peer, status, context }) {
  const file = getKnownFile(fileKey, context);

  const body = {
    file_id: file.file_id,
    peer_uuid: peer,
    user_id: `user-${peer}`,
    status,
  };

  const response = await request(context.scenario.hubUrl, "/heartbeat", {
    method: "POST",
    body,
  });

  return {
    request: {
      method: "POST",
      path: "/heartbeat",
      body,
      fileKey,
    },
    response,
  };
}

function getKnownFile(fileKey, context) {
  const file = context.files[fileKey];

  if (!file) {
    throw new Error(
      `A ação precisa de ${fileKey}, mas esse arquivo ainda não foi anunciado.`
    );
  }

  return file;
}

async function request(hubUrl, path, options = {}) {
  const method = options.method ?? "GET";

  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

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

  return {
    status: httpResponse.status,
    ok: httpResponse.ok,
    body,
    rawText,
  };
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

  if (code.startsWith("HB") || code.startsWith("OFF")) {
    return validateHeartbeat(result, context);
  }

  return [`Não existe validador para a ação ${code}`];
}

function validateHealth(result) {
  const errors = [];

  expectStatus(result, 200, errors);

  if (result.response.body?.status !== "ok") {
    errors.push(
      `body.status deveria ser "ok", recebido: ${formatValue(
        result.response.body?.status
      )}`
    );
  }

  return errors;
}

function validateAnnounce(result) {
  const errors = [];

  expectStatus(result, 201, errors);
  expectField(result.response.body, "file_id", errors);
  expectField(result.response.body, "version_id", errors);

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

  if (knownFiles.length > 0 && result.response.body.length < knownFiles.length) {
    errors.push(
      `GET /files deveria retornar pelo menos ${knownFiles.length} arquivos conhecidos, recebeu ${result.response.body.length}.`
    );
  }

  for (const file of knownFiles) {
    const found = result.response.body.some((item) => item.file_id === file.file_id);

    if (!found) {
      errors.push(`GET /files não retornou o arquivo conhecido ${file.file_id}.`);
    }
  }

  return errors;
}

function validateDetails(result) {
  const errors = [];
  const { fileKey } = result.request;

  expectStatus(result, 200, errors);

  const body = result.response.body;

  expectField(body, "file_id", errors);
  expectField(body, "current_version_id", errors);
  expectField(body, "current_version", errors);

  if (body?.file_id !== undefined && body.file_id !== getExpectedFileId(result)) {
    errors.push(
      `details retornou file_id diferente. Esperado ${getExpectedFileId(
        result
      )}, recebido ${body.file_id}.`
    );
  }

  if (!body?.current_version) {
    errors.push("body.current_version deveria existir.");
    return errors;
  }

  expectField(body.current_version, "version_id", errors);
  expectField(body.current_version, "magnet_uri", errors);
  expectField(body.current_version, "file_info_hash", errors);

  if (!fileKey) {
    errors.push("request.fileKey ausente na validação de details.");
  }

  return errors;
}

function getExpectedFileId(result) {
  return result.request.path.split("/").at(-1);
}

function validateHeartbeat(result, context) {
  const errors = [];

  expectStatus(result, 200, errors);

  const body = result.response.body;
  const requestBody = result.request.body;

  if (body?.status !== "ok") {
    errors.push(
      `body.status deveria ser "ok", recebido: ${formatValue(body?.status)}`
    );
  }

  if (body?.file_id !== requestBody.file_id) {
    errors.push(
      `body.file_id deveria ser ${requestBody.file_id}, recebido: ${formatValue(
        body?.file_id
      )}`
    );
  }

  if (body?.peer_uuid !== requestBody.peer_uuid) {
    errors.push(
      `body.peer_uuid deveria ser ${requestBody.peer_uuid}, recebido: ${formatValue(
        body?.peer_uuid
      )}`
    );
  }

  if (typeof body?.active_peers !== "number") {
    errors.push(
      `body.active_peers deveria ser number, recebido: ${formatValue(
        body?.active_peers
      )}`
    );
  } else if (body.active_peers < 0) {
    errors.push(`body.active_peers não pode ser negativo: ${body.active_peers}`);
  }

  if (typeof body?.should_activate_fallback !== "boolean") {
    errors.push(
      `body.should_activate_fallback deveria ser boolean, recebido: ${formatValue(
        body?.should_activate_fallback
      )}`
    );
  }

  if (
    typeof body?.active_peers === "number" &&
    typeof body?.should_activate_fallback === "boolean"
  ) {
    const expectedFallback =
      body.active_peers <= context.scenario.fallbackThreshold;

    if (body.should_activate_fallback !== expectedFallback) {
      errors.push(
        `regra de fallback violada: active_peers=${body.active_peers}, esperado should_activate_fallback=${expectedFallback}, recebido ${body.should_activate_fallback}.`
      );
    }
  }

  return errors;
}

function expectStatus(result, expectedStatus, errors) {
  if (result.response.status !== expectedStatus) {
    errors.push(
      `status HTTP deveria ser ${expectedStatus}, recebido ${result.response.status}.`
    );
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
  console.log(`✅ ${label} passou${suffix}`);
}

function printFailure(label, errors, body) {
  console.log(`❌ ${label} falhou`);

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

  console.log("\nArquivos criados:");
  for (const [key, file] of Object.entries(context.files)) {
    console.log(`- ${key}: ${file.file_id} (${file.title})`);
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

    console.log("\nStatus: ❌ simulação falhou");
    process.exitCode = 1;
  } else {
    console.log("\nStatus: ✅ simulação concluída com sucesso");
  }

  console.log("==============================================");
}

function summarizeBody(body) {
  if (!body || typeof body !== "object") {
    return "";
  }

  if ("active_peers" in body && "should_activate_fallback" in body) {
    const expired =
      "expired_peers" in body ? `, expired=${body.expired_peers}` : "";

    return `: active_peers=${body.active_peers}, fallback=${body.should_activate_fallback}${expired}`;
  }

  if ("file_id" in body && "version_id" in body) {
    return `: file_id=${body.file_id}, version_id=${body.version_id}`;
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