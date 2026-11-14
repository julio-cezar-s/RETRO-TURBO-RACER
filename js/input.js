/* =====================================================
   RETRO TURBO RACER — CONTROLES
   Teclado e botão de turbo. A direção por toque fica em controles/direcao-toque.js.
===================================================== */

const input = {
  left: false,
  right: false,
};

// Referência do botão de turbo
const turboBtn = document.getElementById("turboBtn");

// =====================================================
// CONTROLE DO TURBO
// =====================================================

function ativarTurbo() {
  if (typeof gameState === "undefined") return;

  if (gameState.turboEnergy > 0) {
    gameState.isTurboActive = true;
  }
}

function desativarTurbo() {
  if (typeof gameState !== "undefined") {
    gameState.isTurboActive = false;
  }
}

// =====================================================
// TECLADO
// =====================================================

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "arrowup", "arrowdown"].includes(key)) {
    e.preventDefault();
  }

  if (key === "arrowleft" || key === "a") {
    input.left = true;
  }

  if (key === "arrowright" || key === "d") {
    input.right = true;
  }

  if (e.code === "Space" && !e.repeat) {
    ativarTurbo();
  }

  // Pausa: P ou Esc (somente com partida em andamento)
  if ((key === "p" || key === "escape") && !e.repeat) {
    if (typeof partidaAtiva === "function" && partidaAtiva()) {
      alternarPausa();
    }
  }
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toLowerCase();

  // Sem isto, no Firefox o Espaço soltava e "clicava" no último botão com foco
  if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
    e.preventDefault();
  }

  if (key === "arrowleft" || key === "a") {
    input.left = false;
  }

  if (key === "arrowright" || key === "d") {
    input.right = false;
  }

  if (e.code === "Space") {
    desativarTurbo();
  }
});

// =====================================================
// PERDA DE FOCO DA JANELA
// =====================================================

window.addEventListener("blur", () => {
  input.left = false;
  input.right = false;
  desativarTurbo();
});

// =====================================================
// BOTÃO DE TURBO
// =====================================================

if (turboBtn) {
  turboBtn.style.touchAction = "none";

  turboBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();

    if (e.button !== undefined && e.button !== 0) return;

    ativarTurbo();

    if (turboBtn.setPointerCapture) {
      turboBtn.setPointerCapture(e.pointerId);
    }
  });

  const soltarTurbo = (e) => {
    e.preventDefault();
    desativarTurbo();
  };

  turboBtn.addEventListener("pointerup", soltarTurbo);
  turboBtn.addEventListener("pointercancel", soltarTurbo);

  turboBtn.addEventListener("lostpointercapture", () => {
    desativarTurbo();
  });
}

console.log("Controles do jogo carregados.");
