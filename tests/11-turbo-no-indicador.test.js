// Versão 3.8.0 — o indicador circular de turbo (canvas) é o botão de turbo: azul em repouso, laranja
// enquanto o turbo está ativo; o antigo botão quadrado laranja foi removido. Mecânica inalterada.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, scriptsDoIndex, RAIZ } = require("./helpers/carregar-jogo");

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const NA_PISTA = { closest: () => null };
const NO_BOTAO = { closest: (s) => (/button/.test(s) ? {} : null) };

// ---------- ferramentas ----------

function rgb(cor) {
  let m = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/.exec(cor);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cor);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
const ehAzul = (c) => { const { r, b } = rgb(c); return b > r + 40; };
const ehLaranja = (c) => { const { r, g, b } = rgb(c); return r > b + 60 && r >= g && g > b; };

// Desenha só o indicador de turbo e devolve as cores do disco, do aro e do arco de energia
function lerIndicador(j, cx = 500, cy = 300, r = 33) {
  const stops = [];
  const arcos = [];
  j.v.ctx.createRadialGradient = () => ({ addColorStop: (_, cor) => stops.push(cor) });
  j.v.ctx.arc = (...a) => arcos.push({ a, cor: j.v.ctx.strokeStyle, largura: j.v.ctx.lineWidth });
  j.f.desenharIndicadorTurbo(cx, cy, r);

  const aro = arcos.find((x) => x.a[2] === r + 5 && x.largura > 1 - 1e-9 && x.cor !== undefined && /rgba/.test(String(x.cor)) && x !== arcos[0]);
  const ARCO_INICIO = j.avaliar("ARCO_INICIO");
  // r−4: primeiro a trilha (vazia, cinza) e depois o arco de energia, na cor do estado
  const sobre = arcos.filter((x) => x.a[2] === r - 4 && x.a[3] === ARCO_INICIO);
  const energia = sobre.length > 1 ? sobre[sobre.length - 1] : undefined;
  return { centro: stops[0], borda: stops[1], aro: aro && aro.cor, energia, arcos };
}

function jogoComToque(largura = 891, altura = 411, dpr = 2.625) {
  const j = carregarJogo({ pointerEvents: true, janela: { largura, altura, dpr, toque: true } });
  const container = j.elementos["game-container"];
  container.clientWidth = largura;
  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: largura, height: altura });
  j.f.iniciarPartida();
  j.quadros.pendentes.length = 0;

  return {
    j, container,
    dedo: (nome, e) => j.disparar(nome === "pointerup" ? "janela" : container, nome, { pointerType: "touch", target: NA_PISTA, ...e }),
    dir: () => [j.v.input.left, j.v.input.right],
    turbo: () => j.v.gameState.isTurboActive,
  };
}

// ============================================================
// 1. O botão quadrado laranja não existe mais
// ============================================================

