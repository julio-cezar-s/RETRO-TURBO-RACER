// Versão 3.8.0 — recompensas voluntárias com anúncio SIMULADO (sem AdMob):
//   1) antes da corrida: +30 de turbo, uma vez por partida;
//   2) depois do Game Over: continuar com proteção temporária, uma vez por partida.
// Só se concede DEPOIS da confirmação de conclusão do anúncio; cancelar/indisponível não atrapalha o jogo.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, scriptsDoIndex, RAIZ } = require("./helpers/carregar-jogo");
const { novoJogo, obstaculoNoJogador } = require("./helpers/apoio");

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const esperar = () => new Promise((r) => setImmediate(r));
// Objetos que vêm do jogo (outro 'realm' do vm) comparam por conteúdo
const plano = (x) => JSON.parse(JSON.stringify(x));

// ---------- ferramentas ----------

// Provedor controlado pelo teste: o anúncio só termina quando o teste manda
function provedorManual() {
  const p = {
    nome: "teste",
    liberado: true,
    exibicoes: [],
    pendentes: [],
    disponivel() { return p.liberado; },
    exibir(tipo) {
      p.exibicoes.push(tipo);
      return new Promise((resolver, rejeitar) => p.pendentes.push({ resolver, rejeitar }));
    },
    concluir(...a) { p.pendentes.shift().resolver(a.length ? a[0] : { concluido: true }); },
    cancelar(motivo = "cancelado") { p.pendentes.shift().resolver({ concluido: false, motivo }); },
    falhar() { p.pendentes.shift().rejeitar(new Error("falhou")); },
  };
  return p;
}

function jogoComProvedor() {
  const j = carregarJogo();
  const p = provedorManual();
  assert.equal(j.f.registrarProvedorDeAnuncios(p), true);
  return { j, p };
}

// Joga até a batida e deixa a animação terminar: aparece o Game Over
function baterEMostrarGameOver(j) {
  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(j.v.gameState.isGameOver, true, "bateu");

  for (let t = 1; t < 400 && !j.elementos.gameOverScreen.classList.contains("hidden") === false; t++) {
    j.f.executarQuadro(1000 + t * 16.7);
  }
  assert.equal(j.elementos.gameOverScreen.classList.contains("hidden"), false, "Game Over na tela");
}

function clicar(j, botao) {
  botao.closest = (s) => (/button/.test(s) ? botao : null);
  j.ouvintesDoDocumento.filter(([n]) => n === "click").forEach(([, fn]) => fn({ target: botao }));
}

const estado = (j) => JSON.parse(j.avaliar("JSON.stringify({ turbo: recompensas.turbo, continuar: recompensas.continuar, emAndamento: recompensas.emAndamento })"));

// ============================================================
// 1. Contrato do provedor de anúncios (preparado para anúncios reais)
// ============================================================

test("provedor — só aceita objetos com disponivel() e exibir(); o resto é recusado e nada muda", () => {
  const j = carregarJogo();
  const antes = j.avaliar("obterProvedorDeAnuncios().nome");

  for (const ruim of [null, undefined, {}, { disponivel() {} }, { exibir() {} }, "x", 42]) {
    assert.equal(j.f.registrarProvedorDeAnuncios(ruim), false);
  }
  assert.equal(j.avaliar("obterProvedorDeAnuncios().nome"), antes);
  assert.equal(antes, "simulado", "nesta versão só existe o provedor simulado");
});

test("provedor — trocar por outro com o mesmo contrato basta (sem tocar no resto do jogo)", async () => {
  const { j, p } = jogoComProvedor();
  assert.equal(j.avaliar("obterProvedorDeAnuncios().nome"), "teste");

  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar();
  assert.deepEqual(p.exibicoes, ["turbo"], "o tipo chega ao provedor");
  p.concluir();
  assert.equal((await pedido).concedida, true);
});

test("sem provedor válido não há anúncio: nenhuma recompensa e o jogo segue normalmente", async () => {
  const j = carregarJogo();
  j.avaliar("provedorDeAnuncios = null");

  assert.equal(j.avaliar("obterProvedorDeAnuncios().nome"), "nenhum");
  const r = await j.f.solicitarRecompensa("turbo");
  assert.equal(r.concedida, false);
  assert.equal(r.motivo, "indisponivel");
  assert.doesNotThrow(() => j.f.iniciarPartida());
  assert.equal(j.v.gameState.isGameOver, false);
});

