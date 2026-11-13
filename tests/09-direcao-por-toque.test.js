// Versão 3.5.0: direção por toque em duas zonas invisíveis (metade esquerda / metade direita)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, RAIZ } = require("./helpers/carregar-jogo");
const { obstaculoNoJogador } = require("./helpers/apoio");

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const MODOS = ["pointer", "toque"];

// Alvos de toque simulados: o canvas/pista não tem "toque próprio"; botões e menus têm
const NA_PISTA = { closest: () => null };
const EM_BOTAO = { closest: (sel) => (/button/.test(sel) ? {} : null) };
const EM_MENU = { closest: (sel) => (/\.screen/.test(sel) ? {} : null) };

// Jogo carregado já com a partida rodando e uma tela de `largura` px
function partida(modo, largura = 844, extras = {}) {
  const j = carregarJogo({ pointerEvents: modo === "pointer", janela: { largura, altura: 390, toque: true }, ...extras });
  const container = j.elementos["game-container"];
  container.clientWidth = largura;
  j.f.iniciarPartida();
  j.quadros.pendentes.length = 0;

  // Um "dedo" simulado, igual nos dois modos de evento
  const dedo = {
    descer(id, x, alvo = NA_PISTA, tipo = "touch") {
      return modo === "pointer"
        ? j.disparar(container, "pointerdown", { pointerId: id, pointerType: tipo, clientX: x, target: alvo, button: 0 })
        : j.disparar(container, "touchstart", { changedTouches: [{ identifier: id, clientX: x, target: alvo }] });
    },
    mover(id, x, tipo = "touch") {
      return modo === "pointer"
        ? j.disparar(container, "pointermove", { pointerId: id, pointerType: tipo, clientX: x })
        : j.disparar(container, "touchmove", { changedTouches: [{ identifier: id, clientX: x }] });
    },
    subir(id) {
      return modo === "pointer"
        ? j.disparar("janela", "pointerup", { pointerId: id, pointerType: "touch" })
        : j.disparar("janela", "touchend", { changedTouches: [{ identifier: id }] });
    },
    cancelar(id) {
      return modo === "pointer"
        ? j.disparar("janela", "pointercancel", { pointerId: id, pointerType: "touch" })
        : j.disparar("janela", "touchcancel", { changedTouches: [{ identifier: id }] });
    },
  };

  const dir = () => [j.v.input.left, j.v.input.right];

  return { j, container, dedo, dir, largura };
}