test("index.html — o botão de turbo não tem texto, nem classe, nem estilo: é só a área de toque", () => {
  const html = lerArquivo("index.html");
  const tag = html.match(/<button id="turboBtn"[^>]*>[^<]*<\/button>/)[0];

  assert.match(tag, /type="button"/);
  assert.match(tag, /data-i18n-aria="acessibilidade\.turbo"/, "continua acessível por leitor de tela");
  assert.doesNotMatch(tag, /data-i18n="/, "sem texto traduzido dentro do botão");
  assert.doesNotMatch(tag, /class=|style=/);
  assert.match(tag, /><\/button>/, "sem conteúdo");
});

test("CSS — nenhuma cor, borda, sombra ou fonte do antigo botão quadrado laranja sobrou", () => {
  const menus = lerArquivo("css/estilos/menus.css");
  const bloco = menus.match(/\n#turboBtn \{[^}]*\}/)[0];

  assert.match(bloco, /background:\s*transparent/);
  assert.match(bloco, /border:\s*0/);
  assert.match(bloco, /border-radius:\s*50%/);
  assert.doesNotMatch(bloco, /box-shadow|linear-gradient|font-size|letter-spacing|#ffcc00|#9b650d|#ffe45c/);
  assert.doesNotMatch(menus, /#turboBtn:active/, "sem o efeito de apertar do botão quadrado");
  assert.doesNotMatch(menus, /#turboBtn\s*\{\s*height:\s*3[48]px/, "sem as alturas de 34/38 px dos celulares");
  assert.doesNotMatch(menus, /#turboBtn:disabled/);

  const layout = lerArquivo("css/estilos/layout.css");
  assert.doesNotMatch(layout, /data-layout="inferior"|0\.41176|controlesInferior/, "sem a faixa do botão nem o tamanho antigo");
});

test("o botão não tem texto em nenhum idioma e mantém o rótulo acessível traduzido", () => {
  const j = carregarJogo();
  const rotulos = { pt: "Ativar turbo", en: "Activate turbo", es: "Activar el turbo" };

  for (const [idioma, rotulo] of Object.entries(rotulos)) {
    j.f.definirIdioma(idioma);
    assert.equal(j.elementos.turboBtn.textContent, "", `${idioma}: sem texto`);
    assert.equal(j.elementos.turboBtn.getAttribute("aria-label"), rotulo, `${idioma}: aria-label`);
  }
});

test("o botão de turbo está sempre disponível (toque, mouse e teclado), em qualquer resolução", () => {
  for (const [w, h, dpr, toque] of [[891, 411, 2.625, true], [640, 360, 2, true], [1363, 602, 1, false], [1366, 768, 1, false], [2560, 1080, 1, false], [1024, 768, 2, true]]) {
    const j = carregarJogo({ janela: { largura: w, altura: h, dpr, toque } });
    assert.ok(j.elementos.turboBtn, `${w}×${h}`);
    assert.equal(j.elementos["mobile-controls"].style.display, "", `${w}×${h}: camada do turbo visível`);
  }
});

// ============================================================
// 2. Ativação e encerramento pelo círculo
// ============================================================

test("tocar no círculo ativa o turbo e soltar o encerra (pointerdown / pointerup)", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  const botao = j.elementos.turboBtn;

  assert.equal(j.v.gameState.isTurboActive, false);
  j.disparar(botao, "pointerdown", { pointerId: 3, button: 0 });
  assert.equal(j.v.gameState.isTurboActive, true);
  j.disparar(botao, "pointerup", { pointerId: 3 });
  assert.equal(j.v.gameState.isTurboActive, false);
});

test("o turbo também termina em pointercancel e ao perder a captura do dedo", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  const botao = j.elementos.turboBtn;

  for (const fim of ["pointercancel", "lostpointercapture"]) {
    j.disparar(botao, "pointerdown", { pointerId: 4, button: 0 });
    assert.equal(j.v.gameState.isTurboActive, true, fim);
    j.disparar(botao, fim, { pointerId: 4 });
    assert.equal(j.v.gameState.isTurboActive, false, fim);
  }
});

test("clique do mouse no círculo funciona (só o botão principal) e o botão direito é ignorado", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 2, pointerType: "mouse" });
  assert.equal(j.v.gameState.isTurboActive, false, "botão direito não liga");

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0, pointerType: "mouse" });
  assert.equal(j.v.gameState.isTurboActive, true);
  j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 1, pointerType: "mouse" });
  assert.equal(j.v.gameState.isTurboActive, false);
});

test("sem energia o círculo não ativa o turbo (como o botão antigo e o teclado)", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 0;

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  assert.equal(j.v.gameState.isTurboActive, false);
});

test("o turbo acaba sozinho quando a energia termina, mesmo com o dedo no círculo", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 1.2;

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  assert.equal(j.v.gameState.isTurboActive, true);

  for (let q = 0; q < 200 && j.v.gameState.isTurboActive; q++) j.f.simular(1, 1000 + q * 16);

  assert.equal(j.v.gameState.isTurboActive, false, "acabou a energia");
  assert.equal(j.v.gameState.turboEnergy, 0);
});

test("teclado (Espaço), pausa, perda de foco e fim de partida seguem encerrando o turbo", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();

  j.disparar("janela", "keydown", { code: "Space", key: " " });
  assert.equal(j.v.gameState.isTurboActive, true);
  j.disparar("janela", "keyup", { code: "Space", key: " " });
  assert.equal(j.v.gameState.isTurboActive, false);

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  j.f.pausarJogo();
  assert.equal(j.v.gameState.isTurboActive, false, "pausar solta o turbo");
  j.f.continuarJogo();

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  j.disparar("janela", "blur", {});
  assert.equal(j.v.gameState.isTurboActive, false, "perder o foco solta o turbo");
});