test("nesta versão não há AdMob: nenhum SDK, rede ou identificador de anúncio real no código", () => {
  const arquivos = scriptsDoIndex().filter((s) => s.startsWith("js/recompensas/")).concat(["index.html"]);
  for (const a of arquivos) {
    const t = lerArquivo(a).replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    assert.doesNotMatch(t, /admob|googletag|adsbygoogle|gads|ca-app-pub|fetch\(|XMLHttpRequest|https?:\/\//i, a);
  }
});

// ============================================================
// 2. Recompensa de TURBO (+30), antes da corrida
// ============================================================

test("turbo — anúncio concluído: concede; antes disso NADA é concedido", async () => {
  const { j, p } = jogoComProvedor();

  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar();

  // Anúncio na tela, ainda não concluído: nada foi dado
  assert.equal(estado(j).emAndamento, "turbo");
  assert.equal(estado(j).turbo.reservada, false, "nada reservado antes da conclusão");
  assert.equal(estado(j).turbo.ativa, false);
  assert.equal(j.v.gameState.turboEnergy, 100);

  p.concluir();
  const r = await pedido;

  assert.deepEqual(plano(r), { tipo: "turbo", concedida: true });
  assert.equal(estado(j).turbo.reservada, true, "agora sim");
  assert.equal(estado(j).emAndamento, null);
});

test("turbo — os +30 só entram na corrida seguinte e SÓ uma vez, quando cabem inteiros no teto de 100", async () => {
  const { j, p } = jogoComProvedor();
  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir(); await pedido;

  j.f.iniciarPartida();                                   // corrida nova: a reserva passa a valer
  j.semente(5);
  assert.equal(estado(j).turbo.ativa, true);
  assert.equal(estado(j).turbo.reservada, false);

  // Turbo cheio: nada a creditar (os 30 seriam perdidos no teto)
  for (let q = 0; q < 30; q++) j.f.simular(1, 1000 + q * 16.7);
  assert.equal(estado(j).turbo.creditada, false);
  assert.equal(j.v.gameState.turboEnergy, 100);

  // Gastou o turbo: no primeiro quadro com energia ≤ 70 entram +30, uma vez só
  j.v.gameState.turboEnergy = 60;
  j.f.simular(1, 2000);
  assert.equal(estado(j).turbo.creditada, true);
  assert.ok(Math.abs(j.v.gameState.turboEnergy - (60 + 0.18 + 30)) < 0.01, `energia ${j.v.gameState.turboEnergy}`);

  j.v.gameState.turboEnergy = 10;
  for (let q = 0; q < 50; q++) j.f.simular(1, 2100 + q * 16.7);
  assert.ok(j.v.gameState.turboEnergy < 20, "não creditou de novo");
});

test("turbo — o crédito mostra o mesmo aviso e som do nitro, com +30", async () => {
  const { j, p } = jogoComProvedor();
  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir(); await pedido;
  j.f.iniciarPartida();

  const avisos = [];
  const original = j.f.emitirFeedbackDeColeta;
  j.avaliar("globalThis.__avisos = []");
  j.avaliar("(() => { const f = emitirFeedbackDeColeta; emitirFeedbackDeColeta = (d) => { __avisos.push(d); return f(d); }; })()");

  j.v.gameState.turboEnergy = 50;
  j.f.simular(1, 3000);
  const dados = plano(j.avaliar("__avisos.map((d) => ({ rotulo: d.rotulo, energia: d.energia }))"));
  assert.deepEqual(dados, [{ rotulo: "powerup.nitro", energia: 30 }]);
  assert.ok(original);
});

test("turbo — cancelado: nada é concedido e dá para tentar de novo", async () => {
  const { j, p } = jogoComProvedor();

  const r1 = j.f.solicitarRecompensa("turbo");
  await esperar(); p.cancelar();
  const x = await r1;
  assert.deepEqual([x.concedida, x.motivo], [false, "cancelado"]);
  assert.equal(estado(j).turbo.reservada, false);

  const r2 = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir();
  assert.equal((await r2).concedida, true, "uma tentativa cancelada não gasta a recompensa");
});

test("turbo — anúncio indisponível: nada concedido, o provedor nem é chamado e o jogo começa normalmente", async () => {
  const { j, p } = jogoComProvedor();
  p.liberado = false;

  const r = await j.f.solicitarRecompensa("turbo");
  assert.deepEqual([r.concedida, r.motivo], [false, "indisponivel"]);
  assert.equal(p.exibicoes.length, 0);

  assert.doesNotThrow(() => j.f.iniciarPartida());
  assert.equal(j.v.gameState.isGameOver, false);
  assert.equal(j.v.gameState.turboEnergy, 100);
  assert.equal(estado(j).turbo.ativa, false);
});

test("turbo — falha ou resposta estranha do anúncio NÃO concede (só concluido === true vale)", async () => {
  const { j, p } = jogoComProvedor();

  const r1 = j.f.solicitarRecompensa("turbo");
  await esperar(); p.falhar();
  assert.deepEqual([(await r1).concedida, (await r1).motivo], [false, "erro"]);

  for (const resposta of [undefined, null, {}, { concluido: "true" }, { concluido: 1 }, { concluido: false }, { recompensa: true }, "ok"]) {
    const r = j.f.solicitarRecompensa("turbo");
    await esperar(); p.concluir(resposta);
    assert.equal((await r).concedida, false, JSON.stringify(resposta));
  }
  assert.equal(estado(j).turbo.reservada, false);
});

test("turbo — no máximo UMA recompensa por corrida: pedir de novo com a reserva feita não chama o anúncio", async () => {
  const { j, p } = jogoComProvedor();
  const r1 = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir(); await r1;

  const r2 = await j.f.solicitarRecompensa("turbo");
  assert.deepEqual([r2.concedida, r2.motivo], [false, "ja_reservada"]);
  assert.equal(p.exibicoes.length, 1, "o segundo anúncio nem foi exibido");
});

test("turbo — cliques duplos enquanto o anúncio roda: só um anúncio, só uma recompensa", async () => {
  const { j, p } = jogoComProvedor();

  const a = j.f.solicitarRecompensa("turbo");
  const b = j.f.solicitarRecompensa("turbo");
  const c = j.f.solicitarRecompensa("turbo");
  await esperar();

  assert.equal(p.exibicoes.length, 1, "um único anúncio exibido");
  assert.deepEqual([(await b).concedida, (await b).motivo], [false, "em_andamento"]);
  assert.deepEqual([(await c).concedida, (await c).motivo], [false, "em_andamento"]);

  p.concluir();
  assert.equal((await a).concedida, true);
  assert.equal(estado(j).turbo.reservada, true);
});

test("turbo — só ANTES da corrida: durante a partida (também pausada) o pedido é recusado", async () => {
  const { j, p } = jogoComProvedor();
  j.f.iniciarPartida();

  const r = await j.f.solicitarRecompensa("turbo");
  assert.deepEqual([r.concedida, r.motivo], [false, "fora_de_hora"]);

  j.f.pausarJogo();
  const r2 = await j.f.solicitarRecompensa("turbo");
  assert.deepEqual([r2.concedida, r2.motivo], [false, "fora_de_hora"]);
  assert.equal(p.exibicoes.length, 0);
});

test("turbo — cada corrida tem a sua: a reserva vale para UMA corrida e a seguinte começa sem ela", async () => {
  const { j, p } = jogoComProvedor();
  const r = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir(); await r;

  j.f.iniciarPartida();                                    // corrida 1 usa a reserva
  assert.equal(estado(j).turbo.ativa, true);

  j.f.iniciarPartida();                                    // corrida 2 (JOGAR NOVAMENTE) sem anúncio novo
  assert.equal(estado(j).turbo.ativa, false, "a recompensa não se repete sozinha");
  j.v.gameState.turboEnergy = 40;
  for (let q = 0; q < 20; q++) j.f.simular(1, 1000 + q * 16.7);
  assert.ok(j.v.gameState.turboEnergy < 50, "sem +30 na corrida 2");
});

test("turbo — voltar ao menu mantém a reserva já ganha (e não deixa ganhar duas para a mesma corrida)", async () => {
  const { j, p } = jogoComProvedor();
  const r = j.f.solicitarRecompensa("turbo");
  await esperar(); p.concluir(); await r;

  j.f.sairParaMenu();
  assert.equal(estado(j).turbo.reservada, true);
  const r2 = await j.f.solicitarRecompensa("turbo");
  assert.equal(r2.motivo, "ja_reservada");
});

test("turbo — um anúncio que termina atrasado, depois de outra corrida começar, não vale (expirada)", async () => {
  const { j, p } = jogoComProvedor();
  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar();

  j.f.iniciarPartida();                                    // o jogador começou outra corrida enquanto o anúncio rodava
  p.concluir();
  const r = await pedido;

  assert.equal(r.concedida, false);
  assert.ok(["expirada", "fora_de_hora"].includes(r.motivo), r.motivo);
  assert.equal(estado(j).turbo.reservada, false);
});

// ============================================================
// 3. Recompensa de CONTINUAR, depois do Game Over
// ============================================================

test("continuar — só é oferecida quando o Game Over já está na tela (nem durante a corrida, nem durante a batida)", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();

  let r = await j.f.solicitarRecompensa("continuar");
  assert.deepEqual([r.concedida, r.motivo], [false, "fora_de_hora"], "durante a corrida");

  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(j.v.gameState.isGameOver, true);
  r = await j.f.solicitarRecompensa("continuar");
  assert.deepEqual([r.concedida, r.motivo], [false, "fora_de_hora"], "durante a animação da batida");

  baterEMostrarGameOver(j);
  assert.equal(p.exibicoes.length, 0, "nenhum anúncio foi exibido antes da hora");
  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), false, "botão visível no Game Over");
});

