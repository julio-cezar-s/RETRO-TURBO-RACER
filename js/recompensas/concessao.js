/* js/recompensas/concessao.js
   O QUE cada recompensa faz. Só é chamado por solicitar.js, depois da confirmação do anúncio.
   Reaproveita mecanismos que já existem (conta do nitro, invulnerabilidade do escudo): não cria
   física, velocidade nem pontuação novas.
*/

function concederRecompensa(tipo) {
  if (tipo === "turbo") {
    recompensas.turbo.reservada = true;        // vale na próxima corrida (veja reiniciarRecompensasDaPartida)
  } else if (tipo === "continuar") {
    recompensas.continuar.usada = true;
    continuarPartidaComProtecao();
  }
}

// ---------------------------------------------------------------------------
// TURBO +30: chamado a cada quadro, logo depois da conta do turbo (game/loop.js)
// Credita UMA vez por corrida, quando os 30 cabem inteiros no teto de 100.
// ---------------------------------------------------------------------------
function aplicarReservaDeTurbo() {
  const r = recompensas.turbo;

  if (!r.ativa || r.creditada) return;
  if (gameState.turboEnergy > RECOMPENSAS.turbo.creditarAbaixoDe) return;

  r.creditada = true;
  gameState.turboEnergy = Math.min(100, gameState.turboEnergy + RECOMPENSAS.turbo.energia);

  // Mesmo aviso flutuante e som do nitro, com o valor desta recompensa
  if (typeof emitirFeedbackDeColeta === "function" && typeof TIPOS_DE_POWERUP !== "undefined") {
    emitirFeedbackDeColeta({ ...TIPOS_DE_POWERUP.nitro, energia: RECOMPENSAS.turbo.energia });
  }

  if (typeof tocarSomDePowerUp === "function") tocarSomDePowerUp("nitro");
}

// ---------------------------------------------------------------------------
// CONTINUAR: tira o Game Over e dá proteção temporária
// ---------------------------------------------------------------------------

// A batida já gravou a pontuação nos recordes; ao continuar essa linha sai, para a mesma corrida não
// aparecer duas vezes (a pontuação final será gravada no próximo Game Over).
function registrarBatidaParaContinuacao(pontuacao) {
  recompensas.pontosNaBatida = Math.floor(pontuacao);
}

function desfazerRecordeDaBatida() {
  const pontos = recompensas.pontosNaBatida;
  if (!(pontos > 0) || typeof lerRecordes !== "function") return;

  try {
    const lista = lerRecordes();
    let alvo = -1;

    lista.forEach((r, i) => {
      if (r.pontos === pontos && (alvo < 0 || String(r.data) > String(lista[alvo].data))) alvo = i;
    });

    if (alvo < 0) return;

    lista.splice(alvo, 1);
    localStorage.setItem(CHAVE_RECORDES, JSON.stringify(lista));

    if (lista.length) localStorage.setItem(CHAVE_RECORDE_MAXIMO, String(Math.max(...lista.map((r) => r.pontos))));
    else localStorage.removeItem(CHAVE_RECORDE_MAXIMO);
  } catch (erro) {
    console.warn("Não foi possível ajustar o recorde ao continuar.", erro);
  }
}

function continuarPartidaComProtecao() {
  desfazerRecordeDaBatida();

  recompensas.continuar.oferecida = false;

  gameState.isGameOver = false;
  gameState.isPaused = false;
  gameState.isTurboActive = false;
  gameState.crashFrames = 0;
  gameState.flash = 0;
  gameState.tremor = 0;
  gameState.gameSpeed = gameState.baseSpeed;

  // Proteção temporária: a mesma janela em que o escudo, ao quebrar, ignora batidas
  powerUps.invulneravel = Math.max(powerUps.invulneravel, RECOMPENSAS.continuar.protecao);

  input.left = false;
  input.right = false;
  if (typeof cancelarDirecaoPorToque === "function") cancelarDirecaoPorToque();

  gameOverScreen?.classList.add("hidden");
  if (typeof odometroUltimoTimestamp !== "undefined") odometroUltimoTimestamp = null;

  iniciarLoop();
}