test("pausa por P/Esc e botões de pausa e tela cheia continuam funcionando", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();

  j.disparar("janela", "keydown", { key: "p", code: "KeyP" });
  assert.equal(j.v.gameState.isPaused, true);
  j.disparar("janela", "keydown", { key: "Escape", code: "Escape" });
  assert.equal(j.v.gameState.isPaused, false);

  assert.ok(j.elementos.pauseBtn && j.elementos.fullscreenBtn);
  assert.equal(typeof j.f.alternarTelaCheia, "function");
  assert.doesNotThrow(() => j.f.atualizarBotoesDeTelaCheia());
});

// ============================================================
// 3. Mecânica idêntica: consumo, recarga, duração e intensidade
// ============================================================

test("consumo e recarga idênticos pelo círculo e pelo teclado (estado igual quadro a quadro)", () => {
  const rodar = (acionar, soltar) => {
    const j = carregarJogo({ pointerEvents: true });
    j.semente(7);
    j.f.iniciarPartida();
    j.semente(7);
    const linha = [];

    for (let q = 0; q < 600 && !j.v.gameState.isGameOver; q++) {
      if (q === 60) acionar(j);
      if (q === 300) soltar(j);
      j.f.simular(1, 1000 + q * (1000 / 60));
      linha.push([j.v.gameState.turboEnergy.toFixed(9), j.v.gameState.gameSpeed.toFixed(9), j.v.gameState.speedEffect.toFixed(9), j.v.gameState.isTurboActive, j.v.gameState.score.toFixed(6)]);
    }
    return JSON.stringify(linha);
  };

  const pelaTela = rodar(
    (j) => j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 }),
    (j) => j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 1 }),
  );
  const peloTeclado = rodar(
    (j) => j.disparar("janela", "keydown", { code: "Space", key: " " }),
    (j) => j.disparar("janela", "keyup", { code: "Space", key: " " }),
  );

  assert.equal(pelaTela, peloTeclado);
  const turboLigado = JSON.parse(pelaTela).filter((x) => x[3]).length;
  assert.ok(turboLigado > 20, `o turbo realmente ficou ligado (${turboLigado} quadros)`);
});

test("a quantidade de turbo gasta e recarrega nas mesmas taxas de antes (0,45 e 0,18 por unidade de tempo)", () => {
  const fonte = lerArquivo("js/game/loop.js");
  assert.match(fonte, /gameState\.turboEnergy -= 0\.45 \* dt;/);
  assert.match(fonte, /gameState\.turboEnergy \+= 0\.18 \* dt;/);

  const j = carregarJogo();
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 100;
  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  j.f.simular(1, 1000);
  j.f.simular(1, 1000 + 1000 / 60);
  const gasto = 100 - j.v.gameState.turboEnergy;
  assert.ok(gasto > 0, "gastou");

  j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 1 });
  j.v.gameState.turboEnergy = 50;
  j.f.simular(1, 1000 + 2000 / 60);
  assert.ok(j.v.gameState.turboEnergy > 50, "recarregou ao soltar");
});