test("continuar — anúncio concluído: a partida segue com proteção temporária, mesma pontuação e Game Over some", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  j.v.gameState.score = 1234;
  baterEMostrarGameOver(j);
  const pontos = j.v.gameState.score;

  const pedido = j.f.solicitarRecompensa("continuar");
  await esperar();

  // Anúncio rodando: AINDA em Game Over, sem proteção
  assert.equal(j.v.gameState.isGameOver, true, "nada antecipado: continua em Game Over");
  assert.equal(j.v.powerUps.invulneravel, 0, "sem proteção antes da conclusão");
  assert.equal(j.elementos.gameOverScreen.classList.contains("hidden"), false);

  p.concluir();
  const r = await pedido;
  assert.deepEqual(plano(r), { tipo: "continuar", concedida: true });

  assert.equal(j.v.gameState.isGameOver, false);
  assert.equal(j.v.gameState.crashFrames, 0);
  assert.equal(j.v.gameState.score, pontos, "a pontuação é a mesma");
  assert.equal(j.v.powerUps.invulneravel, 300, "proteção de 300 quadros (5 s)");
  assert.equal(j.elementos.gameOverScreen.classList.contains("hidden"), true);
  assert.equal(j.v.gameState.gameSpeed, j.v.gameState.baseSpeed, "volta à velocidade normal da corrida");
  assert.equal(j.f.partidaAtiva(), true, "o loop voltou a rodar");
  assert.equal(j.quadros.pendentes.length, 1, "um único loop");
});