// ============================================================
// Zonas: pressionar, manter, soltar
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] metade esquerda vira para a esquerda; levantar o dedo para na hora`, () => {
    const { dedo, dir } = partida(modo);
    assert.deepEqual(dir(), [false, false]);
    dedo.descer(1, 100);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] metade direita vira para a direita; levantar o dedo para na hora`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 700);
    assert.deepEqual(dir(), [false, true]);
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] manter o dedo mantém a direção por vários quadros; um toque curto dura só o toque`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    for (let q = 0; q < 30; q++) j.f.simular(1, 1000 + q * 16.6667);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(1);
    const x = j.v.player.worldX;
    for (let q = 30; q < 60; q++) j.f.simular(1, 1000 + q * 16.6667);
    assert.deepEqual(dir(), [false, false]);
    assert.ok(Math.abs(j.v.player.worldX - x) < 1.5, "o carro para de ser empurrado ao soltar");
  });

  test(`[${modo}] o meio exato pertence à metade direita; um pixel antes, à esquerda (várias larguras de tela)`, () => {
    for (const largura of [568, 640, 740, 812, 844, 891, 915, 932, 1024, 1366, 1536, 1920]) {
      const { dedo, dir } = partida(modo, largura);
      const meio = largura / 2;
      dedo.descer(1, meio - 1); assert.deepEqual(dir(), [true, false], `${largura}: meio-1`); dedo.subir(1);
      dedo.descer(2, meio);     assert.deepEqual(dir(), [false, true], `${largura}: meio`);   dedo.subir(2);
      dedo.descer(3, 0);        assert.deepEqual(dir(), [true, false], `${largura}: borda esquerda`); dedo.subir(3);
      dedo.descer(4, largura - 1); assert.deepEqual(dir(), [false, true], `${largura}: borda direita`); dedo.subir(4);
      assert.deepEqual(dir(), [false, false]);
    }
  });

  test(`[${modo}] a divisão usa a área do jogo, mesmo com deslocamento (barras laterais, áreas seguras)`, () => {
    const { container, dedo, dir } = partida(modo, 800);
    container.getBoundingClientRect = () => ({ left: 100, top: 0, width: 600, height: 360 });   // meio em x = 400
    dedo.descer(1, 399); assert.deepEqual(dir(), [true, false]); dedo.subir(1);
    dedo.descer(2, 400); assert.deepEqual(dir(), [false, true]); dedo.subir(2);
    dedo.descer(3, 5);   assert.deepEqual(dir(), [true, false], "toque na lateral fora do canvas também dirige"); dedo.subir(3);
  });
}

// ============================================================
// Alternar de zona durante a partida
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] arrastar o dedo de uma metade para a outra troca a direção sem levantá-lo`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    assert.deepEqual(dir(), [true, false]);
    dedo.mover(1, 300);                       // ainda na esquerda
    assert.deepEqual(dir(), [true, false]);
    dedo.mover(1, 600);                       // cruzou o meio
    assert.deepEqual(dir(), [false, true]);
    dedo.mover(1, 50);                        // voltou
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] levantar e tocar do outro lado também troca a direção`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100); dedo.subir(1);
    dedo.descer(2, 800);
    assert.deepEqual(dir(), [false, true]);
    dedo.subir(2); dedo.descer(3, 20);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(3);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] arrastar para fora da tela continua valendo pelo lado em que o dedo saiu`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 300);
    dedo.mover(1, -80);
    assert.deepEqual(dir(), [true, false]);
    dedo.mover(1, 5000);
    assert.deepEqual(dir(), [false, true]);
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });
}

