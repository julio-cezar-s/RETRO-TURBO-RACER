/* js/controles/direcao-toque.js
   DIREÇÃO POR TOQUE: a área do jogo é dividida ao meio, sem nada desenhado na tela.
     - dedo parado na metade esquerda  → o carro vira para a esquerda
     - dedo parado na metade direita   → o carro vira para a direita
     - dedo levantado                  → a direção para na hora
   Arrastar o dedo de uma metade para a outra troca a direção sem levantá-lo.
   Vários dedos ao mesmo tempo funcionam (dois lados juntos se anulam, como no teclado).

   Este módulo só escreve em input.left / input.right (os mesmos usados pelo teclado):
   a física, a velocidade e a sensibilidade da direção não mudam. O botão de turbo e os
   demais botões continuam recebendo os próprios toques: toque em botão não dirige.

   Os comandos são cancelados ao pausar, reiniciar, sair, bater (fim de jogo), perder o
   foco ou esconder a página — veja cancelarDirecaoPorToque().
   Usa Pointer Events; sem eles, cai para Touch Events. O mouse não dirige (o computador
   continua com o teclado).
*/

const direcaoToque = {
  ativos: new Map(),      // id do dedo → "esquerda" | "direita"
  esquerda: false,        // o que o toque está mandando agora (para não apagar o que é do teclado)
  direita: false,
};

// ----- Zonas -----

// Faixa horizontal da área do jogo (o container cobre a tela toda)
function areaHorizontalDoJogo() {
  const container = document.getElementById("game-container");
  const caixa = container && container.getBoundingClientRect ? container.getBoundingClientRect() : null;

  if (caixa && caixa.width > 0) return { inicio: caixa.left, largura: caixa.width };

  return { inicio: 0, largura: window.innerWidth || 0 };
}

// Metade esquerda vira para a esquerda; do meio em diante, para a direita
function zonaDoToque(x) {
  const area = areaHorizontalDoJogo();

  return x < area.inicio + area.largura / 2 ? "esquerda" : "direita";
}

// Só dirige com a partida rodando: não pausada, não encerrada e sem menu aberto
function direcaoPorToqueDisponivel() {
  if (typeof partidaAtiva !== "function" || typeof gameState === "undefined") return false;

  return partidaAtiva() && !gameState.isPaused && !gameState.isGameOver;
}

// Botões (turbo, pausa, tela cheia) e menus têm o próprio toque
function alvoTemToqueProprio(alvo) {
  return !!(alvo && alvo.closest && alvo.closest("button, .screen, .modal"));
}

// ----- Estado -----

// Junta todos os dedos e escreve em input só quando algo do toque mudou
function aplicarDirecaoPorToque() {
  const zonas = Array.from(direcaoToque.ativos.values());
  const esquerda = zonas.includes("esquerda");
  const direita = zonas.includes("direita");

  if (esquerda !== direcaoToque.esquerda) {
    direcaoToque.esquerda = esquerda;
    input.left = esquerda;
  }

  if (direita !== direcaoToque.direita) {
    direcaoToque.direita = direita;
    input.right = direita;
  }
}

// Novo dedo. Devolve true se ele passou a dirigir (para o chamador bloquear rolagem e zoom).
function iniciarToqueDeDirecao(id, x, alvo) {
  if (!direcaoPorToqueDisponivel() || alvoTemToqueProprio(alvo)) return false;

  direcaoToque.ativos.set(id, zonaDoToque(x));
  aplicarDirecaoPorToque();

  return true;
}

// Dedo que andou: pode ter trocado de metade
function moverToqueDeDirecao(id, x) {
  if (!direcaoToque.ativos.has(id)) return false;

  // Se a partida parou (pausa, fim de jogo) enquanto o dedo estava na tela, solta tudo
  if (!direcaoPorToqueDisponivel()) {
    cancelarDirecaoPorToque();
    return false;
  }

  direcaoToque.ativos.set(id, zonaDoToque(x));
  aplicarDirecaoPorToque();

  return true;
}

// Dedo levantado (ou toque cancelado pelo sistema): sempre solta, em qualquer estado do jogo
function soltarToqueDeDirecao(id) {
  if (!direcaoToque.ativos.delete(id)) return false;

  aplicarDirecaoPorToque();

  return true;
}

// Solta todos os dedos e para a direção. Chamado ao pausar, reiniciar, sair, bater,
// perder o foco e esconder a página.
function cancelarDirecaoPorToque() {
  direcaoToque.ativos.clear();
  aplicarDirecaoPorToque();
}

// ----- Ligação com os eventos do navegador -----

function ligarPointerEvents(container) {
  const ehToque = (e) => e.pointerType !== "mouse";
  const idDe = (e) => `p${e.pointerId}`;

  container.addEventListener("pointerdown", (e) => {
    if (!ehToque(e)) return;

    if (iniciarToqueDeDirecao(idDe(e), e.clientX, e.target)) e.preventDefault();
  });

  container.addEventListener("pointermove", (e) => {
    if (!ehToque(e)) return;

    if (moverToqueDeDirecao(idDe(e), e.clientX)) e.preventDefault();
  });

  // Na janela e na fase de captura: levantar o dedo fora do canvas (ou fora da página) também solta
  const soltar = (e) => { soltarToqueDeDirecao(idDe(e)); };

  window.addEventListener("pointerup", soltar, true);
  window.addEventListener("pointercancel", soltar, true);
}

function ligarTouchEvents(container) {
  const cadaToque = (e, funcao) => {
    Array.from(e.changedTouches || []).forEach((t) => funcao(`t${t.identifier}`, t));
  };

  container.addEventListener("touchstart", (e) => {
    let dirigiu = false;

    cadaToque(e, (id, t) => { dirigiu = iniciarToqueDeDirecao(id, t.clientX, t.target) || dirigiu; });
    if (dirigiu) e.preventDefault();
  }, { passive: false });

  container.addEventListener("touchmove", (e) => {
    let dirigiu = false;

    cadaToque(e, (id, t) => { dirigiu = moverToqueDeDirecao(id, t.clientX) || dirigiu; });
    if (dirigiu) e.preventDefault();      // sem rolagem durante a corrida
  }, { passive: false });

  const soltar = (e) => { cadaToque(e, (id) => soltarToqueDeDirecao(id)); };

  window.addEventListener("touchend", soltar, true);
  window.addEventListener("touchcancel", soltar, true);
}

// Liga tudo. modo: "pointer" ou "toque" (Touch Events, quando não há Pointer Events)
function ligarDirecaoPorToque(modo) {
  const container = document.getElementById("game-container");

  if (!container) return;

  if (modo === "pointer") ligarPointerEvents(container);
  else ligarTouchEvents(container);

  // Pressão longa não abre menu de contexto, e o gesto de pinça do Safari não dá zoom na corrida
  container.addEventListener("contextmenu", (e) => {
    if (direcaoToque.ativos.size > 0 || direcaoPorToqueDisponivel()) e.preventDefault();
  });

  ["gesturestart", "gesturechange"].forEach((nome) => {
    container.addEventListener(nome, (e) => {
      if (direcaoPorToqueDisponivel()) e.preventDefault();
    });
  });

  // Perda de foco: nenhum dedo fica "preso" dirigindo
  window.addEventListener("blur", cancelarDirecaoPorToque);
  window.addEventListener("pagehide", cancelarDirecaoPorToque);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelarDirecaoPorToque();
  });
}

ligarDirecaoPorToque(typeof window.PointerEvent !== "undefined" ? "pointer" : "toque");