test("continuar — durante a proteção as batidas são absorvidas; depois dela voltam a valer", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);
  const pedido = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir(); await pedido;

  obstaculoNoJogador(j, "truck");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(j.v.gameState.isGameOver, false, "batida absorvida pela proteção");

  // Passa a proteção
  j.v.powerUps.invulneravel = 0;
  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(j.v.gameState.isGameOver, true, "sem proteção a batida é fatal como sempre");
});

test("continuar — a proteção acaba sozinha em 300 quadros", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);
  const pedido = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir(); await pedido;

  j.v.diretor.temporizador = 1e9;
  for (let q = 0; q < 299; q++) j.f.simular(1, 1000 + q * 16.7);
  assert.ok(j.v.powerUps.invulneravel > 0, "ainda protegido");
  for (let q = 299; q < 320; q++) j.f.simular(1, 1000 + q * 16.7);
  assert.equal(j.v.powerUps.invulneravel, 0);
});

test("continuar — cancelado ou indisponível: nada é concedido, o Game Over continua e dá para jogar de novo normalmente", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);

  const r1 = j.f.solicitarRecompensa("continuar");
  await esperar(); p.cancelar();
  assert.deepEqual([(await r1).concedida, (await r1).motivo], [false, "cancelado"]);
  assert.equal(j.v.gameState.isGameOver, true);
  assert.equal(j.v.powerUps.invulneravel, 0);

  p.liberado = false;
  const r2 = await j.f.solicitarRecompensa("continuar");
  assert.deepEqual([r2.concedida, r2.motivo], [false, "indisponivel"]);
  assert.equal(j.v.gameState.isGameOver, true);

  // O jogador pode simplesmente jogar de novo
  assert.doesNotThrow(() => j.f.iniciarPartida());
  assert.equal(j.v.gameState.isGameOver, false);
  assert.equal(j.v.gameState.score, 0);
  assert.equal(j.v.powerUps.invulneravel, 0);
});

test("continuar — no máximo UMA vez por corrida (a segunda batida não oferece de novo)", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);
  const r1 = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir(); await r1;
  assert.equal(estado(j).continuar.usada, true);

  j.v.powerUps.invulneravel = 0;
  baterEMostrarGameOver(j);                               // bate de novo e o Game Over volta

  const r2 = await j.f.solicitarRecompensa("continuar");
  assert.deepEqual([r2.concedida, r2.motivo], [false, "ja_usada"]);
  assert.equal(p.exibicoes.length, 1, "só um anúncio nesta corrida");
  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), true, "botão escondido");
});

test("continuar — cliques duplos: um anúncio, uma continuação", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);

  const a = j.f.solicitarRecompensa("continuar");
  const b = j.f.solicitarRecompensa("continuar");
  await esperar();
  assert.equal(p.exibicoes.length, 1);
  assert.equal((await b).motivo, "em_andamento");

  p.concluir();
  assert.equal((await a).concedida, true);
  assert.equal(p.pendentes.length, 0);
  assert.equal(j.quadros.pendentes.length, 1, "um único loop depois de continuar");
});

test("continuar — uma nova corrida volta a ter direito a uma continuação", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);
  const r1 = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir(); await r1;

  j.f.iniciarPartida();
  assert.equal(estado(j).continuar.usada, false);
  baterEMostrarGameOver(j);
  const r2 = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir();
  assert.equal((await r2).concedida, true);
});

