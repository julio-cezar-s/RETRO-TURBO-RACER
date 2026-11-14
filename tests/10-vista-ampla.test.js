// Versão 3.7.0 — o jogo ocupa toda a área da tela: largura lógica variável (VISTA), campo de visão
// horizontal maior em telas largas, perspectiva/cenário/HUD adaptados, sem esticar nada.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, scriptsDoIndex, RAIZ } = require("./helpers/carregar-jogo");

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const NA_PISTA = { closest: () => null };

// Layout da 3.5.0 (medido no Chromium, canvas em CSS px): [largura, altura] do canvas e do carro.
// Era sempre 16:9 e centralizado: o que sobrava dos lados ficava vazio.
const ANTES_DA_3_6_0 = {
  "referência 1363×602 (mouse)": { janela: [1363, 602, 1, false], canvas: [976, 549], carro: 107 },
  "Galaxy A37 891×411 (toque)": { janela: [891, 411, 2.625, true], canvas: [652, 367], carro: 71 },
  "Galaxy A37 891×360 (toque, com barra do navegador)": { janela: [891, 360, 2.625, true], canvas: [573, 322], carro: 63 },
  "notebook 1366×768": { janela: [1366, 768, 1, false], canvas: [1264, 711], carro: 138 },
  "Full HD 1920×1080": { janela: [1920, 1080, 1, false], canvas: [1824, 1026], carro: 200 },
  "ultrawide 2560×1080": { janela: [2560, 1080, 1, false], canvas: [1824, 1026], carro: 200 },
};

const layoutDe = (j, largura, altura, toque, dpr = 1, seguro) =>
  j.f.calcularLayout({ largura, altura, toque, dpr, seguro });

// Fração (0–1) da área sob a barra que o canvas ocupa em cada eixo
const preenchimento = (l) => ({
  largura: l.mundo.w / l.area.w,
  altura: l.mundo.h / (l.area.h - l.barra.h - (l.modo === "inferior" ? l.controles.h : 0)),
});

// ============================================================
// 1. A vista (largura lógica) e a matemática de proporção
// ============================================================

test("vista — altura lógica fixa em 360; largura-base 640 e 16:9 dá 640 (igual ao jogo de antes)", () => {
  const j = carregarJogo();
  assert.equal(j.v.GAME_WIDTH, 640);
  assert.equal(j.v.GAME_HEIGHT, 360);
  assert.equal(j.v.VISTA.altura, 360);
  assert.equal(j.f.larguraLogicaDaProporcao(16 / 9), 640);
});

test("vista — a largura lógica acompanha a proporção da tela, de 576 (16:10) a 1440 (4:1)", () => {
  const j = carregarJogo();
  const larg = (p) => j.f.larguraLogicaDaProporcao(p);

  assert.equal(larg(16 / 10), 576);
  assert.ok(Math.abs(larg(1363 / 550) - 892.1) < 0.2, "referência 1363×550");
  assert.ok(Math.abs(larg(21 / 9) - 840) < 1e-9, "21:9");
  assert.ok(Math.abs(larg(32 / 9) - 1280) < 1e-9, "32:9");
  assert.equal(larg(4), 1440);

  // Limites: mais estreito que 16:10 não perde pista; mais largo que 4:1 não estica
  assert.equal(larg(4 / 3), 576);
  assert.equal(larg(1), 576);
  assert.equal(larg(10), 1440);

  // Entradas inválidas caem na largura-base
  for (const ruim of [0, -1, NaN, undefined]) assert.equal(larg(ruim), 640);
});

test("vista — a largura mínima de 576 ainda mostra a pista inteira e o acostamento (kerb a 1,64 faixa)", () => {
  const j = carregarJogo();
  const kerb = j.avaliar("ROAD.kerbOuter") * j.avaliar("CAMERA_SCALE");
  assert.ok(576 / 2 >= kerb - 0.5, `meia vista ${576 / 2} < kerb ${kerb}`);
});

test("vista — definirLarguraDaVista só avisa quando muda, respeita os limites e descarta o céu em cache", () => {
  const j = carregarJogo();
  j.f.renderizar();
  assert.notEqual(j.v.camadasCeu, null);

  assert.equal(j.f.definirLarguraDaVista(j.v.VISTA.largura), false, "mesma largura: nada muda");
  assert.notEqual(j.v.camadasCeu, null, "mesma largura: céu mantido");

  assert.equal(j.f.definirLarguraDaVista(900), true);
  assert.equal(j.v.VISTA.largura, 900);
  assert.equal(j.v.camadasCeu, null, "largura nova: céu refeito na próxima vez");

  j.f.definirLarguraDaVista(99999);
  assert.equal(j.v.VISTA.largura, 1440, "limitada à proporção máxima");
  j.f.definirLarguraDaVista(10);
  assert.equal(j.v.VISTA.largura, 576, "limitada à proporção mínima");
});

// ============================================================
// 2. Layout: toda a área disponível é aproveitada, sem faixas vazias
// ============================================================

test("referência 1363×602: o canvas ocupa 100% da largura (antes: 72%, com 194 px vazios em cada lado)", () => {
  const j = carregarJogo();

  for (const toque of [false, true]) {
    const l = layoutDe(j, 1363, 602, toque, 1);
    assert.equal(l.mundo.w, 1363, "largura inteira");
    assert.equal(l.mundo.x, 0);
    assert.equal(l.lateral.esquerda, 0);
    assert.equal(l.lateral.direita, 0);
    assert.equal(l.mundo.y, l.barra.h, "logo abaixo da barra");
    assert.equal(l.mundo.y + l.mundo.h, 602, "até o fim da tela");
    assert.ok(Math.abs(l.larguraLogica - 892.1) < 0.2, `vista ${l.larguraLogica}`);
    assert.ok(l.mundo.w > 976 * 1.39, "bem mais largo que os 976 px da 3.5.0");
  }
});