// ============================================================
// Multitouch
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] dois dedos na mesma metade: levantar um não solta a direção, levantar o outro solta`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.descer(2, 200);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(1);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(2);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] um dedo em cada metade: os dois lados ficam ativos e se anulam; soltar um deixa o outro`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.descer(2, 700);
    assert.deepEqual(dir(), [true, true]);

    // mesmo efeito de segurar as duas setas do teclado: o carro não anda de lado
    const x = j.v.player.worldX;
    for (let q = 0; q < 20; q++) j.f.simular(1, 1000 + q * 16.6667);
    assert.ok(Math.abs(j.v.player.worldX - x) < 1e-6, "esquerda + direita se anulam");

    dedo.subir(1);
    assert.deepEqual(dir(), [false, true]);
    dedo.subir(2);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] segundo dedo do outro lado e depois cruzar: o estado acompanha cada dedo`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.descer(2, 700);
    dedo.mover(2, 200);                       // o dedo 2 foi para a esquerda: só esquerda
    assert.deepEqual(dir(), [true, false]);
    dedo.mover(1, 900);                       // o dedo 1 foi para a direita: esquerda (dedo 2) e direita (dedo 1)
    assert.deepEqual(dir(), [true, true]);
    dedo.cancelar(1);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(2);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] cinco dedos de uma vez e soltos fora de ordem não deixam a direção presa`, () => {
    const { dedo, dir } = partida(modo);
    [[1, 10], [2, 50], [3, 900], [4, 450], [5, 400]].forEach(([id, x]) => dedo.descer(id, x));
    assert.deepEqual(dir(), [true, true]);
    [3, 1, 5, 2].forEach((id) => dedo.subir(id));
    assert.deepEqual(dir(), [false, true], "só o dedo 4 (x=450, metade direita) sobrou");
    dedo.subir(4);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] soltar um dedo que nunca foi registrado não faz nada`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.subir(99);
    dedo.cancelar(98);
    assert.deepEqual(dir(), [true, false]);
    dedo.subir(1);
  });

  test(`[${modo}] o turbo continua funcionando junto com a direção (dedos independentes)`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);                                        // dirigindo para a esquerda
    j.v.gameState.turboEnergy = 100;

    // O botão de turbo tem o próprio ouvinte; o dedo dele não dirige (alvo é botão)
    const resp = dedo.descer(2, 700, EM_BOTAO);
    assert.deepEqual(dir(), [true, false], "dedo no botão de turbo não vira para a direita");
    assert.equal(resp.padraoImpedido, false, "o módulo de direção não consome o toque do botão");

    j.disparar(j.elementos.turboBtn, "pointerdown", { pointerId: 2, button: 0 });
    assert.equal(j.v.gameState.isTurboActive, true);
    assert.deepEqual(dir(), [true, false]);

    j.disparar(j.elementos.turboBtn, "pointerup", { pointerId: 2 });
    assert.equal(j.v.gameState.isTurboActive, false);
    assert.deepEqual(dir(), [true, false], "soltar o turbo não solta a direção");
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });
}

// ============================================================
// O que NÃO dirige
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] toques em botões (pausa, tela cheia, turbo) e em menus não dirigem`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 100, EM_BOTAO);
    dedo.descer(2, 700, EM_BOTAO);
    dedo.descer(3, 100, EM_MENU);
    assert.deepEqual(dir(), [false, false]);
    dedo.mover(1, 50); dedo.mover(3, 700);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] sem partida (menu inicial) o toque não dirige nada`, () => {
    const j = carregarJogo({ pointerEvents: modo === "pointer" });
    const container = j.elementos["game-container"];
    const resp = modo === "pointer"
      ? j.disparar(container, "pointerdown", { pointerId: 1, pointerType: "touch", clientX: 100, target: NA_PISTA })
      : j.disparar(container, "touchstart", { changedTouches: [{ identifier: 1, clientX: 100, target: NA_PISTA }] });
    assert.deepEqual([j.v.input.left, j.v.input.right], [false, false]);
    assert.equal(resp.padraoImpedido, false);
  });

  test(`[${modo}] depois do fim de jogo o toque não dirige mais`, () => {
    const { j, dedo, dir } = partida(modo);
    j.f.iniciarBatida(obstaculoNoJogador(j, "civilian"));
    assert.equal(j.v.gameState.isGameOver, true);
    dedo.descer(1, 100);
    assert.deepEqual(dir(), [false, false]);
  });
}

test("o mouse não dirige (o computador segue com o teclado), mas caneta e toque sim", () => {
  const { dedo, dir } = partida("pointer");
  dedo.descer(1, 100, NA_PISTA, "mouse");
  dedo.mover(1, 700, "mouse");
  assert.deepEqual(dir(), [false, false]);
  dedo.descer(2, 100, NA_PISTA, "pen");
  assert.deepEqual(dir(), [true, false]);
  dedo.subir(2);
  dedo.descer(3, 700, NA_PISTA, "touch");
  assert.deepEqual(dir(), [false, true]);
});

// ============================================================
// Cancelamento: pausa, fim de jogo, foco, saída, reinício
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] pausar cancela a direção; dedo que continua apertado não volta a dirigir; toques na pausa são ignorados`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.descer(2, 700);
    assert.deepEqual(dir(), [true, true]);

    j.f.pausarJogo();
    assert.deepEqual(dir(), [false, false]);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);

    dedo.mover(1, 150);                       // dedo antigo ainda na tela, andando
    dedo.descer(3, 100);                      // toque novo durante a pausa
    assert.deepEqual(dir(), [false, false]);

    dedo.subir(1); dedo.subir(2); dedo.subir(3);
    j.f.continuarJogo();
    assert.deepEqual(dir(), [false, false], "ao retomar, ninguém está dirigindo");
    dedo.descer(4, 700);
    assert.deepEqual(dir(), [false, true], "um toque novo volta a dirigir");
  });

  test(`[${modo}] fim de jogo (batida) cancela a direção`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 700);
    assert.deepEqual(dir(), [false, true]);
    j.f.iniciarBatida(obstaculoNoJogador(j, "civilian"));
    assert.deepEqual(dir(), [false, false]);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] falha inesperada no loop também cancela a direção`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    j.f.tratarFalhaNoLoop(new Error("falha de teste"));
    assert.deepEqual(dir(), [false, false]);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);
  });

  test(`[${modo}] sair para o menu e reiniciar a partida cancelam a direção`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    j.f.sairParaMenu();
    assert.deepEqual(dir(), [false, false]);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);

    j.f.iniciarPartida();
    dedo.descer(2, 700);
    assert.deepEqual(dir(), [false, true]);
    j.f.iniciarPartida();                      // JOGAR NOVAMENTE com o dedo ainda apertado
    assert.deepEqual(dir(), [false, false]);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);
  });

  test(`[${modo}] perder o foco, esconder a aba e fechar a página cancelam a direção`, () => {
    for (const evento of ["blur", "pagehide", "visibilitychange"]) {
      const { j, dedo, dir } = partida(modo);
      dedo.descer(1, 100);
      assert.deepEqual(dir(), [true, false], evento);
      if (evento === "visibilitychange") {
        j.avaliar("document.hidden = true");
        j.disparar("document", "visibilitychange");
      } else {
        j.disparar("janela", evento);
      }
      assert.deepEqual(dir(), [false, false], evento);
      assert.equal(j.avaliar("direcaoToque.ativos.size"), 0, evento);
    }
  });

  test(`[${modo}] a aba voltando a ficar visível não cancela nada por si só`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    j.avaliar("document.hidden = false");
    j.disparar("document", "visibilitychange");
    assert.deepEqual(dir(), [true, false]);
  });

  test(`[${modo}] girar o celular para a vertical pausa a partida e cancela a direção`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    assert.deepEqual(dir(), [true, false]);
    j.avaliar("innerWidth = 390; innerHeight = 844");
    j.f.atualizarLayout();
    assert.equal(j.v.gameState.isPaused, true);
    assert.deepEqual(dir(), [false, false]);
  });
}

// ============================================================
// Dedo levantado fora do canvas / fora da página
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] levantar o dedo fora do canvas (ouvinte na janela) solta a direção`, () => {
    const { j, dedo, dir } = partida(modo);
    dedo.descer(1, 100);
    dedo.mover(1, -300);
    // o fim do toque chega à janela, não ao contêiner do jogo
    dedo.subir(1);
    assert.deepEqual(dir(), [false, false]);

    const janela = j.ouvintesDaJanela.filter((o) => (modo === "pointer" ? /^pointer(up|cancel)$/ : /^touch(end|cancel)$/).test(o.nome));
    assert.equal(janela.length, 2, "ouvintes de soltar e cancelar na janela");
    janela.forEach((o) => assert.equal(o.opcoes, true, "fase de captura: nenhum elemento consegue engolir o fim do toque"));
  });

  test(`[${modo}] toque cancelado pelo sistema (gesto, chamada, alerta) solta a direção`, () => {
    const { dedo, dir } = partida(modo);
    dedo.descer(1, 700);
    dedo.cancelar(1);
    assert.deepEqual(dir(), [false, false]);
  });

  test(`[${modo}] mesmo com a partida pausada ou encerrada, o fim do toque sempre limpa o registro do dedo`, () => {
    const { j, dedo } = partida(modo);
    dedo.descer(1, 100);
    j.f.pausarJogo();
    dedo.subir(1);
    assert.equal(j.avaliar("direcaoToque.ativos.size"), 0);
  });
}