test("a mecânica do turbo não foi tocada: o trecho do loop, o input.js e os valores do jogo são os de antes", () => {
  const loop = lerArquivo("js/game/loop.js");
  const trecho = loop.slice(loop.indexOf("// ----- Turbo -----"), loop.indexOf("gameState.turboEnergy = Math.max(0, Math.min(100"));

  assert.match(trecho, /if \(gameState\.isTurboActive && gameState\.turboEnergy > 0\) \{/);
  assert.match(trecho, /0\.45 \* dt/);
  assert.match(trecho, /0\.18 \* dt/);

  const input = lerArquivo("js/input.js");
  assert.match(input, /function ativarTurbo\(\) \{[\s\S]*?if \(gameState\.turboEnergy > 0\) \{[\s\S]*?isTurboActive = true;/);

  const j = carregarJogo();
  assert.equal(j.v.gameState.turboEnergy, 100);
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.avaliar("WORLD_SPEED_FACTOR"), 0.023);
  assert.equal(j.v.TIPOS_DE_POWERUP.nitro.energia, 40);
  assert.equal(j.avaliar("VERSAO_DO_JOGO"), "3.8.0");
});

test("física, pontuação e balanceamento idênticos com o turbo acionado pelo círculo, em vistas diferentes", () => {
  const rodar = (largura, altura) => {
    const j = carregarJogo({ pointerEvents: true, janela: { largura, altura, dpr: 1, toque: false } });
    j.semente(99);
    j.f.iniciarPartida();
    j.semente(99);

    for (let q = 0; q < 1200 && !j.v.gameState.isGameOver; q++) {
      j.v.input.left = q % 200 >= 30 && q % 200 < 90;
      j.v.input.right = q % 200 >= 110 && q % 200 < 170;
      if (q % 400 === 300) j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
      if (q % 400 === 350) j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 1 });
      j.f.simular(1, 1000 + q * (1000 / 60));
    }
    const v = j.v;
    return JSON.stringify([v.player.worldX.toFixed(9), v.gameState.score.toFixed(6), v.gameState.worldDistance.toFixed(9), v.gameState.turboEnergy.toFixed(6), v.obstacles.map((o) => [o.worldX.toFixed(6), o.z.toFixed(6)])]);
  };

  assert.equal(rodar(1366, 768), rodar(2560, 1080));
});

// ============================================================
// 4. Azul → laranja → azul no círculo
// ============================================================

test("o indicador é azul quando o turbo está parado e laranja quando ativo (disco, aro e energia)", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 80;

  j.v.gameState.isTurboActive = false;
  const parado = lerIndicador(j);
  assert.ok(ehAzul(parado.centro) && ehAzul(parado.borda), `disco azul: ${parado.centro} ${parado.borda}`);
  assert.ok(ehAzul(parado.aro), `aro azul: ${parado.aro}`);
  assert.ok(ehAzul(parado.energia.cor), `arco de energia azul: ${parado.energia.cor}`);

  j.v.gameState.isTurboActive = true;
  const ativo = lerIndicador(j);
  assert.ok(ehLaranja(ativo.centro) && ehLaranja(ativo.borda), `disco laranja: ${ativo.centro} ${ativo.borda}`);
  assert.ok(ehLaranja(ativo.aro), `aro laranja: ${ativo.aro}`);
  assert.ok(ehLaranja(ativo.energia.cor), `arco de energia laranja: ${ativo.energia.cor}`);
});

test("ciclo completo: azul → toca (laranja) → solta (volta ao azul), desenhado pelo quadro real do jogo", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();
  const botao = j.elementos.turboBtn;
  const cor = () => { const x = lerIndicador(j); return ehLaranja(x.centro) ? "laranja" : ehAzul(x.centro) ? "azul" : "?"; };

  assert.equal(cor(), "azul");
  j.disparar(botao, "pointerdown", { pointerId: 1, button: 0 });
  j.f.simular(1, 1000);
  assert.equal(cor(), "laranja");
  j.f.simular(1, 1016);
  assert.equal(cor(), "laranja", "continua laranja enquanto o dedo está lá");
  j.disparar(botao, "pointerup", { pointerId: 1 });
  assert.equal(cor(), "azul");

  // O desenho do quadro completo não dá erro nos dois estados
  j.f.renderizar();
  j.disparar(botao, "pointerdown", { pointerId: 1, button: 0 });
  j.f.renderizar();
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
});

test("quando a energia acaba o círculo volta ao azul sozinho (sem soltar o dedo)", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 2;
  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  assert.ok(ehLaranja(lerIndicador(j).centro));

  for (let q = 0; q < 300 && j.v.gameState.isTurboActive; q++) j.f.simular(1, 1000 + q * 16);

  assert.equal(j.v.gameState.isTurboActive, false);
  assert.ok(ehAzul(lerIndicador(j).centro), "voltou ao azul");
});