test("antes × depois: em todas as telas de referência o canvas cresce e a largura fica 100% aproveitada", () => {
  const j = carregarJogo();

  for (const [nome, { janela: [w, h, dpr, toque], canvas: [cwAntes, chAntes] }] of Object.entries(ANTES_DA_3_6_0)) {
    const l = layoutDe(j, w, h, toque, dpr);
    const p = preenchimento(l);

    assert.ok(p.largura > 0.999, `${nome}: largura ${p.largura}`);
    assert.ok(p.altura > 0.999, `${nome}: altura ${p.altura}`);
    assert.ok(l.mundo.w > cwAntes, `${nome}: ${l.mundo.w} > ${cwAntes}`);
    assert.ok(l.mundo.h >= chAntes - 1, `${nome}: a altura não encolhe (${l.mundo.h} vs ${chAntes})`);
    assert.ok(l.mundo.w * l.mundo.h > cwAntes * chAntes, `${nome}: área maior`);
  }
});

test("celulares na horizontal (Galaxy A37 e outros): canvas na tela toda, sem faixas, com o turbo sobre o canvas", () => {
  const j = carregarJogo();
  const telas = [
    [891, 411, 2.625], [891, 360, 2.625], [915, 412, 2.625], [932, 430, 3], [844, 390, 3], [960, 411, 2.625],
    [780, 360, 3], [812, 375, 3],
  ];

  for (const [w, h, dpr] of telas) {
    const l = layoutDe(j, w, h, true, dpr);
    const p = preenchimento(l);
    assert.equal(l.modo, "cheio", `${w}×${h}`);
    assert.ok(p.largura > 0.998 && p.altura > 0.998, `${w}×${h}: ${p.largura.toFixed(4)} × ${p.altura.toFixed(4)}`);
    assert.ok(l.lateral.esquerda <= 1 / dpr + 1e-6 && l.lateral.direita <= 1 / dpr + 1e-6, `${w}×${h}: laterais`);
    assert.deepEqual(l.controles, l.mundo, "o turbo se posiciona sobre o canvas");
  }
});

test("Galaxy A37 com entalhe/barras do sistema: o canvas ocupa toda a área segura e nada sai dela", () => {
  const j = carregarJogo();
  const seguro = { topo: 0, direita: 48, base: 0, esquerda: 48 };
  const l = layoutDe(j, 891, 411, true, 2.625, seguro);

  assert.equal(l.modo, "cheio");
  assert.ok(l.mundo.x >= 48 - 1e-6 && l.mundo.x + l.mundo.w <= 891 - 48 + 1e-6, "dentro da área segura");
  assert.ok(Math.abs(l.mundo.w - (891 - 96)) <= 1 / 2.625 + 1e-6, "ocupa toda a largura segura");
  assert.ok(l.barra.x >= 48 && l.barra.x + l.barra.w <= 891 - 48 + 1e-6);
});

test("notebooks (16:9 e 16:10), monitores 21:9 e 32:9: sem faixas laterais e sem faixas em cima/embaixo", () => {
  const j = carregarJogo();
  const telas = [
    ["notebook 1366×768", 1366, 768, 1], ["notebook 125% 1536×864", 1536, 864, 1.25], ["Full HD", 1920, 1080, 1],
    ["notebook 16:10 1440×900", 1440, 900, 2], ["notebook 16:10 1280×800", 1280, 800, 1], ["WUXGA 1920×1200", 1920, 1200, 1],
    ["4K 150%", 2560, 1440, 1.5], ["ultrawide 2560×1080", 2560, 1080, 1], ["ultrawide 3440×1440", 3440, 1440, 1],
    ["super ultrawide 5120×1440", 5120, 1440, 1],
  ];

  for (const [nome, w, h, dpr] of telas) {
    const l = layoutDe(j, w, h, false, dpr);
    const p = preenchimento(l);
    assert.equal(l.modo, "mesa", nome);
    assert.ok(p.largura > 0.999, `${nome}: largura ${p.largura}`);
    assert.ok(p.altura > 0.999, `${nome}: altura ${p.altura}`);
    assert.ok(l.aproveitamento > 0.93, `${nome}: aproveitamento ${l.aproveitamento.toFixed(3)}`);
  }
});

test("tela mais quadrada que 16:10 (tablet 4:3, janela quase quadrada): canvas 16:10 exato e o resto fica para a barra e o turbo", () => {
  const j = carregarJogo();

  for (const [w, h, toque] of [[1024, 768, true], [1024, 768, false], [800, 800, false], [1280, 1024, false]]) {
    const l = layoutDe(j, w, h, toque, 2);
    assert.ok(Math.abs(l.mundo.w / l.mundo.h - 1.6) < 1e-9, `${w}×${h}`);
    assert.equal(l.larguraLogica, 576);
    assert.ok(l.mundo.w <= w && l.mundo.y >= l.barra.h);
  }

  // Janela comprida e baixa demais além de 4:1: o canvas pára em 4:1 e centraliza (não estica)
  const larga = layoutDe(j, 3000, 500, false, 1);
  assert.ok(Math.abs(larga.mundo.w / larga.mundo.h - 4) < 0.01);
  assert.equal(Math.round(larga.larguraLogica), 1440);
  assert.ok(Math.abs(larga.lateral.esquerda - larga.lateral.direita) < 1e-6, "sobra simétrica");
});

test("sem botão quadrado, o canvas dos celulares estreitos não perde mais altura para uma faixa de botões", () => {
  const j = carregarJogo();
  const l = layoutDe(j, 640, 360, true, 2);
  assert.equal(l.modo, "cheio");
  assert.ok(l.mundo.y + l.mundo.h > 355, "o canvas vai até o fim da tela");
});

test("tamanhos de tela degenerados continuam sem NaN nem tamanhos negativos", () => {
  const j = carregarJogo();

  for (const [w, h] of [[0, 0], [1, 1], [10, 10], [100, 30], [300, 20], [20000, 100], [100, 20000]]) {
    for (const toque of [true, false]) {
      const l = layoutDe(j, w, h, toque, 2);
      for (const v of [l.mundo.w, l.mundo.h, l.mundo.x, l.mundo.y, l.ui, l.barra.h, l.larguraLogica, l.pxPorUnidade]) {
        assert.ok(Number.isFinite(v) && v >= 0, `${w}×${h}: ${v}`);
      }
      assert.ok(l.larguraLogica >= 576 && l.larguraLogica <= 1440, `${w}×${h}: vista ${l.larguraLogica}`);
    }
  }
});

// ============================================================
// 3. Sem esticar: a mesma escala nos dois eixos e objetos com a mesma proporção
// ============================================================

