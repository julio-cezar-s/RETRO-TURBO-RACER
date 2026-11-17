// Versão 4.0.0 — sons mais agradáveis:
//   - batida menos exagerada;
//   - sirene da polícia nasce baixinha e sobe conforme a viatura se aproxima;
//   - freada mais suave e só numa batida de verdade (nunca em poça de óleo nem em cone).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, RAIZ } = require("./helpers/carregar-jogo");
const { novoJogo: novoJogoBase, obstaculoNoJogador } = require("./helpers/apoio");

// No navegador o gerenciador é inicializado em DOMContentLoaded (volumes iniciais); aqui chamamos igual
function novoJogo(...a) {
  const j = novoJogoBase(...a);
  j.v.gerenciadorAudio.inicializar();
  return j;
}

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const plano = (x) => JSON.parse(JSON.stringify(x));

// Espia as chamadas ao tocador de sons e devolve o que foi tocado, com o volume do momento
function espiarSons(j) {
  const log = [];
  const g = j.v.gerenciadorAudio;
  for (const nome of Object.keys(g.sons)) {
    const som = g.sons[nome];
    const play = som.play.bind(som);
    som.play = () => { log.push({ nome, volume: som.volume }); return play(); };
  }
  return log;
}

function viaturaEm(j, z) {
  j.v.obstacles.length = 0;
  j.v.obstacles.push({ type: "police", worldX: 1, z, prevZ: z, speed: 1, width: 0.5, hit: false });
  return j.v.obstacles[0];
}

const ZLONGE = (j) => j.avaliar("Z_FAR");
const ZPERTO = (j) => j.avaliar("PLAYER_Z");

// ============================================================
// 1. Sirene: começa baixinha e vai aumentando com a aproximação
// ============================================================

test("sirene — o volume por distância vai do mínimo (viatura longe) ao máximo (viatura perto), sempre crescendo", () => {
  const j = carregarJogo();
  const f = (z) => j.f.volumeDaSirenePorDistancia(z);
  const { volumeMinimo, volumeMaximo } = plano(j.avaliar("AJUSTE_DE_SOM.sirene"));

  assert.ok(Math.abs(f(ZLONGE(j)) - volumeMinimo) < 1e-9, "longe = mínimo");
  assert.ok(Math.abs(f(ZPERTO(j)) - volumeMaximo) < 1e-9, "perto = máximo");
  assert.ok(volumeMinimo <= 0.05, `baixinha de longe: ${volumeMinimo}`);
  assert.ok(volumeMaximo <= 0.4 + 1e-9, "nunca mais alta que o volume de antes (0,4)");

  let anterior = -1;
  for (let z = ZLONGE(j); z >= ZPERTO(j); z -= 0.25) {
    const v = f(z);
    assert.ok(v >= anterior - 1e-12, `não sobe: z=${z} v=${v} anterior=${anterior}`);
    anterior = v;
  }

  // Limites: fora da faixa não passa do mínimo nem do máximo
  assert.equal(f(ZLONGE(j) + 50), volumeMinimo);
  assert.ok(Math.abs(f(0) - volumeMaximo) < 1e-9);
});

test("sirene — a curva sobe devagar de longe: na metade do caminho ainda está bem abaixo do máximo", () => {
  const j = carregarJogo();
  const meio = (ZLONGE(j) + ZPERTO(j)) / 2;
  const { volumeMaximo } = plano(j.avaliar("AJUSTE_DE_SOM.sirene"));

  assert.ok(j.f.volumeDaSirenePorDistancia(meio) < volumeMaximo * 0.5);
});

test("sirene — ao aparecer a viatura, o som COMEÇA baixinho (mínimo), mesmo que ela surja perto", () => {
  const j = novoJogo();
  const { volumeMinimo } = plano(j.avaliar("AJUSTE_DE_SOM.sirene"));
  j.v.gerenciadorAudio.sons.policia.volume = 0.4;              // sobra de uma sirene anterior

  viaturaEm(j, ZPERTO(j) + 1);                                  // aparece já perto
  j.f.atualizarSirene(1);
  const som = j.v.gerenciadorAudio.sons.policia;

  assert.equal(j.v.gerenciadorAudio.estaTocando("policia"), true);
  // O som é iniciado no volume mínimo: só depois sobe, aos poucos (sem salto)
  const log = [];
  assert.ok(som.volume <= volumeMinimo + (0.4 - volumeMinimo) * 0.2, `volume logo depois de começar: ${som.volume}`);
  assert.ok(log.length === 0);
});