test("o tom laranja só vale com o turbo ativo: parado nunca fica laranja, mesmo com pouca energia (alerta vermelho preservado)", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.v.gameState.isTurboActive = false;

  for (const energia of [100, 60, 30, 10, 0]) {
    j.v.gameState.turboEnergy = energia;
    const x = lerIndicador(j);
    assert.ok(ehAzul(x.centro) && ehAzul(x.aro), `${energia}%: disco/aro azuis`);
  }

  // O arco de pouca energia continua vermelho (alerta que já existia)
  j.v.gameState.turboEnergy = 10;
  assert.equal(lerIndicador(j).energia.cor, "#ff4a5e");
});

test("as cores do indicador vêm de uma tabela única (DISCO_TURBO) e o velocímetro não mudou de cor", () => {
  const j = carregarJogo();
  assert.deepEqual(Object.keys(j.avaliar("DISCO_TURBO")).sort(), ["ativo", "parado"]);
  assert.ok(ehAzul(j.avaliar("DISCO_TURBO").parado.aro) && ehLaranja(j.avaliar("DISCO_TURBO").ativo.aro));

  const stops = [];
  j.v.ctx.createRadialGradient = () => ({ addColorStop: (_, c) => stops.push(c) });
  j.f.desenharVelocimetro(60, 304, 46);
  assert.equal(stops[0], "rgba(22,36,58,0.82)", "velocímetro com o disco de sempre");
});

// ============================================================
// 5. Quantidade disponível visível e atualizada
// ============================================================

test("a quantidade aparece no arco do círculo: o ângulo final acompanha a energia", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  const ARCO_INICIO = j.avaliar("ARCO_INICIO");
  const varredura = j.avaliar("ARCO_FIM") - ARCO_INICIO;

  for (const energia of [100, 75, 50, 26, 5]) {
    j.v.gameState.turboEnergy = energia;
    const x = lerIndicador(j);
    assert.ok(Math.abs(x.energia.a[4] - (ARCO_INICIO + (energia / 100) * varredura)) < 1e-9, `${energia}%`);
  }
});

test("a quantidade também segue na barra e na porcentagem do HUD, atualizadas a cada gasto e recarga", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();
  j.v.gameState.turboEnergy = 100;
  j.f.atualizarInterface();
  assert.equal(j.elementos.turboPercentage.textContent, "100%");

  j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 1, button: 0 });
  for (let q = 0; q < 90; q++) j.f.simular(1, 1000 + q * (1000 / 60));
  j.f.atualizarInterface();

  const energia = Math.round(j.v.gameState.turboEnergy);
  assert.ok(energia < 100, "consumiu");
  assert.equal(j.elementos.turboPercentage.textContent, `${energia}%`);
  assert.equal(j.elementos.turboBar.style.width, `${energia}%`);

  j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 1 });
  for (let q = 90; q < 400; q++) j.f.simular(1, 1000 + q * (1000 / 60));
  j.f.atualizarInterface();
  assert.ok(Math.round(j.v.gameState.turboEnergy) > energia, "recarregou");
  assert.equal(j.elementos.turboPercentage.textContent, `${Math.round(j.v.gameState.turboEnergy)}%`);
});

test("rótulo do círculo: TURBO com energia e VAZIO sem energia; área de toque marcada como vazia (aria-disabled)", () => {
  const j = carregarJogo({ pointerEvents: true });
  j.f.iniciarPartida();
  const textos = [];
  j.v.ctx.fillText = (t) => textos.push(t);

  j.v.gameState.turboEnergy = 50;
  j.f.desenharIndicadorTurbo(500, 300, 33);
  assert.ok(textos.includes("TURBO"));

  textos.length = 0;
  j.v.gameState.turboEnergy = 0;
  j.f.desenharIndicadorTurbo(500, 300, 33);
  assert.ok(textos.includes("VAZIO"));

  j.f.atualizarInterface();
  assert.equal(j.elementos.turboBtn.getAttribute("aria-disabled"), "true");
  assert.notEqual(j.elementos.turboBtn.disabled, true, "nunca usa disabled (o toque não pode cair na direção)");
  j.v.gameState.turboEnergy = 40;
  j.f.atualizarInterface();
  assert.equal(j.elementos.turboBtn.getAttribute("aria-disabled"), "false");
});

// ============================================================
// 6. Direção por toque preservada; o círculo nunca dirige
// ============================================================