const JANELAS = [
  [891, 411, 2.625, true], [891, 360, 2.625, true], [844, 390, 3, true], [960, 411, 2.625, true],
  [1363, 602, 1, false], [1366, 768, 1, false], [1440, 900, 2, false], [1920, 1080, 1, false],
  [2560, 1080, 1, false], [3440, 1440, 1, false], [5120, 1440, 1, false], [1024, 768, 2, true],
];

test("sem deformação: pixels por unidade lógica iguais na horizontal e na vertical em todas as telas", () => {
  for (const [w, h, dpr, toque] of JANELAS) {
    const j = carregarJogo({ janela: { largura: w, altura: h, dpr, toque } });
    const l = j.v.tela.layout;
    const c = j.elementos.gameCanvas;

    const horizontal = l.mundo.w / j.v.VISTA.largura;
    const vertical = l.mundo.h / j.v.VISTA.altura;
    assert.ok(Math.abs(horizontal / vertical - 1) < 1e-6, `${w}×${h}: ${horizontal} × ${vertical}`);

    // Resolução interna: mesma escala nos dois eixos (com no máximo 1 px de arredondamento)
    assert.ok(Math.abs(c.width / j.v.VISTA.largura - c.height / 360) < 1 / j.v.VISTA.largura + 1e-9,
      `${w}×${h}: interno ${c.width}×${c.height} para vista ${j.v.VISTA.largura}`);
    assert.ok(Math.abs(c.width / c.height - l.mundo.w / l.mundo.h) < 0.004, `${w}×${h}: o canvas interno tem a proporção do mostrado`);
  }
});

test("objetos com as mesmas proporções de antes: o carro ocupa a mesma fração da altura do canvas (70/360) em qualquer tela", () => {
  for (const [w, h, dpr, toque] of JANELAS) {
    const j = carregarJogo({ janela: { largura: w, altura: h, dpr, toque } });
    const l = j.v.tela.layout;
    const carroPx = j.v.player.width * l.pxPorUnidade;

    assert.ok(Math.abs(carroPx / l.mundo.h - 70 / 360) < 1e-9, `${w}×${h}`);
    assert.ok(Math.abs(j.v.player.height * l.pxPorUnidade / l.mundo.h - 95 / 360) < 1e-9, `${w}×${h}: altura do carro`);
    assert.equal(j.v.player.width, 70);
    assert.equal(j.v.player.height, 95);
  }
});

test("antes × depois: o carro tem o mesmo tamanho na tela (±2%) quando a altura do canvas é a mesma", () => {
  for (const [nome, { janela: [w, h, dpr, toque], canvas: [, chAntes], carro }] of Object.entries(ANTES_DA_3_6_0)) {
    const j = carregarJogo({ janela: { largura: w, altura: h, dpr, toque } });
    const l = j.v.tela.layout;
    const carroDepois = 70 * l.pxPorUnidade;
    const esperado = carro * (l.mundo.h / chAntes);       // mesmo carro, escalado só pela altura do canvas

    assert.ok(Math.abs(carroDepois / esperado - 1) < 0.02, `${nome}: ${carroDepois.toFixed(1)} px × ${esperado.toFixed(1)} px`);
  }
});

test("a perspectiva é a mesma de antes: pista, faixas e acostamento com a mesma largura em pixels na linha do jogador", () => {
  const larguraDaPista = (largura) => {
    const j = carregarJogo({ janela: { largura, altura: 768, dpr: 1, toque: false } });
    const s = j.f.scaleAtY(j.v.GAME_HEIGHT - 20);
    j.v.player.worldX = 0;
    j.f.atualizarCameraPeloJogador();
    j.f.atualizarPerfil();

    return {
      pista: j.f.projX(1.5, s) - j.f.projX(-1.5, s),
      kerb: j.f.projX(1.64, s) - j.f.projX(-1.64, s),
      faixa: j.f.projX(0.5, s) - j.f.projX(-0.5, s),
      centro: (j.f.projX(1.5, s) + j.f.projX(-1.5, s)) / 2,
      vista: j.v.VISTA.largura,
    };
  };

  const base = larguraDaPista(1366);       // vista ~687
  const larga = larguraDaPista(2560);      // vista ~896 (ultrawide)

  assert.notEqual(base.vista, larga.vista);
  for (const k of ["pista", "kerb", "faixa"]) assert.ok(Math.abs(base[k] - larga[k]) < 1e-9, `${k}: igual em qualquer vista`);
  assert.ok(Math.abs(base.pista - 3 * 175 * (222 / 242)) < 1e-6, "pista com 3 faixas na escala da linha do jogador");

  // O ponto de fuga e a pista ficam no CENTRO da vista, seja qual for a largura
  assert.ok(Math.abs(base.centro - base.vista / 2) < 1e-9);
  assert.ok(Math.abs(larga.centro - larga.vista / 2) < 1e-9);
});

test("o carro do jogador fica centralizado na vista (mundo no centro) e a hitbox continua a mesma", () => {
  for (const largura of [640, 892, 1328]) {
    const j = carregarJogo({ janela: { largura, altura: 400, dpr: 1, toque: false } });
    j.novaPartida();
    j.v.player.worldX = 0;
    j.f.atualizarCameraPeloJogador();
    j.f.atualizarPosicaoDoJogador();

    const centro = j.v.player.x + j.v.player.width / 2;
    assert.ok(Math.abs(centro - j.v.VISTA.largura / 2) < 1e-6, `${largura}: centro ${centro} × ${j.v.VISTA.largura / 2}`);
    assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
    assert.equal(j.v.PLAYER_WORLD_WIDTH, 0.54);
  }
});

// ============================================================
// 4. Renderização: tudo cobre a vista inteira e a interface se reposiciona
// ============================================================

// Instala espiões no contexto 2D simulado e devolve as chamadas gravadas
function espiar(j, metodos) {
  const gravado = Object.fromEntries(metodos.map((m) => [m, []]));
  for (const m of metodos) j.v.ctx[m] = (...args) => { gravado[m].push(args); };
  return gravado;
}