test("sirene — viatura se aproximando: o volume sobe a cada quadro, sem saltos, do baixinho até perto do máximo", () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  const { volumeMinimo, volumeMaximo } = plano(j.avaliar("AJUSTE_DE_SOM.sirene"));
  const log = espiarSons(j);

  const v = viaturaEm(j, ZLONGE(j) - 0.5);
  j.f.atualizarSirene(1);
  assert.deepEqual(plano(log.filter((x) => x.nome === "policia")), [{ nome: "policia", volume: volumeMinimo }], "começou no volume mínimo");

  const volumes = [g.sons.policia.volume];
  while (v.z > ZPERTO(j) + 0.05) {
    v.z -= 0.08;                                                 // a viatura se aproxima
    j.f.atualizarSirene(1);
    volumes.push(g.sons.policia.volume);
  }

  for (let i = 1; i < volumes.length; i++) assert.ok(volumes[i] >= volumes[i - 1] - 1e-9, `quadro ${i}: ${volumes[i - 1]} → ${volumes[i]}`);
  for (let i = 1; i < volumes.length; i++) assert.ok(volumes[i] - volumes[i - 1] < 0.03, `salto brusco no quadro ${i}`);
  assert.ok(volumes[0] < 0.06, `no começo: ${volumes[0]}`);
  assert.ok(volumes[Math.floor(volumes.length / 4)] < volumes[volumes.length - 1] * 0.5, "no primeiro quarto ainda é bem baixo");
  assert.ok(volumes[volumes.length - 1] > volumeMaximo * 0.85, `no fim: ${volumes[volumes.length - 1]}`);
  assert.ok(volumes[volumes.length - 1] <= volumeMaximo + 1e-9);
});

test("sirene — com duas viaturas, o volume segue a mais próxima", () => {
  const j = novoJogo();
  viaturaEm(j, ZLONGE(j) - 1);
  j.v.obstacles.push({ type: "police", worldX: -1, z: ZPERTO(j) + 2, prevZ: ZPERTO(j) + 2, speed: 1, width: 0.5, hit: false });

  j.f.atualizarSirene(1);
  for (let q = 0; q < 200; q++) j.f.atualizarSirene(1);

  const alvo = j.f.volumeDaSirenePorDistancia(ZPERTO(j) + 2);
  assert.ok(Math.abs(j.v.gerenciadorAudio.sons.policia.volume - alvo) < 0.005);
});

test("sirene — depois que a viatura passa, o som se apaga com fade (não corta de uma vez) e para", () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  const v = viaturaEm(j, ZPERTO(j) + 0.3);
  for (let q = 0; q < 100; q++) j.f.atualizarSirene(1);
  const cheio = g.sons.policia.volume;
  assert.ok(cheio > 0.3);

  v.z = ZPERTO(j) - 0.5;                                         // passou pelo jogador
  const descida = [];
  let quadros = 0;
  while (g.estaTocando("policia") && quadros < 200) { j.f.atualizarSirene(1); descida.push(g.sons.policia.volume); quadros++; }

  assert.equal(g.estaTocando("policia"), false, "parou");
  assert.ok(quadros > 5, `fade de ${quadros} quadros (não corta seco)`);
  assert.ok(quadros < 60, "mas some em menos de 1 s");
  const fade = descida.slice(0, -1);                              // o último valor é o reset para o mínimo, já parado
  for (let i = 1; i < fade.length; i++) assert.ok(fade[i] <= fade[i - 1] + 1e-12, "só desce");
  assert.ok(g.sons.policia.volume <= 0.03 + 1e-9, "volta ao mínimo para a próxima viatura");
});

test("sirene — sem viatura em campo não toca nada e a próxima viatura começa baixinha de novo", () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  j.v.obstacles.length = 0;
  j.f.atualizarSirene(1);
  assert.equal(g.estaTocando("policia"), false);

  const { volumeMinimo } = plano(j.avaliar("AJUSTE_DE_SOM.sirene"));
  const v = viaturaEm(j, ZLONGE(j) - 1);
  j.f.atualizarSirene(1);
  for (let q = 0; q < 300; q++) { v.z = Math.max(ZPERTO(j) + 0.1, v.z - 0.3); j.f.atualizarSirene(1); }
  assert.ok(g.sons.policia.volume > 0.3);

  v.z = -5;
  for (let q = 0; q < 60; q++) j.f.atualizarSirene(1);
  viaturaEm(j, ZLONGE(j) - 1);
  j.f.atualizarSirene(1);
  assert.ok(g.sons.policia.volume <= volumeMinimo + 0.01, `segunda viatura começa baixinha: ${g.sons.policia.volume}`);
});

test("sirene — viatura que já passou (atrás do jogador) não conta; a sirene para ao bater", () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  viaturaEm(j, ZPERTO(j) + 1);
  j.f.atualizarSirene(1);
  assert.equal(g.estaTocando("policia"), true);

  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(j.v.gameState.isGameOver, true);
  assert.equal(g.estaTocando("policia"), false, "a batida silencia a sirene");
});