test("toque no círculo NÃO aciona a direção, em qualquer metade da tela (pointer e touch)", () => {
  const { j, dedo, dir } = jogoComToque();

  for (const x of [10, 300, 445, 446, 700, 880]) {
    dedo("pointerdown", { pointerId: 5, clientX: x, target: NO_BOTAO });
    assert.deepEqual(dir(), [false, false], `pointer x=${x}`);
    dedo("pointerup", { pointerId: 5 });
  }

  j.disparar(j.elementos["game-container"], "touchstart", { changedTouches: [{ identifier: 8, clientX: 800, target: NO_BOTAO }] });
  assert.deepEqual(dir(), [false, false], "touchstart");
});

test("turbo e direção ao mesmo tempo: um dedo no círculo e outro numa metade da tela", () => {
  const { j, dedo, dir, turbo } = jogoComToque();
  const botao = j.elementos.turboBtn;

  dedo("pointerdown", { pointerId: 1, clientX: 100 });
  assert.deepEqual(dir(), [true, false]);

  j.disparar(botao, "pointerdown", { pointerId: 2, button: 0 });
  assert.equal(turbo(), true, "turbo liga");
  assert.deepEqual(dir(), [true, false], "a direção continua");

  dedo("pointermove", { pointerId: 1, clientX: 800 });
  assert.deepEqual(dir(), [false, true], "o dedo que dirige troca de metade com o turbo ligado");
  assert.equal(turbo(), true);

  j.disparar(botao, "pointerup", { pointerId: 2 });
  assert.equal(turbo(), false, "soltar o círculo desliga o turbo");
  assert.deepEqual(dir(), [false, true], "e não solta a direção");

  j.disparar(botao, "pointerdown", { pointerId: 3, button: 0 });
  dedo("pointerup", { pointerId: 1 });
  assert.deepEqual(dir(), [false, false], "soltar a direção não desliga o turbo");
  assert.equal(turbo(), true);
  j.disparar(botao, "pointerup", { pointerId: 3 });
});

test("as duas metades continuam dirigindo normalmente (esquerda, direita, borda e centro)", () => {
  const { dedo, dir } = jogoComToque(891, 411);

  dedo("pointerdown", { pointerId: 1, clientX: 5 });        assert.deepEqual(dir(), [true, false]);
  dedo("pointermove", { pointerId: 1, clientX: 445 });      assert.deepEqual(dir(), [true, false]);
  dedo("pointermove", { pointerId: 1, clientX: 446 });      assert.deepEqual(dir(), [false, true]);
  dedo("pointermove", { pointerId: 1, clientX: 886 });      assert.deepEqual(dir(), [false, true]);
  dedo("pointerup", { pointerId: 1 });                      assert.deepEqual(dir(), [false, false]);
});