test("renderização em vista larga: sem erros, em vários estados do jogo", () => {
  for (const largura of [640, 891, 1363, 2560, 5120]) {
    const j = carregarJogo({ janela: { largura, altura: 700, dpr: 1, toque: false } });
    j.novaPartida();
    j.v.gameState.speedEffect = 0.9;
    j.v.gameState.isTurboActive = true;
    j.v.powerUps.escudo = 600; j.v.powerUps.lentidao = 300; j.v.powerUps.dobro = 400; j.v.powerUps.fatorDeTempo = 0.6;
    j.v.gameState.nivelAviso = 100; j.v.gameState.nivel = 3;
    j.v.gameState.flash = 0.5;

    for (let q = 0; q < 30; q++) j.f.simular(1, 1000 + q * 16);
    j.f.renderizar();
    assert.equal(j.avaliar("falhasDoJogo.length"), 0, `largura ${largura}`);
  }
});

test("terreno, névoa, vinheta e flash cobrem a largura inteira da vista (sem faixas sem pintura nas laterais)", () => {
  for (const largura of [640, 1363, 2560]) {
    const j = carregarJogo({ janela: { largura, altura: 700, dpr: 1, toque: false } });
    j.novaPartida();
    j.v.gameState.flash = 0.4;
    j.v.gameState.isTurboActive = true;
    const espiao = espiar(j, ["fillRect"]);

    j.f.renderizar();

    const W = j.v.VISTA.largura;
    const cobrem = espiao.fillRect.filter(([x, , w]) => x === 0 && Math.abs(w - W) < 1e-9);
    // terreno + névoa + brilho do sol + vinheta + borda do turbo + flash
    assert.ok(cobrem.length >= 6, `largura ${largura}: ${cobrem.length} preenchimentos de largura total`);
  }
});

test("o céu cobre a vista toda com paralaxe (camadas com pelo menos 260 unidades a mais que a vista)", () => {
  for (const largura of [640, 1363, 2560, 5120]) {
    const j = carregarJogo({ janela: { largura, altura: 700, dpr: 1, toque: false } });
    j.f.renderizar();
    const escala = j.v.RENDER_SCALE;
    const W = j.v.VISTA.largura;

    assert.ok(j.f.larguraDoCeu() >= Math.max(900, W + 260), `${largura}: céu ${j.f.larguraDoCeu()} para vista ${W}`);
    const c = j.v.camadasCeu;
    for (const nome of ["fundo", "montanhasLonge", "montanhasPerto", "mata"]) {
      assert.equal(c[nome].width, Math.round(j.f.larguraDoCeu() * escala), `${largura}: camada ${nome}`);
    }
    assert.equal(c.nuvens.width, Math.round((j.f.larguraDoCeu() + 260) * escala), "camada de nuvens");
  }
});

test("a vista de 640 mantém o céu de antes (900 de largura) e o mesmo padrão de nuvens", () => {
  const j = carregarJogo();
  j.f.definirLarguraDaVista(640);
  assert.equal(j.f.larguraDoCeu(), 900);
  j.f.definirLarguraDaVista(576);
  assert.equal(j.f.larguraDoCeu(), 900);
});

test("HUD no canvas: velocímetro à esquerda, indicador de turbo na borda direita e nível no centro — em qualquer vista", () => {
  for (const largura of [640, 1363, 2560]) {
    const j = carregarJogo({ janela: { largura, altura: 700, dpr: 1, toque: false } });
    j.novaPartida();
    const arcos = espiar(j, ["arc"]);

    j.f.desenharHudNoCanvas();

    const W = j.v.VISTA.largura;
    const velocimetro = arcos.arc.find(([x, y, r]) => Math.abs(x - 60) < 1e-9 && Math.abs(y - 304) < 1e-9);
    const turbo = arcos.arc.find(([x, y, r]) => Math.abs(x - (W - 52)) < 1e-9 && Math.abs(y - 308) < 1e-9);
    assert.ok(velocimetro, `${largura}: velocímetro em (60, ${360 - 56})`);
    assert.ok(turbo, `${largura}: indicador de turbo em (${W - 52}, ${360 - 52})`);

    // Tudo dentro da vista (sem corte no canto)
    for (const [x, y, r] of arcos.arc) {
      assert.ok(x - r >= -1e-6 && x + r <= W + 1e-6 && y + r <= 360 + 1e-6, `arco fora da vista: ${x},${y},${r}`);
    }
  }

  // O texto de nível acompanha o centro
  const j = carregarJogo({ janela: { largura: 2560, altura: 700, dpr: 1, toque: false } });
  j.novaPartida();
  const textos = espiar(j, ["fillText"]);
  j.f.desenharIndicadorDeNivel();
  assert.ok(textos.fillText.every(([, x]) => Math.abs(x - j.v.VISTA.largura / 2) < 1e-9), "nível centralizado na vista");
});

test("medidores de power-up, combo, nível e sequência não se sobrepõem em nenhuma largura de vista", () => {
  const intersecta = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

  for (const largura of [576, 640, 700, 892, 1328, 1440]) {
    const j = carregarJogo({ janela: { largura: 1000, altura: 700, dpr: 1, toque: false } });
    j.f.definirLarguraDaVista(largura);
    const W = j.v.VISTA.largura;
    const r = j.f.raioDoMedidorDePowerUp();
    const meio = W / 2;
    const outros = [
      { nome: "combo", x0: 0, y0: 0, x1: 126, y1: 62 },
      { nome: "nível", x0: meio - 34, y0: 6, x1: meio + 34, y1: 22 },
      { nome: "sequência", x0: meio - 62, y0: 26, x1: meio + 62, y1: 52 },
    ];
    const medidores = [0, 1, 2].map((i) => {
      const { cx, cy } = j.f.posicaoDoMedidorDePowerUp(i, r);
      return { x0: cx - r - 2, y0: cy - r - 2, x1: cx + r + 2, y1: cy + r + 2 };
    });

    medidores.forEach((m, i) => {
      assert.ok(m.x0 >= 0 && m.y0 >= 0 && m.x1 <= W + 1e-6 && m.y1 <= 360, `vista ${W}: medidor ${i} dentro`);
      outros.forEach((o) => assert.equal(intersecta(m, o), false, `vista ${W}: medidor ${i} × ${o.nome}`));
    });
  }
});