test("continuar — voltar ao menu (ou JOGAR NOVAMENTE) encerra a oferta daquela corrida", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);

  j.f.sairParaMenu();
  const r = await j.f.solicitarRecompensa("continuar");
  assert.deepEqual([r.concedida, r.motivo], [false, "fora_de_hora"]);
  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), true);
  assert.equal(p.exibicoes.length, 0);
});

test("continuar — um anúncio que termina depois de uma nova corrida começar não revive nada (expirada)", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);

  const pedido = j.f.solicitarRecompensa("continuar");
  await esperar();
  j.f.iniciarPartida();                                   // o jogador recomeçou do zero
  const score = j.v.gameState.score;
  p.concluir();
  const r = await pedido;

  assert.equal(r.concedida, false);
  assert.equal(j.v.powerUps.invulneravel, 0, "a corrida nova não ganha proteção");
  assert.equal(j.v.gameState.score, score);
  assert.equal(j.quadros.pendentes.length, 1, "um único loop");
});

test("continuar — o recorde da batida não fica duplicado: só o resultado final da corrida é gravado", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  const guardado = {};
  j.contexto.localStorage = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } };

  j.v.gameState.score = 500;
  baterEMostrarGameOver(j);
  assert.deepEqual(JSON.parse(guardado.retroTurboRecords).map((r) => r.pontos), [500]);

  const pedido = j.f.solicitarRecompensa("continuar");
  await esperar(); p.concluir(); await pedido;
  assert.deepEqual(JSON.parse(guardado.retroTurboRecords || "[]").map((r) => r.pontos), [], "a batida adiada sai da lista");

  j.v.gameState.score = 900;
  j.v.powerUps.invulneravel = 0;
  baterEMostrarGameOver(j);
  assert.deepEqual(JSON.parse(guardado.retroTurboRecords).map((r) => r.pontos), [900], "uma única linha para a corrida");
  assert.equal(guardado.retroTurboMaxScore, "900");
});

test("continuar sem anúncio: perder normalmente continua gravando o recorde como antes", () => {
  const j = novoJogo();
  const guardado = {};
  j.contexto.localStorage = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: () => {} };

  j.v.gameState.score = 700;
  baterEMostrarGameOver(j);
  assert.deepEqual(JSON.parse(guardado.retroTurboRecords).map((r) => r.pontos), [700]);
});

// ============================================================
// 4. Nada fora do escopo mudou
// ============================================================

function partidaRoteirizada(preparar) {
  const j = carregarJogo({ pointerEvents: true });
  if (preparar) preparar(j);
  j.semente(321);
  j.f.iniciarPartida();
  j.semente(321);

  for (let q = 0; q < 1200 && !j.v.gameState.isGameOver; q++) {
    j.v.input.left = q % 200 >= 30 && q % 200 < 90;
    j.v.input.right = q % 200 >= 110 && q % 200 < 170;
    j.f.simular(1, 1000 + q * (1000 / 60));
  }
  const v = j.v;
  return JSON.stringify([v.player.worldX.toFixed(9), v.gameState.score.toFixed(6), v.gameState.worldDistance.toFixed(9), v.gameState.turboEnergy.toFixed(6),
    v.gameState.gameSpeed.toFixed(9), v.obstacles.map((o) => [o.worldX.toFixed(6), o.z.toFixed(6)]), { ...v.powerUps }, v.gameState.isGameOver]);
}

test("física, velocidade, pontuação e power-ups idênticos com o sistema de recompensas presente e sem recompensa usada", () => {
  const base = partidaRoteirizada();
  assert.equal(partidaRoteirizada((j) => j.f.registrarProvedorDeAnuncios(provedorManual())), base);
  assert.equal(partidaRoteirizada((j) => { j.avaliar("provedorDeAnuncios = null"); }), base);
});

test("uma reserva de turbo que nunca chega a ser creditada não muda NADA na corrida (nem a física nem a energia)", () => {
  const base = partidaRoteirizada();
  const comReserva = partidaRoteirizada((j) => { j.avaliar("recompensas.turbo.reservada = true"); });

  assert.equal(comReserva, base, "turbo cheio o tempo todo: a reserva espera e não altera nada");
});

test("com a reserva creditada, a ÚNICA diferença é +30 de energia (física, pontos e obstáculos iguais)", () => {
  const rodar = (reserva) => {
    const j = carregarJogo({ pointerEvents: true });
    if (reserva) j.avaliar("recompensas.turbo.reservada = true");
    // O aviso/som do crédito são só visuais e sorteiam com o mesmo gerador semeado: neutraliza nos dois lados
    j.avaliar("emitirFeedbackDeColeta = () => {}; tocarSomDePowerUp = () => {}");
    j.semente(77); j.f.iniciarPartida(); j.semente(77);
    for (let q = 0; q < 130; q++) {       // curto: a energia ainda não chegou ao teto de 100
      if (q === 100) j.v.gameState.turboEnergy = 40;
      j.f.simular(1, 1000 + q * (1000 / 60));
    }
    const v = j.v;
    return { energia: v.gameState.turboEnergy, resto: JSON.stringify([v.player.worldX, v.gameState.score, v.gameState.worldDistance, v.gameState.gameSpeed, v.obstacles.map((o) => [o.worldX, o.z])]) };
  };

  const a = rodar(false);
  const b = rodar(true);
  assert.equal(b.resto, a.resto);
  assert.ok(Math.abs(b.energia - a.energia - 30) < 0.05, `diferença de energia ${b.energia - a.energia}`);
});