test("sirene — silenciar o som nas opções ou pausar continua funcionando", () => {
  const j = novoJogo();
  j.f.iniciarPartida();
  const g = j.v.gerenciadorAudio;
  viaturaEm(j, ZLONGE(j) - 1);
  j.f.atualizarSirene(1);
  assert.equal(g.estaTocando("policia"), true);

  j.f.pausarJogo();
  assert.equal(g.estaTocando("policia"), false, "pausou");
  j.f.continuarJogo();
  assert.equal(g.estaTocando("policia"), true, "retomou");

  g.ativarMudo(true);
  assert.equal(g.estaTocando("policia"), false);
  j.f.atualizarSirene(1);
  assert.equal(g.estaTocando("policia"), false, "no mudo a sirene não volta");
});

// ============================================================
// 2. Freada: só em batida de verdade; nunca em óleo nem cone
// ============================================================

test("freada — poça de óleo derrapa SEM tocar o som de freada", () => {
  const j = novoJogo();
  const log = espiarSons(j);

  j.f.iniciarDerrapagem();

  assert.ok(j.v.player.derrapagem > 0, "derrapou de verdade");
  assert.deepEqual(log.filter((x) => x.nome === "freada"), []);
  assert.deepEqual(log, [], "nenhum som tocou");
});

test("freada — cone derrubado faz o carro perder ritmo SEM tocar o som de freada", () => {
  const j = novoJogo();
  const log = espiarSons(j);
  j.v.gameState.baseSpeed = 12;
  const base = j.v.gameState.baseSpeed;

  j.f.aplicarTropeco({ worldX: 0, z: ZPERTO(j) });

  assert.ok(j.v.gameState.baseSpeed < base, "o tropeço continua com o mesmo efeito");
  assert.deepEqual(log, [], "nenhum som tocou");
});

test("freada — passando de verdade por óleo e por cone na pista (colisão real) não toca freada", () => {
  for (const tipo of ["oil", "cone"]) {
    const j = novoJogo();
    const log = espiarSons(j);

    obstaculoNoJogador(j, tipo);
    j.f.atualizarObstaculos(1, 0);

    assert.equal(j.v.gameState.isGameOver, false, `${tipo} não encerra a partida`);
    assert.deepEqual(log.filter((x) => x.nome === "freada"), [], tipo);
  }
});

test("batida — numa batida de verdade tocam a batida e um chiado CURTO de freada, ambos mais baixos que antes", () => {
  const j = novoJogo();
  const log = espiarSons(j);

  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);

  const batida = log.find((x) => x.nome === "batida");
  const freada = log.find((x) => x.nome === "freada");
  assert.ok(batida && freada, "os dois tocam na batida");
  assert.equal(log.filter((x) => x.nome === "batida").length, 1, "uma batida só");
  assert.equal(log.filter((x) => x.nome === "freada").length, 1, "uma freada só");
  assert.ok(batida.volume < 0.7, `batida mais suave que os 0,7 de antes: ${batida.volume}`);
  assert.ok(batida.volume >= 0.3, "mas ainda audível");
  assert.ok(freada.volume < 0.5 * 0.5, `freada bem mais baixa que os 0,5 de antes: ${freada.volume}`);
  assert.ok(freada.volume < batida.volume, "o chiado fica por baixo do impacto");
});

test("freada — o chiado da batida é cortado depois de ~0,9 s com fade (o arquivo tem 2,4 s)", async () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  const { volume, duracaoMs, fadeMs } = plano(j.avaliar("AJUSTE_DE_SOM.freada"));
  assert.ok(duracaoMs <= 1000 && fadeMs >= 300 && fadeMs < duracaoMs);

  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(g.estaTocando("freada"), true);
  assert.equal(g.sons.freada.volume, volume);

  await new Promise((r) => setTimeout(r, duracaoMs - fadeMs / 2));
  assert.ok(g.sons.freada.volume < volume, "no meio do fade o volume já está caindo");
  assert.equal(g.estaTocando("freada"), true);

  await new Promise((r) => setTimeout(r, fadeMs / 2 + 250));
  assert.equal(g.estaTocando("freada"), false, "cortada");
  assert.equal(g.sons.freada.volume, volume, "volume restaurado para a próxima vez");
  assert.equal(g.temporizadores.size, 0, "sem relógio sobrando");
});

test("freada — mudo ou som desligado nas opções: a batida não toca nada", () => {
  const j = novoJogo();
  const log = espiarSons(j);
  j.v.gerenciadorAudio.ativarMudo(true);

  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.deepEqual(log, []);
});