test("a área de toque do turbo cobre o indicador, cabe no canvas e não encosta no velocímetro, em celulares", () => {
  const j = carregarJogo();

  for (const [w, h, dpr] of [[891, 411, 2.625], [891, 360, 2.625], [844, 390, 3], [915, 412, 2.625], [932, 430, 3], [640, 360, 2], [568, 320, 2]]) {
    const l = layoutDe(j, w, h, true, dpr);
    const u = l.pxPorUnidade;
    const W = l.larguraLogica;

    // Mesmas contas do CSS: diâmetro max(64, 88·u); right/bottom = max(0, 52·u − diâmetro/2)
    const d = Math.max(64, 88 * u);
    const direita = Math.max(0, 52 * u - d / 2);
    const area = { x1: l.mundo.w - direita, y1: l.mundo.h - direita };
    area.x0 = area.x1 - d; area.y0 = area.y1 - d;

    const indicador = { x0: (W - 52 - 38) * u, y0: (308 - 38) * u, x1: (W - 52 + 38) * u, y1: (308 + 38) * u };
    const velocimetro = { x0: (60 - 51) * u, y0: (304 - 51) * u, x1: (60 + 51) * u, y1: (304 + 51) * u };
    const cruza = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

    assert.ok(d >= 64 && d >= 76 * u, `${w}×${h}: área de toque ${d.toFixed(0)} px`);
    // Cobre o indicador inteiro (o desenho tem 76 unidades)
    assert.ok(area.x0 <= indicador.x0 + 0.6 && area.x1 >= indicador.x1 - 0.6 && area.y0 <= indicador.y0 + 0.6 && area.y1 >= indicador.y1 - 0.6, `${w}×${h}: não cobre o indicador`);
    assert.ok(area.x0 >= 0 && area.x1 <= l.mundo.w + 1e-6 && area.y0 >= 0 && area.y1 <= l.mundo.h + 1e-6, `${w}×${h}: área cortada`);
    assert.equal(cruza(area, velocimetro), false, `${w}×${h}: área × velocímetro`);
    assert.equal(cruza(indicador, velocimetro), false, `${w}×${h}: indicador × velocímetro`);
  }
});

// ============================================================
// 5. Cenário nas laterais ampliadas
// ============================================================

function coletarCenario(j, z0 = 0) {
  j.v.gameState.worldDistance = z0;
  const lista = [];
  j.f.coletarCenarioLateralAmpliado(lista);
  return lista;
}

test("cenário lateral extra: nada é gerado na vista de 640 (o cenário fica igual ao de antes)", () => {
  const j = carregarJogo();
  for (const w of [576, 640]) {
    j.f.definirLarguraDaVista(w);
    assert.deepEqual(coletarCenario(j), [], `vista ${w}`);
  }
});

test("cenário lateral extra: em vista larga gera árvores e construções além do cenário original, dos dois lados", () => {
  const j = carregarJogo({ janela: { largura: 2560, altura: 1080, dpr: 1, toque: false } });
  const lista = coletarCenario(j);
  const tipos = new Set(lista.map((o) => o.tipo));

  assert.ok(lista.length > 8 && lista.length < 400, `${lista.length} objetos`);
  assert.ok(tipos.has("arvore"));
  assert.ok(lista.some((o) => o.x < 0) && lista.some((o) => o.x > 0), "dos dois lados");
  for (const o of lista) {
    assert.ok(Math.abs(o.x) >= 11, `afastado da pista: ${o.x}`);
    assert.ok(o.z >= 0 && o.z <= j.v.GAME_HEIGHT * 0 + j.avaliar("Z_FAR"), `z ${o.z}`);
    assert.ok(Math.abs(o.x) <= 90 + 1e-9, `alcance ${o.x}`);
  }
  // As construções extras usam os mesmos tipos de desenho do cenário original
  for (const o of lista.filter((x) => x.tipo !== "arvore")) assert.ok(["galpao", "casa", "silo"].includes(o.tipo));
});

test("cenário lateral extra: posições estáveis (mesma distância → mesmos objetos) e ancoradas na pista ao andar", () => {
  const j = carregarJogo({ janela: { largura: 2560, altura: 1080, dpr: 1, toque: false } });
  const a = coletarCenario(j, 100);
  const b = coletarCenario(j, 100);
  assert.deepEqual(a, b);

  // Ao andar 1 unidade, os mesmos objetos aparecem 1 unidade mais perto
  const c = coletarCenario(j, 101);
  const chave = (o) => `${o.tipo}|${o.x}|${(o.z + 100).toFixed(6)}`;
  const em101 = new Set(c.map((o) => `${o.tipo}|${o.x}|${(o.z + 101).toFixed(6)}`));
  const comuns = a.filter((o) => em101.has(chave(o)));
  assert.ok(comuns.length >= a.length * 0.8, `${comuns.length}/${a.length} objetos ancorados`);
});

test("cenário lateral extra entra na lista de objetos da cena e é desenhado sem erro", () => {
  const j = carregarJogo({ janela: { largura: 2560, altura: 1080, dpr: 1, toque: false } });
  j.novaPartida();
  const cena = j.f.coletarObjetosDaCena([]);
  assert.ok(cena.some((o) => Math.abs(o.x || 0) > 17), "há objetos além do cenário original");
  for (let i = 1; i < cena.length; i++) assert.ok(cena[i - 1].z >= cena[i].z, "ordenado do mais distante ao mais próximo");

  j.f.renderizar();
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
});

test("terreno: mais tufos de grama em vista larga, na mesma quantidade de antes na vista de 640", () => {
  const contar = (largura) => {
    const j = carregarJogo({ janela: { largura, altura: 360, dpr: 1, toque: false } });
    j.novaPartida();
    j.f.definirLarguraDaVista(largura === 640 ? 640 : 1200);
    const gravado = espiar(j, ["moveTo"]);
    j.f.desenharTufosDeGrama();
    return gravado.moveTo.length;
  };

  assert.ok(contar(2560) > contar(640) * 1.5, "mais tufos na vista larga");
});

// ============================================================
// 6. Controles, turbo, pausa e tela cheia continuam funcionando
// ============================================================