test("os arquivos de física, colisão, pontuação e power-ups não ganharam nada do sistema de recompensas", () => {
  for (const arquivo of ["js/obstaculos/colisao.js", "js/obstaculos/movimento.js", "js/sistemas/pontos.js", "js/sistemas/forca-lateral.js", "js/sistemas/derrapagem.js",
    "js/powerups/efeitos.js", "js/powerups/geracao.js", "js/powerups/itens.js", "js/powerups/parametros.js", "js/powerups/tipos.js", "js/powerups/estado.js",
    "js/combo/pontuacao.js", "js/dificuldade/diretor.js", "js/dificuldade/niveis.js", "js/input.js", "js/entities.js", "js/controles/direcao-toque.js"]) {
    assert.doesNotMatch(lerArquivo(arquivo), /recompensa|Recompensa|RECOMPENSAS/, arquivo);
  }
});

test("os ganchos no loop são só quatro linhas guardadas por typeof, sem mexer na conta do turbo", () => {
  const loop = lerArquivo("js/game/loop.js");
  assert.match(loop, /gameState\.turboEnergy -= 0\.45 \* dt;/);
  assert.match(loop, /gameState\.turboEnergy \+= 0\.18 \* dt;/);
  assert.equal((loop.match(/typeof (?:aplicarReservaDeTurbo|registrarBatidaParaContinuacao|oferecerContinuacao) === "function"/g) || []).length, 3);

  const j = carregarJogo();
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.avaliar("WORLD_SPEED_FACTOR"), 0.023);
  assert.equal(j.v.TIPOS_DE_POWERUP.nitro.energia, 40);
  assert.equal(j.v.TIPOS_DE_POWERUP.escudo.duracao, 900);
  assert.equal(j.avaliar("POWERUPS.invulnerabilidade"), 75);
  assert.equal(j.avaliar("QUADROS_DE_BATIDA"), 55);
});

test("os parâmetros das recompensas são os pedidos: +30 de turbo e proteção temporária", () => {
  const j = carregarJogo();
  assert.equal(j.avaliar("RECOMPENSAS.turbo.energia"), 30);
  assert.equal(j.avaliar("RECOMPENSAS.turbo.creditarAbaixoDe"), 70);
  assert.equal(j.avaliar("RECOMPENSAS.continuar.protecao"), 300);
});

// ============================================================
// 5. Interface: botões, mensagens e idiomas
// ============================================================

test("tela inicial: o botão de turbo aparece quando há anúncio e some quando não há", () => {
  const { j, p } = jogoComProvedor();
  const botao = j.elementos.rewardTurboBtn;

  j.f.atualizarInterfaceDeRecompensas();
  assert.equal(botao.classList.contains("hidden"), false);

  p.liberado = false;
  j.f.atualizarInterfaceDeRecompensas();
  assert.equal(botao.classList.contains("hidden"), true, "sem anúncio, sem botão: o menu fica como era");
});

test("clicar no botão de turbo pede o anúncio; ao concluir mostra a confirmação e esconde o botão", async () => {
  const { j, p } = jogoComProvedor();

  clicar(j, j.elementos.rewardTurboBtn);
  await esperar();
  assert.deepEqual(p.exibicoes, ["turbo"]);
  assert.equal(j.elementos.rewardTurboBtn.disabled, true, "botão travado enquanto o anúncio roda");
  assert.equal(j.elementos.rewardTurboMsg.classList.contains("hidden"), true, "nenhuma confirmação antes da hora");

  p.concluir();
  await esperar(); await esperar();
  assert.equal(j.elementos.rewardTurboBtn.classList.contains("hidden"), true);
  assert.equal(j.elementos.rewardTurboMsg.getAttribute("data-i18n"), "recompensas.turbo.garantido");
  assert.equal(j.elementos.rewardTurboMsg.classList.contains("hidden"), false);
});

test("clicar e cancelar: mensagem de aviso, botão continua disponível e nada foi dado", async () => {
  const { j, p } = jogoComProvedor();

  clicar(j, j.elementos.rewardTurboBtn);
  await esperar(); p.cancelar();
  await esperar(); await esperar();

  assert.equal(j.elementos.rewardTurboMsg.getAttribute("data-i18n"), "recompensas.aviso.cancelado");
  assert.equal(j.elementos.rewardTurboBtn.classList.contains("hidden"), false);
  assert.equal(j.elementos.rewardTurboBtn.disabled, false);
  assert.equal(estado(j).turbo.reservada, false);
});

