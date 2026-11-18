/* js/recompensas/solicitar.js
   O FLUXO de uma recompensa: verifica → pergunta ao provedor se há anúncio → exibe → e SÓ SE o
   provedor confirmar a conclusão (concluido === true) confere de novo e concede.

   Resultado: Promise de { concedida, motivo, tipo }. Motivos de não concessão:
     tipo_invalido, em_andamento, ja_reservada, ja_usada, fora_de_hora   (regras do jogo)
     indisponivel, cancelado, erro                                       (anúncio)
     expirada                                                            (a corrida mudou durante o anúncio)
   Nenhum desses motivos atrapalha o jogo: quem chama apenas segue jogando.
*/

function resultadoDeRecompensa(tipo, concedida, motivo) {
  return concedida ? { tipo, concedida: true } : { tipo, concedida: false, motivo };
}

async function solicitarRecompensa(tipo) {
  const pode = verificarRecompensa(tipo);
  if (!pode.ok) return resultadoDeRecompensa(tipo, false, pode.motivo);

  const provedor = obterProvedorDeAnuncios();
  let disponivel = false;

  try {
    disponivel = provedor.disponivel(tipo) === true;
  } catch (erro) {
    disponivel = false;
  }

  if (!disponivel) return resultadoDeRecompensa(tipo, false, "indisponivel");

  // Daqui até o fim do anúncio nenhum outro pedido passa (impede duplicar e conceder em dobro)
  const partidaDoPedido = recompensas.partida;
  recompensas.emAndamento = tipo;
  if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();

  let confirmacao;

  try {
    confirmacao = await provedor.exibir(tipo);
  } catch (erro) {
    confirmacao = { concluido: false, motivo: "erro" };
  }

  recompensas.emAndamento = null;

  // Só o booleano true conta: "true" em texto, 1, objeto vazio ou undefined NÃO concedem
  if (!confirmacao || confirmacao.concluido !== true) {
    if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();
    return resultadoDeRecompensa(tipo, false, (confirmacao && confirmacao.motivo) || "cancelado");
  }

  // O estado pode ter mudado enquanto o anúncio rodava: confere outra vez antes de conceder
  const aindaPode = verificarRecompensa(tipo);
  if (recompensas.partida !== partidaDoPedido || !aindaPode.ok) {
    if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();
    return resultadoDeRecompensa(tipo, false, recompensas.partida !== partidaDoPedido ? "expirada" : aindaPode.motivo);
  }

  concederRecompensa(tipo);
  if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();

  return resultadoDeRecompensa(tipo, true);
}