// ============================================================
// Rolagem, zoom e gestos
// ============================================================

for (const modo of MODOS) {
  test(`[${modo}] toques que dirigem têm o comportamento padrão cancelado (sem rolagem nem zoom); o resto não é engolido`, () => {
    const { dedo } = partida(modo);
    assert.equal(dedo.descer(1, 100).padraoImpedido, true, "toque na pista");
    assert.equal(dedo.mover(1, 300).padraoImpedido, true, "arrastar");
    assert.equal(dedo.descer(2, 700, EM_BOTAO).padraoImpedido, false, "botão");
    assert.equal(dedo.descer(3, 700, EM_MENU).padraoImpedido, false, "menu");
    assert.equal(dedo.mover(99, 300).padraoImpedido, false, "dedo desconhecido");
  });
}

test("Touch Events: ouvintes de início e movimento não são passivos (senão preventDefault seria ignorado)", () => {
  const { container } = partida("toque");
  ["touchstart", "touchmove"].forEach((nome) => {
    const ouvinte = container.ouvintes.find((o) => o.nome === nome);
    assert.ok(ouvinte, nome);
    assert.deepEqual({ ...ouvinte.opcoes }, { passive: false }, nome);
  });
});

test("Pointer Events têm prioridade; sem eles o jogo usa Touch Events (e nunca os dois ao mesmo tempo)", () => {
  const nomes = (modo) => partida(modo).container.ouvintes.map((o) => o.nome);
  assert.ok(nomes("pointer").includes("pointerdown") && nomes("pointer").includes("pointermove"));
  assert.ok(!nomes("pointer").includes("touchstart"), "com Pointer Events não há ouvinte de touchstart");
  assert.ok(nomes("toque").includes("touchstart") && nomes("toque").includes("touchmove"));
  assert.ok(!nomes("toque").includes("pointerdown"), "sem Pointer Events não há ouvinte de pointerdown no contêiner");
});