function partidaCom(largura, altura, dpr = 2) {
  const j = carregarJogo({ pointerEvents: true, janela: { largura, altura, dpr, toque: true } });
  const container = j.elementos["game-container"];
  container.clientWidth = largura;
  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: largura, height: altura });
  j.f.iniciarPartida();
  j.quadros.pendentes.length = 0;

  const ev = (nome, e) => j.disparar(nome === "pointerup" ? "janela" : container, nome, { pointerId: 1, pointerType: "touch", target: NA_PISTA, ...e });
  const dir = () => [j.v.input.left, j.v.input.right];

  return { j, container, ev, dir };
}

test("controles invisíveis: metade esquerda dirige para a esquerda, metade direita para a direita — no layout de tela cheia", () => {
  for (const [largura, altura] of [[891, 411], [844, 390], [915, 412], [1363, 602]]) {
    const { j, ev, dir } = partidaCom(largura, altura);
    assert.equal(j.elementos["game-container"].getAttribute("data-layout") === "lateral", false);

    ev("pointerdown", { clientX: 5 });                         assert.deepEqual(dir(), [true, false], `${largura}: borda esquerda`);
    ev("pointermove", { clientX: largura / 2 - 1 });           assert.deepEqual(dir(), [true, false], `${largura}: logo antes do meio`);
    ev("pointermove", { clientX: largura / 2 });               assert.deepEqual(dir(), [false, true], `${largura}: no meio`);
    ev("pointermove", { clientX: largura - 5 });               assert.deepEqual(dir(), [false, true], `${largura}: borda direita`);
    ev("pointerup", {});                                       assert.deepEqual(dir(), [false, false], `${largura}: soltou`);
  }
});

test("a direção continua dividida ao meio da TELA (e não ao meio do mundo) mesmo com o canvas ocupando tudo", () => {
  const { j } = partidaCom(891, 411);
  const l = j.v.tela.layout;
  assert.equal(l.mundo.x + l.mundo.w / 2, 891 / 2, "o centro do canvas é o centro da tela: as duas metades coincidem");
  assert.equal(j.f.zonaDoToque(445), "esquerda");
  assert.equal(j.f.zonaDoToque(446), "direita");
});

test("tocar no botão de turbo não dirige; o turbo liga e desliga normalmente", () => {
  const { j, container, ev, dir } = partidaCom(891, 411);
  const BOTAO = { closest: (s) => (/button/.test(s) ? {} : null) };

  ev("pointerdown", { clientX: 800, target: BOTAO });
  assert.deepEqual(dir(), [false, false], "botão tem o próprio toque");

  // Turbo por tecla (mesmo caminho do botão): liga com energia e desliga ao soltar
  j.v.gameState.turboEnergy = 100;
  const botao = j.elementos.turboBtn;
  j.disparar(botao, "pointerdown", { pointerId: 9, button: 0 });
  assert.equal(j.v.gameState.isTurboActive, true, "turbo ligou");
  j.disparar(botao, "pointerup", { pointerId: 9 });
  assert.equal(j.v.gameState.isTurboActive, false, "turbo desligou");
  j.disparar("janela", "keydown", { code: "Space", key: " " });
  assert.equal(j.v.gameState.isTurboActive, true, "turbo pela barra de espaço");
  j.disparar("janela", "keyup", { code: "Space", key: " " });
  assert.equal(j.v.gameState.isTurboActive, false);
  assert.ok(container);
});

test("pausa e retomada funcionam em vista larga e a direção por toque é cancelada ao pausar", () => {
  const { j, ev, dir } = partidaCom(891, 411);

  ev("pointerdown", { clientX: 100 });
  assert.deepEqual(dir(), [true, false]);

  j.f.pausarJogo();
  assert.equal(j.v.gameState.isPaused, true);
  assert.deepEqual(dir(), [false, false], "pausar solta a direção");
  assert.equal(j.elementos.pauseScreen.classList.contains("hidden"), false);

  j.f.continuarJogo();
  assert.equal(j.v.gameState.isPaused, false);
  ev("pointerdown", { clientX: 800, pointerId: 2 });
  assert.deepEqual(dir(), [false, true]);
});

test("tela cheia: entrar/sair muda o layout sem perder a partida e o canvas continua ocupando a tela toda", () => {
  const { j } = partidaCom(891, 360);
  j.v.gameState.score = 321;

  // Sai da barra do navegador e entra em tela cheia: a janela fica mais alta
  j.contexto.innerHeight = 411;
  j.f.atualizarLayout();

  const l = j.v.tela.layout;
  assert.equal(j.v.gameState.score, 321);
  assert.equal(j.v.gameState.isGameOver, false);
  assert.ok(l.mundo.w / l.area.w > 0.999 && l.mundo.h >= 411 - l.barra.h - 1);
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
  assert.equal(typeof j.f.atualizarBotoesDeTelaCheia, "function");
  assert.doesNotThrow(() => j.f.atualizarBotoesDeTelaCheia());
});

// ============================================================
// 7. Redimensionar e girar com o jogo rodando
// ============================================================

test("redimensionar e girar com a partida rodando: a vista, o canvas interno e o céu acompanham, sem erro", () => {
  const j = carregarJogo({ pointerEvents: true, janela: { largura: 891, altura: 411, dpr: 2.625, toque: true } });
  j.f.iniciarPartida();
  j.v.gameState.score = 777;
  for (let q = 0; q < 10; q++) j.f.simular(1, 1000 + q * 16);

  const larguras = [];
  const sequencia = [[891, 411], [2560, 1080], [1024, 768], [640, 360], [5120, 1440], [411, 891], [891, 411]];

  for (const [w, h] of sequencia) {
    j.contexto.innerWidth = w;
    j.contexto.innerHeight = h;
    j.f.atualizarLayout();
    j.f.renderizar();

    const vista = j.v.VISTA.largura;
    larguras.push(Math.round(vista));
    const c = j.elementos.gameCanvas;
    assert.ok(vista >= 576 && vista <= 1440, `${w}×${h}: vista ${vista}`);
    assert.ok(Math.abs(c.width - vista * j.v.RENDER_SCALE) <= 1, `${w}×${h}: canvas interno ${c.width} × vista ${vista}`);
    assert.equal(c.height, 360 * j.v.RENDER_SCALE);
    assert.equal(j.avaliar("falhasDoJogo.length"), 0, `${w}×${h}`);
  }

  assert.ok(j.v.gameState.score >= 777 && !j.v.gameState.isGameOver, "a partida continua");
  assert.ok(new Set(larguras).size >= 4, `larguras diferentes: ${larguras}`);

  // Celular na vertical: pausa e mostra o aviso; ao girar de volta, o aviso some
  j.contexto.innerWidth = 411; j.contexto.innerHeight = 891; j.f.atualizarLayout();
  assert.equal(j.avaliar("document.body.classList.contains('retrato')"), true);
  j.contexto.innerWidth = 891; j.contexto.innerHeight = 411; j.f.atualizarLayout();
  assert.equal(j.avaliar("document.body.classList.contains('retrato')"), false);
});