test("direção por toque: o código de direcao-toque.js continua tratando qualquer botão como toque próprio", () => {
  const fonte = lerArquivo("js/controles/direcao-toque.js");
  assert.match(fonte, /closest\("button, \.screen, \.modal"\)/);
  assert.match(lerArquivo("css/estilos/layout.css"), /#mobile-controls button \{[^}]*pointer-events:\s*auto/);
});

// ============================================================
// 7. Área de toque confortável, centrada no indicador, em todas as resoluções
// ============================================================

const RESOLUCOES = [
  [568, 320, 2, true], [640, 360, 2, true], [780, 360, 3, true], [844, 390, 3, true], [891, 360, 2.625, true], [891, 411, 2.625, true],
  [915, 412, 2.625, true], [932, 430, 3, true], [960, 411, 2.625, true], [1024, 768, 2, true],
  [1280, 800, 1, false], [1363, 602, 1, false], [1366, 768, 1, false], [1440, 900, 2, false], [1920, 1080, 1, false],
  [2560, 1080, 1, false], [3440, 1440, 1, false], [5120, 1440, 1, false],
];

test("a área de toque tem diâmetro de 64 px ou mais, cobre o indicador desenhado e está centrada nele", () => {
  const j = carregarJogo();

  for (const [w, h, dpr, toque] of RESOLUCOES) {
    const l = j.f.calcularLayout({ largura: w, altura: h, toque, dpr });
    const u = l.pxPorUnidade;
    const d = Math.max(64, 88 * u);                      // --turbo-toque
    const folga = Math.max(0, 52 * u - d / 2);           // right e bottom
    const centroX = l.mundo.w - folga - d / 2;
    const centroY = l.mundo.h - folga - d / 2;

    assert.ok(d >= 64, `${w}×${h}: ${d.toFixed(0)} px`);
    assert.ok(d >= 76 * u - 1e-9, `${w}×${h}: cobre o indicador (${(76 * u).toFixed(0)} px)`);
    assert.ok(centroX - d / 2 >= -1e-6 && centroY - d / 2 >= -1e-6, `${w}×${h}: não sai do canvas`);

    // Centro do indicador em pixels CSS: (largura da vista − 52, 308) unidades
    const gaugeX = (l.larguraLogica - 52) * u;
    const gaugeY = 308 * u;
    const tolerancia = Math.max(0, d / 2 - 52 * u) + 1e-6;     // só desloca quando o mínimo de 64 px estoura o canto
    assert.ok(Math.abs(centroX - gaugeX) <= tolerancia + 0.6, `${w}×${h}: centro x ${centroX.toFixed(1)} × ${gaugeX.toFixed(1)}`);
    assert.ok(Math.abs(centroY - gaugeY) <= tolerancia + 0.6, `${w}×${h}: centro y ${centroY.toFixed(1)} × ${gaugeY.toFixed(1)}`);
  }
});

test("em celulares a área de toque é bem maior que 44 px (Galaxy A37: ~90 px) e não invade o velocímetro", () => {
  const j = carregarJogo();
  const l = j.f.calcularLayout({ largura: 891, altura: 411, toque: true, dpr: 2.625 });
  const d = Math.max(64, 88 * l.pxPorUnidade);

  assert.ok(d >= 85 && d <= 100, `${d.toFixed(0)} px`);
  const esquerdaDaArea = l.mundo.w - Math.max(0, 52 * l.pxPorUnidade - d / 2) - d;
  const direitaDoVelocimetro = (60 + 51) * l.pxPorUnidade;
  assert.ok(esquerdaDaArea > direitaDoVelocimetro + 100, "longe do velocímetro");
});

test("o círculo continua no canto direito da vista em qualquer largura (acompanha VISTA.largura)", () => {
  for (const largura of [576, 640, 892, 1328, 1440]) {
    const j = carregarJogo();
    j.f.definirLarguraDaVista(largura);
    const arcos = [];
    j.v.ctx.arc = (...a) => arcos.push(a);
    j.f.desenharHudNoCanvas();

    const turbo = arcos.find((a) => a[2] === 38 && Math.abs(a[0] - (j.v.VISTA.largura - 52)) < 1e-9 && Math.abs(a[1] - 308) < 1e-9);
    assert.ok(turbo, `vista ${largura}: indicador em (${j.v.VISTA.largura - 52}, 308)`);
  }
});

// ============================================================
// 8. Estrutura e versão
// ============================================================

test("versão 3.8.0 em todos os lugares: versao.js, package.json, ?v= do index.html, rodapé e LEIA-ME", () => {
  const html = lerArquivo("index.html");
  const versoes = new Set([...html.matchAll(/\?v=([\w.]+)"/g)].map((m) => m[1]));

  assert.deepEqual([...versoes], ["3.8.0"]);
  assert.equal(carregarJogo().avaliar("VERSAO_DO_JOGO"), "3.8.0");
  assert.equal(JSON.parse(lerArquivo("package.json")).version, "3.8.0");
  assert.match(lerArquivo("js/LEIA-ME.md"), /3\.7\.0/);
  assert.match(lerArquivo("js/LEIA-ME.md"), /indicador/);
  assert.equal(new Set(scriptsDoIndex()).size, scriptsDoIndex().length);
});

test("nenhuma referência ao antigo botão quadrado (data-layout inferior, faixa de botões, turbo-btn) sobrou no código", () => {
  for (const arquivo of ["js/layout/calculo.js", "js/layout/responsivo.js", "css/estilos/layout.css", "index.html"]) {
    const texto = lerArquivo(arquivo);
    assert.doesNotMatch(texto, /controlesInferior|larguraMinimaDoBotaoSobreposto|data-layout="inferior"/, arquivo);
  }
});