test("Game Over: o botão de continuar aparece com anúncio, clicar continua a partida e o botão some", async () => {
  const { j, p } = jogoComProvedor();
  j.novaPartida();
  baterEMostrarGameOver(j);
  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), false);

  clicar(j, j.elementos.rewardContinueBtn);
  await esperar();
  assert.equal(j.v.gameState.isGameOver, true, "ainda não: o anúncio está rodando");
  p.concluir();
  await esperar(); await esperar();

  assert.equal(j.v.gameState.isGameOver, false);
  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), true);
});

test("Game Over sem anúncio disponível: o botão não aparece e JOGAR NOVAMENTE e MENU PRINCIPAL seguem funcionando", () => {
  const { j, p } = jogoComProvedor();
  p.liberado = false;
  j.novaPartida();
  baterEMostrarGameOver(j);

  assert.equal(j.elementos.rewardContinueBtn.classList.contains("hidden"), true);
  clicar(j, Object.assign(j.elementos.restartBtn, {}));
  assert.doesNotThrow(() => j.f.iniciarPartida());
  assert.equal(j.v.gameState.isGameOver, false);
});

test("textos nos três idiomas (botões, aviso, anúncio simulado) e o texto de cada idioma é diferente", () => {
  const j = carregarJogo();
  const chaves = ["recompensas.turbo.botao", "recompensas.turbo.garantido", "recompensas.continuar.botao", "recompensas.anuncio.titulo",
    "recompensas.anuncio.fechar", "recompensas.aviso.cancelado", "recompensas.aviso.indisponivel"];
  const por = {};

  for (const idioma of ["pt", "en", "es"]) {
    j.f.definirIdioma(idioma);
    por[idioma] = chaves.map((c) => j.f.traduzir(c));
    por[idioma].forEach((t, i) => assert.ok(t && t !== chaves[i], `${idioma}: ${chaves[i]}`));
    assert.match(j.f.traduzir("recompensas.anuncio.contagem", { s: 3 }), /3/);
  }
  chaves.forEach((_, i) => { assert.notEqual(por.pt[i], por.en[i]); assert.notEqual(por.pt[i], por.es[i]); });
  assert.match(por.pt[0], /30/); assert.match(por.en[0], /30/); assert.match(por.es[0], /30/);
});

test("as mensagens de recompensa acompanham a troca de idioma (a chave fica no elemento)", async () => {
  const { j, p } = jogoComProvedor();
  clicar(j, j.elementos.rewardTurboBtn);
  await esperar(); p.concluir(); await esperar(); await esperar();

  j.f.definirIdioma("en");
  assert.match(j.elementos.rewardTurboMsg.textContent, /guaranteed/);
  j.f.definirIdioma("es");
  assert.match(j.elementos.rewardTurboMsg.textContent, /garantizado/);
});

// ============================================================
// 6. Provedor simulado: anúncio com contagem, fechar e modos
// ============================================================

function relogioFalso() {
  const tarefas = [];
  return {
    tarefas,
    agendar: (fn, ms) => { const t = { fn, ms, ativo: true }; tarefas.push(t); return t; },
    cancelarAgenda: (t) => { t.ativo = false; },
    avancar() { const t = tarefas.find((x) => x.ativo); if (!t) return false; t.ativo = false; t.fn(); return true; },
  };
}

test("simulado — o anúncio dura 3 s com contagem regressiva e só então confirma a conclusão", async () => {
  const j = carregarJogo();
  const relogio = relogioFalso();
  const prov = j.f.criarProvedorSimulado({ agendar: relogio.agendar, cancelarAgenda: relogio.cancelarAgenda });
  j.f.registrarProvedorDeAnuncios(prov);

  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar();
  assert.equal(j.elementos.adScreen.classList.contains("hidden"), false, "tela do anúncio aberta");
  assert.match(j.elementos.adCountdown.textContent, /3/);
  assert.equal(estado(j).turbo.reservada, false);

  relogio.avancar(); await esperar();
  assert.match(j.elementos.adCountdown.textContent, /2/);
  assert.equal(estado(j).turbo.reservada, false, "ainda não");
  relogio.avancar(); await esperar();
  assert.equal(estado(j).turbo.reservada, false, "ainda não");
  relogio.avancar();

  const r = await pedido;
  assert.equal(r.concedida, true);
  assert.equal(j.elementos.adScreen.classList.contains("hidden"), true, "tela do anúncio fechada");
});

