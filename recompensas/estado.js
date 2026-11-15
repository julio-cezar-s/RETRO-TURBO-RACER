/* js/recompensas/estado.js
   O que já foi usado de cada recompensa. Tudo vale POR PARTIDA: resetGame() chama
   reiniciarRecompensasDaPartida() ao começar cada corrida.

   TURBO (+30): pedida ANTES da corrida (tela inicial). Ao concluir o anúncio fica "reservada" para
   a próxima corrida; ao começar a corrida passa a "ativa" e é creditada UMA vez (ver concessao.js).
   CONTINUAR: pedida DEPOIS do Game Over; no máximo uma vez por corrida.
*/

const recompensas = {
  turbo: {
    reservada: false,    // anúncio concluído, aguardando a próxima corrida
    ativa: false,        // vale para a corrida em andamento
    creditada: false,    // os +30 já foram somados nesta corrida
  },

  continuar: {
    oferecida: false,    // o Game Over terminou de aparecer e ainda dá para continuar
    usada: false,        // já continuou nesta corrida
  },

  emAndamento: null,     // tipo cujo anúncio está na tela (bloqueia pedidos duplicados)
  partida: 0,            // número da corrida: um anúncio que termina "atrasado" não vale para outra
  pontosNaBatida: 0,     // pontuação no instante da batida (ver concessao.js)
};

function reiniciarRecompensasDaPartida() {
  recompensas.partida++;

  // A recompensa de turbo comprada antes da corrida passa a valer agora
  recompensas.turbo.ativa = recompensas.turbo.reservada;
  recompensas.turbo.reservada = false;
  recompensas.turbo.creditada = false;

  recompensas.continuar.oferecida = false;
  recompensas.continuar.usada = false;

  recompensas.emAndamento = null;
  recompensas.pontosNaBatida = 0;

  if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();
}

// Pode pedir esta recompensa agora? Devolve { ok, motivo } (motivo só quando não pode)
function verificarRecompensa(tipo, { ignorarAndamento = false } = {}) {
  if (tipo !== "turbo" && tipo !== "continuar") return { ok: false, motivo: "tipo_invalido" };
  if (!ignorarAndamento && recompensas.emAndamento) return { ok: false, motivo: "em_andamento" };

  if (tipo === "turbo") {
    if (recompensas.turbo.reservada) return { ok: false, motivo: "ja_reservada" };
    if (partidaAtiva()) return { ok: false, motivo: "fora_de_hora" };      // só ANTES da corrida
    return { ok: true };
  }

  if (recompensas.continuar.usada) return { ok: false, motivo: "ja_usada" };
  if (!recompensas.continuar.oferecida || !gameState.isGameOver) return { ok: false, motivo: "fora_de_hora" };

  return { ok: true };
}