test("mudar só a largura da vista (mesma escala) refaz o canvas interno e o céu em cache", () => {
  const j = carregarJogo({ janela: { largura: 1366, altura: 768, dpr: 1, toque: false } });
  j.f.renderizar();
  const antes = { w: j.elementos.gameCanvas.width, ceu: j.v.camadasCeu.fundo.width, escala: j.v.RENDER_SCALE };

  j.contexto.innerWidth = 2560; j.contexto.innerHeight = 768;       // mais larga; a altura (e a escala) não mudam
  j.f.atualizarLayout();

  assert.equal(j.v.RENDER_SCALE, antes.escala);
  assert.ok(j.elementos.gameCanvas.width > antes.w, "canvas interno mais largo");
  assert.equal(j.elementos.gameCanvas.width, Math.round(j.v.VISTA.largura * j.v.RENDER_SCALE));
  assert.notEqual(j.v.camadasCeu, null, "o céu foi refeito (loop parado desenha de novo)");
  assert.ok(j.v.camadasCeu.fundo.width > antes.ceu);
});

test("a escala de renderização considera a largura lógica da vista (nítido, sem passar do teto)", () => {
  const j = carregarJogo();
  // Vista de 640: 1280 px físicos = 2×  | Vista de 1280: os mesmos 1280 px = 1×
  assert.equal(j.f.escolherEscalaDeRenderizacao(1280, 1, 2), 2);
  assert.equal(j.f.escolherEscalaDeRenderizacao(1280, 1, 2, 1280), 1);
  assert.equal(j.f.escolherEscalaDeRenderizacao(2560, 1, 2, 1280), 2);
  assert.equal(j.f.escolherEscalaDeRenderizacao(5000, 1, 2, 1280), 2, "teto de qualidade");
  assert.equal(j.f.escolherEscalaDeRenderizacao(100, 1, 2, 1280), 1, "nunca abaixo de 1×");
  assert.equal(j.f.escolherEscalaDeRenderizacao(1280, 1, 2), j.f.escolherEscalaDeRenderizacao(1280, 1, 2, 640), "padrão = vista de 640");
});

// ============================================================
// 8. Nada fora do escopo mudou: física, colisões, pontuação, power-ups e balanceamento
// ============================================================

// Roteiro fixo de direção/turbo; devolve um retrato do estado final da partida
function rodarPartida(largura, altura, quadros = 1500) {
  const j = carregarJogo({ janela: { largura, altura, dpr: 1, toque: false } });
  j.semente(2026);
  j.f.iniciarPartida();
  j.semente(2026);

  for (let q = 0; q < quadros && !j.v.gameState.isGameOver; q++) {
    j.v.input.left = q % 200 >= 30 && q % 200 < 90;
    j.v.input.right = q % 200 >= 110 && q % 200 < 170;
    if (q % 400 === 300) j.f.ativarTurbo();
    if (q % 400 === 340) j.f.desativarTurbo();
    j.f.simular(1, 1000 + q * (1000 / 60));
  }

  const v = j.v;
  return JSON.stringify({
    x: v.player.worldX.toFixed(9), steer: v.player.steer.toFixed(9), score: v.gameState.score.toFixed(6),
    velocidade: v.gameState.gameSpeed.toFixed(9), distancia: v.gameState.worldDistance.toFixed(9),
    turbo: v.gameState.turboEnergy.toFixed(6), nivel: v.gameState.nivel, over: v.gameState.isGameOver,
    obst: v.obstacles.map((o) => [o.type, o.worldX.toFixed(6), o.z.toFixed(6)]),
    powerups: { ...v.powerUps }, combo: v.combo.sequencia,
  });
}

test("física, colisões, pontuação, combo, power-ups e balanceamento idênticos em vistas de 576, 687, 892 e 1328", () => {
  const referencia = rodarPartida(1366, 768);          // vista ~687
  const parsed = JSON.parse(referencia);
  assert.ok(Number(parsed.distancia) > 5, "a partida realmente andou");

  for (const [w, h] of [[1000, 700], [2560, 1080], [5120, 1440], [891, 411]]) {
    assert.equal(rodarPartida(w, h), referencia, `${w}×${h}`);
  }
});

test("o jogador não depende da vista: mesma faixa, mesmos limites laterais e mesma velocidade lateral", () => {
  const dados = (largura) => {
    const j = carregarJogo({ janela: { largura, altura: 700, dpr: 1, toque: false } });
    j.novaPartida();
    j.v.input.left = true;
    for (let q = 0; q < 200; q++) j.f.simular(1, 1000 + q * 16);
    const x = j.v.player.worldX;
    return { x, speedX: j.v.player.speedX, speedY: j.v.player.speedY, w: j.v.PLAYER_WORLD_WIDTH };
  };

  assert.deepEqual(dados(640), dados(2560));
  assert.deepEqual(dados(1366), dados(5120));
});

test("valores do jogo intactos na 3.7.0: hitbox, velocidade, power-ups, geometria da pista e câmera", () => {
  const j = carregarJogo();
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.avaliar("WORLD_SPEED_FACTOR"), 0.023);
  assert.equal(j.v.TIPOS_DE_POWERUP.nitro.energia, 40);
  assert.equal(j.v.LANE_COUNT, 3);
  assert.equal(j.avaliar("ROAD_HORIZON"), 118);
  assert.equal(j.avaliar("CAMERA_SCALE"), 175);
  assert.equal(j.avaliar("CAMERA_FOLLOW"), 0.4);
  assert.equal(j.avaliar("Z_FAR"), 38);
  assert.equal(j.v.PLAYER_WORLD_WIDTH, 0.54);
  assert.equal(j.avaliar("ENEMY_WORLD_WIDTH"), 0.5);
  assert.equal(j.avaliar("VERSAO_DO_JOGO"), "3.7.0");
});

