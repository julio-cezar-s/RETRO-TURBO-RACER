/* js/recompensas/interface.js
   Os botões de recompensa (tela inicial e Game Over), as mensagens e a tela do anúncio simulado.
   Só mostra e liga; as regras ficam em estado.js / solicitar.js e o efeito em concessao.js.
   Textos pelo sistema de idiomas (chaves recompensas.*), como o resto do jogo.
*/

const MENSAGENS_DE_RECOMPENSA = {
  cancelado: "recompensas.aviso.cancelado",
  erro: "recompensas.aviso.cancelado",
  expirada: "recompensas.aviso.cancelado",
  indisponivel: "recompensas.aviso.indisponivel",
};

function elementoDaRecompensa(id) {
  return document.getElementById(id);
}

// A chave fica no elemento: se o idioma mudar, o texto acompanha
function definirTextoComChave(elemento, chave) {
  if (!elemento) return;

  if (!chave) {
    elemento.removeAttribute("data-i18n");
    elemento.textContent = "";
    elemento.classList.add("hidden");
    return;
  }

  elemento.setAttribute("data-i18n", chave);
  elemento.textContent = traduzir(chave);
  elemento.classList.remove("hidden");
}

const avisosDeRecompensa = { turbo: null, continuar: null };

function atualizarInterfaceDeRecompensas() {
  const provedor = obterProvedorDeAnuncios();
  const ocupado = !!recompensas.emAndamento;

  const disponivel = (tipo) => {
    try { return provedor.disponivel(tipo) === true; } catch (erro) { return false; }
  };

  // ----- TURBO (tela inicial) -----
  const botaoTurbo = elementoDaRecompensa("rewardTurboBtn");
  const podeTurbo = verificarRecompensa("turbo", { ignorarAndamento: true });

  if (botaoTurbo) {
    botaoTurbo.classList.toggle("hidden", !(podeTurbo.ok && disponivel("turbo")));
    botaoTurbo.disabled = ocupado;
  }

  definirTextoComChave(
    elementoDaRecompensa("rewardTurboMsg"),
    recompensas.turbo.reservada ? "recompensas.turbo.garantido" : avisosDeRecompensa.turbo
  );

  // ----- CONTINUAR (Game Over) -----
  const botaoContinuar = elementoDaRecompensa("rewardContinueBtn");
  const podeContinuar = verificarRecompensa("continuar", { ignorarAndamento: true });

  if (botaoContinuar) {
    botaoContinuar.classList.toggle("hidden", !(podeContinuar.ok && disponivel("continuar")));
    botaoContinuar.disabled = ocupado;
  }

  definirTextoComChave(
    elementoDaRecompensa("rewardContinueMsg"),
    podeContinuar.ok ? avisosDeRecompensa.continuar : null
  );
}

async function aoPedirRecompensa(tipo) {
  avisosDeRecompensa[tipo] = null;

  const resultado = await solicitarRecompensa(tipo);

  // Sem recompensa: avisa com calma e o jogo segue normalmente (o botão continua lá para tentar de novo)
  avisosDeRecompensa[tipo] = resultado.concedida ? null : (MENSAGENS_DE_RECOMPENSA[resultado.motivo] || null);
  atualizarInterfaceDeRecompensas();

  return resultado;
}

// ---------------------------------------------------------------------------
// Tela do anúncio simulado
// ---------------------------------------------------------------------------
function abrirAnuncioSimulado(tipo, duracaoMs, aoFechar) {
  const tela = elementoDaRecompensa("adScreen");
  const fechar = elementoDaRecompensa("adCloseBtn");

  if (fechar) fechar.onclick = () => aoFechar();

  atualizarContagemDoAnuncio(duracaoMs);
  tela?.classList.remove("hidden");
  fechar?.focus?.();
}

function atualizarContagemDoAnuncio(restanteMs) {
  const texto = elementoDaRecompensa("adCountdown");
  if (!texto) return;

  texto.textContent = traduzir("recompensas.anuncio.contagem", { s: Math.max(0, Math.ceil(restanteMs / 1000)) });
}

function fecharAnuncioSimulado() {
  elementoDaRecompensa("adScreen")?.classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Ligações (um único ouvinte, como em ecras/eventos.js)
// ---------------------------------------------------------------------------
document.addEventListener("click", (evento) => {
  const botao = evento.target.closest && evento.target.closest("button");
  if (!botao) return;

  if (botao.id === "rewardTurboBtn") aoPedirRecompensa("turbo");
  else if (botao.id === "rewardContinueBtn") aoPedirRecompensa("continuar");
});

// Chamados pelo jogo (game/loop.js e ecras/ui.js)
function oferecerContinuacao() {
  recompensas.continuar.oferecida = true;
  avisosDeRecompensa.continuar = null;
  atualizarInterfaceDeRecompensas();
}

function encerrarOfertaDeContinuacao() {
  recompensas.continuar.oferecida = false;
  atualizarInterfaceDeRecompensas();
}

atualizarInterfaceDeRecompensas();