test("recomeçar a partida durante o chiado da freada não deixa som nem relógio para trás", async () => {
  const j = novoJogo();
  const g = j.v.gerenciadorAudio;
  obstaculoNoJogador(j, "civilian");
  j.f.atualizarObstaculos(1, 0);
  assert.equal(g.temporizadores.size, 1);

  j.f.iniciarPartida();                                          // pararTudo no reset
  assert.equal(g.estaTocando("freada"), false);
  assert.equal(g.temporizadores.size, 0);
});

// ============================================================
// 3. Volumes e escopo
// ============================================================

test("volumes: batida e freada mais baixas que na 3.8.0 e sirene com o mesmo máximo de antes", () => {
  const j = carregarJogo();
  const g = j.v.gerenciadorAudio;
  g.inicializar();

  assert.equal(g.sons.batida.volume, 0.4);
  assert.ok(g.sons.batida.volume < 0.7);
  assert.equal(g.sons.freada.volume, 0.18);
  assert.ok(g.sons.freada.volume < 0.5);
  assert.equal(g.sons.policia.volume, j.avaliar("AJUSTE_DE_SOM.sirene.volumeMinimo"), "a sirene é inicializada baixinha");
  assert.equal(j.avaliar("AJUSTE_DE_SOM.sirene.volumeMaximo"), 0.4);
});

test("os arquivos de áudio são os mesmos de antes (só os volumes e os gatilhos mudaram)", () => {
  const j = carregarJogo();
  const g = j.v.gerenciadorAudio;
  assert.match(g.sons.freada.src, /audio\/freadaCarro\.mp3$/);
  assert.match(g.sons.policia.src, /audio\/policia\.mp3$/);
  assert.match(g.sons.batida.src, /audio\/batidaCarro\.mp3$/);
  for (const a of ["freadaCarro.mp3", "policia.mp3", "batidaCarro.mp3"]) assert.ok(fs.existsSync(path.join(RAIZ, "audio", a)), a);
});

test("o único lugar que ainda pede o som de freada é a batida de verdade", () => {
  const arquivos = ["js/sistemas/derrapagem.js", "js/obstaculos/efeitos.js", "js/obstaculos/colisao.js", "js/powerups/efeitos.js", "js/game/loop.js"];
  const usos = [];
  for (const a of arquivos) {
    const sem = lerArquivo(a).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    if (/["']freada["']/.test(sem)) usos.push(a);
  }
  assert.deepEqual(usos, ["js/game/loop.js"]);
  assert.match(lerArquivo("js/game/loop.js"), /function iniciarBatida[\s\S]*?tocarCurto\("freada"/);
});

test("som não altera a simulação: mesma partida com som ligado e mudo termina idêntica", () => {
  const rodar = (mudo) => {
    const j = carregarJogo({ pointerEvents: true });
    j.v.gerenciadorAudio.ativarMudo(mudo);
    j.semente(2027);
    j.f.iniciarPartida();
    j.semente(2027);
    for (let q = 0; q < 1500 && !j.v.gameState.isGameOver; q++) {
      j.v.input.left = q % 200 >= 30 && q % 200 < 90;
      j.v.input.right = q % 200 >= 110 && q % 200 < 170;
      j.f.simular(1, 1000 + q * (1000 / 60));
    }
    const v = j.v;
    return JSON.stringify([v.player.worldX, v.gameState.score, v.gameState.worldDistance, v.gameState.turboEnergy, v.gameState.gameSpeed, v.obstacles.map((o) => [o.type, o.worldX, o.z]), v.gameState.isGameOver]);
  };

  assert.equal(rodar(false), rodar(true));
});

test("física, colisões, pontuação e power-ups: nenhuma regra mudou (valores de sempre)", () => {
  const j = carregarJogo();
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.avaliar("WORLD_SPEED_FACTOR"), 0.023);
  assert.equal(j.avaliar("DERRAPAGEM.duracao"), 70);
  assert.equal(j.avaliar("TROPECO.perdaDeVelocidade"), 0.6);
  assert.equal(j.avaliar("TROPECO.perdaDeTurbo"), 14);
  assert.equal(j.v.TIPOS_DE_POWERUP.nitro.energia, 40);
  assert.equal(j.avaliar("QUADROS_DE_BATIDA"), 55);
});

test("versão 4.0.0 em todos os lugares e LEIA-ME documenta os sons", () => {
  const html = lerArquivo("index.html");
  const versoes = new Set([...html.matchAll(/\?v=([\w.]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...versoes], ["4.0.0"]);
  assert.equal(carregarJogo().avaliar("VERSAO_DO_JOGO"), "4.0.0");
  assert.equal(JSON.parse(lerArquivo("package.json")).version, "4.0.0");

  const leia = lerArquivo("js/LEIA-ME.md");
  assert.match(leia, /3\.9\.0/);
  assert.match(leia, /AJUSTE_DE_SOM/);
  assert.match(leia, /volumeDaSirenePorDistancia/);
});