test("simulado — FECHAR ANÚNCIO antes do fim: não concluído, nenhuma recompensa e a tela fecha", async () => {
  const j = carregarJogo();
  const relogio = relogioFalso();
  j.f.registrarProvedorDeAnuncios(j.f.criarProvedorSimulado({ agendar: relogio.agendar, cancelarAgenda: relogio.cancelarAgenda }));

  const pedido = j.f.solicitarRecompensa("turbo");
  await esperar(); relogio.avancar();
  j.elementos.adCloseBtn.onclick();

  const r = await pedido;
  assert.deepEqual([r.concedida, r.motivo], [false, "cancelado"]);
  assert.equal(estado(j).turbo.reservada, false);
  assert.equal(j.elementos.adScreen.classList.contains("hidden"), true);
  assert.equal(relogio.tarefas.filter((t) => t.ativo).length, 0, "o relógio do anúncio foi cancelado");
});

test("simulado — modos de teste: cancelar, indisponível e erro nunca concedem", async () => {
  for (const modo of ["cancelar", "indisponivel", "erro"]) {
    const j = carregarJogo();
    const relogio = relogioFalso();
    const prov = j.f.criarProvedorSimulado({ modo, agendar: relogio.agendar, cancelarAgenda: relogio.cancelarAgenda });
    j.f.registrarProvedorDeAnuncios(prov);

    const pedido = j.f.solicitarRecompensa("turbo");
    await esperar();
    while (relogio.avancar()) await esperar();
    const r = await pedido;

    assert.equal(r.concedida, false, modo);
    assert.equal(estado(j).turbo.reservada, false, modo);
    assert.equal(j.elementos.adScreen.classList.contains("hidden"), true, `${modo}: tela fechada`);
    assert.equal(estado(j).emAndamento, null, `${modo}: sem pedido preso`);
  }
});

test("simulado — não abre dois anúncios ao mesmo tempo", async () => {
  const j = carregarJogo();
  const relogio = relogioFalso();
  const prov = j.f.criarProvedorSimulado({ agendar: relogio.agendar, cancelarAgenda: relogio.cancelarAgenda });

  const a = prov.exibir("turbo");
  const b = await prov.exibir("turbo");
  assert.deepEqual(plano(b), { concluido: false, motivo: "em_andamento" });
  prov.cancelarAtual();
  assert.equal((await a).concluido, false);
});

test("anúncio com duração zero conclui logo, sem travar (útil para testes)", async () => {
  const j = carregarJogo();
  j.f.registrarProvedorDeAnuncios(j.f.criarProvedorSimulado({ duracaoMs: 0, agendar: (fn) => { fn(); return 1; }, cancelarAgenda: () => {} }));

  const r = await j.f.solicitarRecompensa("turbo");
  assert.equal(r.concedida, true);
});

// ============================================================
// 7. Estrutura do pacote
// ============================================================

test("index.html — os módulos de recompensas carregam em ordem e antes do pronto.js; HTML com ids, i18n e anúncio acessível", () => {
  const s = scriptsDoIndex();
  const ordem = ["parametros", "estado", "concessao", "anuncios", "solicitar", "interface"].map((n) => s.indexOf(`js/recompensas/${n}.js`));

  assert.ok(ordem.every((i) => i >= 0));
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, "parametros → estado → concessao → anuncios → solicitar → interface");
  assert.ok(ordem[0] > s.indexOf("js/game/state.js") && ordem[0] > s.indexOf("js/tela-inicial/recordes.js"));
  assert.equal(s[s.length - 1], "js/inicio/pronto.js");

  const html = lerArquivo("index.html");
  for (const id of ["rewardTurboBtn", "rewardTurboMsg", "rewardContinueBtn", "rewardContinueMsg", "adScreen", "adCloseBtn", "adCountdown"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<section id="adScreen"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="rewardTurboBtn"[^>]*hidden/, "começa escondido");
  assert.match(html, /css\/estilos\/recompensas\.css/);
});

test("a tela do anúncio fica acima de todas as outras e nada por baixo recebe toque", () => {
  const css = lerArquivo("css/estilos/recompensas.css");
  assert.match(css, /#adScreen \{[^}]*z-index:\s*70/);
  assert.match(lerArquivo("css/estilos/menus.css"), /z-index:\s*50/);
});

test("versão 3.8.0 em todos os lugares e LEIA-ME documenta o sistema de recompensas", () => {
  const html = lerArquivo("index.html");
  const versoes = new Set([...html.matchAll(/\?v=([\w.]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...versoes], ["3.8.0"]);
  assert.equal(carregarJogo().avaliar("VERSAO_DO_JOGO"), "3.8.0");
  assert.equal(JSON.parse(lerArquivo("package.json")).version, "3.8.0");

  const leia = lerArquivo("js/LEIA-ME.md");
  assert.match(leia, /3\.8\.0/);
  assert.match(leia, /recompensas\//);
  assert.match(leia, /registrarProvedorDeAnuncios/);
});