test("pressão longa não abre o menu do navegador durante a corrida, e o gesto de pinça do Safari é bloqueado", () => {
  const { container } = partida("pointer");
  assert.equal(container.ouvintes.some((o) => o.nome === "contextmenu"), true);
  assert.equal(container.ouvintes.some((o) => o.nome === "gesturestart"), true);
  assert.equal(container.ouvintes.some((o) => o.nome === "gesturechange"), true);
  const { j, container: c2 } = partida("pointer");
  const durante = j.disparar(c2, "contextmenu");
  assert.equal(durante.padraoImpedido, true);
  j.f.sairParaMenu();
  assert.equal(j.disparar(c2, "contextmenu").padraoImpedido, false, "no menu o botão direito/pressão longa seguem normais");
  assert.equal(j.disparar(c2, "gesturestart").padraoImpedido, false);
});

test("CSS e viewport: sem rolagem, sem puxar-para-atualizar e sem zoom por gesto na corrida", () => {
  const base = lerArquivo("css/estilos/base.css");
  assert.match(base, /#game-container \{[^}]*touch-action:\s*none/);
  assert.doesNotMatch(base, /#game-container \{[^}]*touch-action:\s*manipulation/);
  assert.match(base, /html,\s*body \{[^}]*overscroll-behavior:\s*none/);
  assert.match(base, /html,\s*body \{[^}]*overflow:\s*hidden/);
  assert.match(lerArquivo("index.html"), /<meta name="viewport" content="[^"]*user-scalable=no[^"]*maximum-scale=1\.0[^"]*"|<meta name="viewport" content="[^"]*maximum-scale=1\.0[^"]*user-scalable=no[^"]*"/);
  assert.match(lerArquivo("index.html"), /viewport-fit=cover/);
});

// ============================================================
// Sem elementos visuais; botões removidos; turbo e interface preservados
// ============================================================

test("os botões de esquerda e direita foram removidos; turbo, pausa e tela cheia continuam", () => {
  const html = lerArquivo("index.html");
  assert.doesNotMatch(html, /id="leftBtn"|id="rightBtn"|◀|▶/);
  assert.match(html, /id="turboBtn"/);
  assert.match(html, /id="pauseBtn"/);
  assert.match(html, /id="fullscreenBtn"/);
  assert.match(html, /id="turbo-container"/);

  const j = carregarJogo();
  assert.equal(j.elementos.leftBtn, undefined);
  assert.equal(j.elementos.rightBtn, undefined);
  assert.ok(j.elementos.turboBtn && j.elementos.pauseBtn && j.elementos.fullscreenBtn);
  assert.equal(j.avaliar("typeof leftBtn"), "undefined");
  assert.equal(j.avaliar("typeof rightBtn"), "undefined");
});

test("nenhum CSS carregado ainda fala dos botões removidos, e os textos de acessibilidade sobrando também saíram", () => {
  for (const arquivo of ["base", "menus", "paisagem", "hud", "carregamento", "layout"]) {
    assert.doesNotMatch(lerArquivo(`css/estilos/${arquivo}.css`), /#leftBtn|#rightBtn/, arquivo);
  }
  for (const cod of ["pt", "en", "es"]) {
    const fonte = lerArquivo(`js/idiomas/textos/${cod}.js`);
    assert.doesNotMatch(fonte, /\besquerda:|\bdireita:/, cod);
  }
});

test("a direção por toque não cria nenhum elemento, ícone ou texto na tela", () => {
  const fonte = lerArquivo("js/controles/direcao-toque.js");
  assert.doesNotMatch(fonte, /createElement|innerHTML|textContent|appendChild|\.style\.|classList/);
  const j = carregarJogo();
  const antes = j.todos.length;
  j.f.iniciarPartida();
  const dedo = j.disparar(j.elementos["game-container"], "touchstart", { changedTouches: [{ identifier: 1, clientX: 100, target: NA_PISTA }] });
  assert.equal(j.todos.length, antes, "tocar na tela não adiciona elementos");
  assert.equal(dedo.padraoImpedido, true);
});

test("o turbo continua no mesmo lugar do layout: faixa inferior centralizada e lateral à direita", () => {
  const l = lerArquivo("css/estilos/layout.css");
  assert.match(l, /\[data-layout="inferior"\] #mobile-controls \{[^}]*justify-content:\s*center/);
  assert.match(l, /\[data-layout="inferior"\] #turboBtn \{/);
  assert.match(l, /\[data-layout="inferior"\] #turboBtn \{[^}]*flex:\s*0 0 calc\(\(100% - 24px \* var\(--ui, 1\)\) \* 0\.41176\)/, "o turbo mantém a largura que tinha ao dividir a faixa com as setas");
  assert.match(l, /\[data-layout="lateral"\] #turboBtn \{[^}]*margin-left:\s*auto/);
  assert.match(l, /#mobile-controls \{[^}]*pointer-events:\s*none/);
  assert.match(l, /#mobile-controls button \{[^}]*pointer-events:\s*auto/);
  assert.match(lerArquivo("css/estilos/menus.css"), /#turboBtn \{/);
});

// ============================================================
// O teclado e o jogo não mudam
// ============================================================

test("teclado: setas e A/D continuam dirigindo, e não se misturam com o toque", () => {
  const { j, dedo, dir } = partida("pointer");
  const tecla = (nome, key) => j.disparar("janela", nome, { key, code: key });

  tecla("keydown", "ArrowLeft");
  assert.deepEqual(dir(), [true, false]);
  tecla("keyup", "ArrowLeft");
  assert.deepEqual(dir(), [false, false]);
  tecla("keydown", "d");
  assert.deepEqual(dir(), [false, true]);
  tecla("keyup", "d");

  // Toque e teclado ao mesmo tempo: soltar o dedo não apaga a tecla de outro lado
  tecla("keydown", "ArrowLeft");
  dedo.descer(1, 700);
  assert.deepEqual(dir(), [true, true]);
  dedo.subir(1);
  assert.deepEqual(dir(), [true, false], "a seta esquerda continua apertada");
  tecla("keyup", "ArrowLeft");
  assert.deepEqual(dir(), [false, false]);
});

test("teclado: o trecho de teclas de input.js está idêntico ao da versão anterior (só os botões de seta saíram)", () => {
  const fonte = lerArquivo("js/input.js");
  for (const trecho of [
    'if (key === "arrowleft" || key === "a") {\n    input.left = true;',
    'if (key === "arrowright" || key === "d") {\n    input.right = true;',
    'if (e.code === "Space" && !e.repeat) {\n    ativarTurbo();',
    'if ((key === "p" || key === "escape") && !e.repeat) {',
    'window.addEventListener("blur", () => {\n  input.left = false;\n  input.right = false;\n  desativarTurbo();',
  ]) assert.ok(fonte.includes(trecho), trecho.split("\n")[0]);
  assert.doesNotMatch(fonte, /configurarBotaoMovimento|leftBtn|rightBtn/);
  assert.match(fonte, /if \(turboBtn\) \{/);
});

test("a direção por toque produz exatamente o mesmo movimento que o teclado (física intacta)", () => {
  const rodar = (comando) => {
    const j = carregarJogo({ pointerEvents: true });
    j.semente(2026);
    j.f.iniciarPartida();
    j.semente(2026);
    j.elementos["game-container"].clientWidth = 844;
    for (let q = 0; q < 900 && !j.v.gameState.isGameOver; q++) {
      comando(j, q);
      j.f.simular(1, 1000 + q * (1000 / 60));
    }
    const v = j.v;
    return JSON.stringify({ x: v.player.worldX.toFixed(9), steer: v.player.steer.toFixed(9), score: v.gameState.score.toFixed(6),
      distancia: j.avaliar("distanciaPercorridaKm").toFixed(9), over: v.gameState.isGameOver, obst: v.obstacles.map((o) => [o.type, o.z.toFixed(4)]) });
  };

  // Mesmo roteiro: esquerda nos quadros 20–80, direita nos 120–200
  const porTeclado = (j, q) => { j.v.input.left = q >= 20 && q < 80; j.v.input.right = q >= 120 && q < 200; };
  const porToque = (j, q) => {
    const c = j.elementos["game-container"];
    const ev = (n, e) => j.disparar(n === "up" ? "janela" : c, n === "up" ? "pointerup" : n === "down" ? "pointerdown" : "pointermove", { pointerId: 1, pointerType: "touch", target: NA_PISTA, ...e });
    if (q === 20) ev("down", { clientX: 100 });
    if (q === 80) ev("up", {});
    if (q === 120) ev("down", { clientX: 700 });
    if (q === 200) ev("up", {});
  };

  assert.equal(rodar(porToque), rodar(porTeclado));
  assert.notEqual(rodar(porToque), rodar(() => {}), "o roteiro realmente move o carro");
});

test("sensibilidade da direção, hitbox, velocidade e valores do jogo seguem os mesmos", () => {
  const j = carregarJogo();
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.v.TIPOS_DE_POWERUP.nitro.energia, 40);
  assert.equal(j.avaliar("VERSAO_DO_JOGO"), "3.5.0");
  const loop = lerArquivo("js/game/loop.js");
  assert.match(loop, /if \(input\.left\) player\.worldX -= passo;/);
  assert.match(loop, /if \(input\.right\) player\.worldX \+= passo;/);
  assert.match(loop, /const alvo = \(input\.right \? 1 : 0\) - \(input\.left \? 1 : 0\);/);
});

// ============================================================
// Resoluções de celular e notebook (layout real do jogo, com toque)
// ============================================================

const TELAS = [
  [568, 320], [640, 360], [740, 360], [812, 375], [844, 390], [891, 411], [915, 412], [932, 430], [960, 540],
  [1024, 768], [1280, 800], [1366, 768], [1536, 864], [1920, 1080],
];

test("em 14 resoluções de celular, tablet e notebook com toque: zonas na metade, turbo e layout intactos", () => {
  for (const [largura, altura] of TELAS) {
    const j = carregarJogo({ pointerEvents: true, janela: { largura, altura, toque: true } });
    const container = j.elementos["game-container"];
    container.clientWidth = largura;
    j.f.atualizarLayout();
    j.f.iniciarPartida();
    const tag = `${largura}x${altura}`;

    const ev = (nome, e) => j.disparar(nome === "pointerup" ? "janela" : container, nome, { pointerId: 1, pointerType: "touch", target: NA_PISTA, ...e });
    ev("pointerdown", { clientX: largura / 2 - 1 }); assert.deepEqual([j.v.input.left, j.v.input.right], [true, false], tag);
    ev("pointermove", { clientX: largura / 2 + 1 }); assert.deepEqual([j.v.input.left, j.v.input.right], [false, true], tag);
    ev("pointerup", {});                            assert.deepEqual([j.v.input.left, j.v.input.right], [false, false], tag);

    const modo = container.getAttribute("data-layout");
    assert.ok(["lateral", "inferior", "mesa"].includes(modo), `${tag}: layout ${modo}`);
    assert.equal(container.getAttribute("data-toque"), "sim", tag);
    assert.ok(j.elementos.turboBtn, tag);
    assert.equal(j.avaliar("falhasDoJogo.length"), 0, tag);
  }
});

// Gerado a partir do calcularLayout da 3.4.0 (toque, dpr 2, sem áreas seguras): modo, mundo, controles e barra
const LAYOUT_DA_3_4_0 = {"568x320":{"modo":"inferior","mundo":[80,34.25,408,229.5],"controles":[0,264,568,56],"barra":[0,0,568,34]},"640x360":{"modo":"inferior","mundo":[84,37.25,472,265.5],"controles":[0,304,640,56],"barra":[0,0,640,36]},"740x360":{"modo":"lateral","mundo":[106,49.5,528,297],"controles":[0,36,740,324],"barra":[0,0,740,36]},"812x375":{"modo":"lateral","mundo":[110,40,592,333],"controles":[0,38,812,337],"barra":[0,0,812,38]},"844x390":{"modo":"lateral","mundo":[114,41.25,616,346.5],"controles":[0,39,844,351],"barra":[0,0,844,39]},"891x411":{"modo":"lateral","mundo":[121.5,43.75,648,364.5],"controles":[0,41,891,370],"barra":[0,0,891,41]},"915x412":{"modo":"lateral","mundo":[129.5,42,656,369],"controles":[0,41,915,371],"barra":[0,0,915,41]},"932x430":{"modo":"lateral","mundo":[126,45.25,680,382.5],"controles":[0,43,932,387],"barra":[0,0,932,43]},"960x540":{"modo":"inferior","mundo":[116,53.75,728,409.5],"controles":[0,465,960,75],"barra":[0,0,960,52]},"1024x768":{"modo":"inferior","mundo":[0,84.5,1024,576],"controles":[0,693,1024,75],"barra":[0,0,1024,52]},"1280x800":{"modo":"inferior","mundo":[44,53.25,1192,670.5],"controles":[0,725,1280,75],"barra":[0,0,1280,52]},"1366x768":{"modo":"inferior","mundo":[115,53,1136,639],"controles":[0,693,1366,75],"barra":[0,0,1366,52]},"1536x864":{"modo":"inferior","mundo":[116,53.75,1304,733.5],"controles":[0,789,1536,75],"barra":[0,0,1536,52]},"1920x1080":{"modo":"inferior","mundo":[116,53.75,1688,949.5],"controles":[0,1005,1920,75],"barra":[0,0,1920,52]}};

test("o layout calculado em 14 resoluções é idêntico ao da 3.4.0 (canvas, barra e área de controles)", () => {
  const j = carregarJogo();
  for (const [largura, altura] of TELAS) {
    const l = j.avaliar(`calcularLayout(${JSON.stringify({ largura, altura, toque: true, dpr: 2, seguro: { topo: 0, direita: 0, base: 0, esquerda: 0 } })})`);
    const arred = (r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 100) / 100);
    const esperado = LAYOUT_DA_3_4_0[`${largura}x${altura}`];
    assert.equal(l.modo, esperado.modo, `${largura}x${altura} modo`);
    assert.deepEqual(arred(l.mundo), esperado.mundo, `${largura}x${altura} mundo`);
    assert.deepEqual(arred(l.barra), esperado.barra, `${largura}x${altura} barra`);
    assert.deepEqual(l.controles ? arred(l.controles) : null, esperado.controles, `${largura}x${altura} controles`);
  }
});

test("pausa, retomada e tela cheia seguem funcionando com a direção por toque ligada", () => {
  const { j, dedo, dir } = partida("pointer");
  dedo.descer(1, 100);
  j.f.pausarJogo();
  assert.equal(j.v.gameState.isPaused, true);
  assert.equal(j.elementos.pauseScreen.classList.contains("hidden"), false);
  j.f.continuarJogo();
  assert.equal(j.v.gameState.isPaused, false);
  assert.equal(j.elementos.pauseScreen.classList.contains("hidden"), true);
  dedo.descer(2, 700);
  assert.deepEqual(dir(), [false, true]);

  assert.equal(typeof j.f.atualizarBotoesDeTelaCheia, "function");
  assert.doesNotThrow(() => j.f.atualizarBotoesDeTelaCheia());
  assert.doesNotThrow(() => j.disparar("document", "fullscreenchange"));
  assert.deepEqual(dir(), [false, true], "mudar para tela cheia não solta o dedo");
});