test("física e colisão não leem a largura da vista: nenhum arquivo de lógica usa VISTA nem GAME_WIDTH", () => {
  const logica = [
    "js/game/reset.js", "js/game/state.js", "js/obstaculos/colisao.js", "js/obstaculos/movimento.js",
    "js/obstaculos/comportamentos.js", "js/obstaculos/criacao.js", "js/obstaculos/faixas.js", "js/sistemas/pontos.js",
    "js/sistemas/forca-lateral.js", "js/sistemas/derrapagem.js", "js/sistemas/odometro.js", "js/combo/pontuacao.js",
    "js/combo/deteccao.js", "js/quase-colisao/deteccao.js", "js/quase-colisao/pontuacao.js", "js/powerups/efeitos.js",
    "js/powerups/geracao.js", "js/powerups/itens.js", "js/powerups/parametros.js", "js/dificuldade/diretor.js",
    "js/dificuldade/niveis.js", "js/dificuldade/padroes.js", "js/entities.js", "js/input.js", "js/audio/gerenciador.js",
  ];

  for (const arquivo of logica) {
    const texto = lerArquivo(arquivo).split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    assert.doesNotMatch(texto, /\bVISTA\b|\bGAME_WIDTH\b/, `${arquivo} não deve depender da largura da tela`);
  }

  // Em loop.js só o flash de tela (desenho) lê a vista
  const loop = lerArquivo("js/game/loop.js");
  assert.equal((loop.match(/VISTA\.largura/g) || []).length, 1);
  assert.match(loop, /ctx\.fillRect\(0, 0, VISTA\.largura, GAME_HEIGHT\)/);
});

test("nenhum desenho horizontal usa mais a largura fixa de 640 (só a vista) e nenhum CSS força o canvas por esticamento", () => {
  const desenho = scriptsDoIndex().filter((s) => !/^js\/(config|layout\/vista|idiomas)/.test(s));
  // calculo/responsivo e o cenário extra só usam a largura-base como referência de comparação
  const permitidos = new Set(["js/layout/calculo.js", "js/layout/responsivo.js", "js/cenarios/lateral-ampliado.js"]);

  for (const arquivo of desenho) {
    const texto = lerArquivo(arquivo).split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    if (permitidos.has(arquivo)) continue;
    assert.doesNotMatch(texto, /\bGAME_WIDTH\b/, `${arquivo} deve usar VISTA.largura`);
  }

  const layout = lerArquivo("css/estilos/layout.css");
  assert.match(layout, /#gameCanvas \{[^}]*object-fit:\s*fill/);
  assert.doesNotMatch(layout, /transform:\s*scale|zoom:/, "o canvas não é aumentado por CSS");
});

// ============================================================
// 9. Estrutura do pacote
// ============================================================

test("index.html — vista.js vem logo após config.js e antes da perspectiva; cenário lateral após as construções", () => {
  const s = scriptsDoIndex();
  const pos = (n) => s.indexOf(n);

  assert.ok(pos("js/layout/vista.js") > pos("js/config.js"));
  assert.ok(pos("js/layout/vista.js") < pos("js/pista/perspectiva.js"));
  assert.ok(pos("js/cenarios/lateral-ampliado.js") > pos("js/cenarios/vegetacao.js"));
  assert.ok(pos("js/cenarios/lateral-ampliado.js") < pos("js/cenarios/gerenciador-paisagem.js"));
  assert.ok(pos("js/layout/calculo.js") > pos("js/layout/vista.js"));
  assert.equal(new Set(s).size, s.length, "nenhum script carregado duas vezes");
});

test("versão 3.7.0 em todos os lugares: versao.js, package.json, ?v= do index.html e LEIA-ME", () => {
  const html = lerArquivo("index.html");
  const versoes = new Set([...html.matchAll(/\?v=([\w.]+)"/g)].map((m) => m[1]));

  assert.deepEqual([...versoes], ["3.7.0"]);
  assert.equal(carregarJogo().avaliar("VERSAO_DO_JOGO"), "3.7.0");
  assert.equal(JSON.parse(lerArquivo("package.json")).version, "3.7.0");
  assert.match(lerArquivo("js/LEIA-ME.md"), /3\.6\.0/);
  assert.match(lerArquivo("js/LEIA-ME.md"), /vista\.js/);
});

test("CSS — o turbo é uma área circular invisível: sem fundo, sem borda, sem texto e com alvo grande", () => {
  const l = lerArquivo("css/estilos/layout.css");
  const m = lerArquivo("css/estilos/menus.css");
  const base = m.match(/\n#turboBtn \{[^}]*\}/)[0];

  assert.match(base, /border:\s*0/);
  assert.match(base, /border-radius:\s*50%/);
  assert.match(base, /background:\s*transparent/);
  assert.doesNotMatch(m, /#ffcc00|#9b650d|#ffe45c/, "cores do botão laranja removidas");
  assert.match(l, /bottom:\s*max\(0px, calc\(52px \* var\(--px, 1\) - var\(--turbo-toque\) \/ 2\)\)/);
  assert.match(l, /#game-container\[data-layout\] #mobile-controls \{[^}]*display:\s*block/);
});

test("o layout escreve --px e data-layout=cheio na página e posiciona o mundo e o turbo sobre toda a área", () => {
  const j = carregarJogo({ janela: { largura: 891, altura: 411, dpr: 2.625, toque: true } });
  const c = j.elementos["game-container"];
  const l = j.v.tela.layout;

  assert.equal(c.getAttribute("data-layout"), "cheio");
  assert.ok(Math.abs(Number(c.style["--px"]) - l.pxPorUnidade) < 1e-3);
  assert.equal(c.style["--lateral"], undefined, "variável do modo lateral removida");
  assert.equal(j.elementos["game-world"].style.left, `${l.mundo.x}px`);
  assert.equal(j.elementos["mobile-controls"].style.left, `${l.controles.x}px`);
  assert.equal(j.elementos["mobile-controls"].style.width, `${l.mundo.w}px`);
  assert.equal(j.elementos["mobile-controls"].style.height, `${l.mundo.h}px`);
});
