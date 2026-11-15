/* js/recompensas/anuncios.js
   PROVEDOR DE ANÚNCIOS: a única parte do sistema que sabe de onde o anúncio vem. Hoje existe só o
   provedor SIMULADO; para anúncios reais (AdMob, 3.9+) basta escrever outro provedor com o mesmo
   contrato e registrá-lo com registrarProvedorDeAnuncios() — o resto do jogo não muda.

   CONTRATO de um provedor:
     nome                       texto, só para diagnóstico
     disponivel(tipo)           true se há um anúncio pronto para esse tipo ("turbo" | "continuar")
     exibir(tipo)  → Promise    resolve { concluido: true } SOMENTE quando o jogador cumpriu o anúncio
                                (no AdMob: "user earned reward"); qualquer outra coisa — fechou antes,
                                falhou, sem preenchimento — resolve { concluido: false, motivo }.
                                Se a promessa for rejeitada, conta como não concluído.
   Quem exibe um anúncio nunca concede nada: a concessão é de js/recompensas/solicitar.js.
*/

let provedorDeAnuncios = null;

function provedorValido(p) {
  return !!p && typeof p.disponivel === "function" && typeof p.exibir === "function";
}

function registrarProvedorDeAnuncios(provedor) {
  if (!provedorValido(provedor)) return false;

  provedorDeAnuncios = provedor;
  if (typeof atualizarInterfaceDeRecompensas === "function") atualizarInterfaceDeRecompensas();

  return true;
}

// Sem provedor registrado, não há anúncio: ninguém ganha nada e o jogo segue normalmente
const PROVEDOR_NENHUM = {
  nome: "nenhum",
  disponivel: () => false,
  exibir: () => Promise.resolve({ concluido: false, motivo: "indisponivel" }),
};

function obterProvedorDeAnuncios() {
  return provedorValido(provedorDeAnuncios) ? provedorDeAnuncios : PROVEDOR_NENHUM;
}

// ---------------------------------------------------------------------------
// Provedor SIMULADO: abre uma tela "Anúncio simulado" com contagem regressiva e botão de fechar.
//   modo: "concluir" (padrão) | "cancelar" | "indisponivel" | "erro"   (trocável a qualquer hora)
//   O botão FECHAR ANÚNCIO antes do fim = não concluído (nenhuma recompensa).
// ---------------------------------------------------------------------------
function criarProvedorSimulado(opcoes = {}) {
  const agendar = opcoes.agendar || ((fn, ms) => setTimeout(fn, ms));
  const cancelarAgenda = opcoes.cancelarAgenda || ((id) => clearTimeout(id));

  const provedor = {
    nome: "simulado",
    modo: opcoes.modo || "concluir",
    duracaoMs: opcoes.duracaoMs != null ? opcoes.duracaoMs : RECOMPENSAS.simulado.duracaoMs,
    exibindo: false,

    disponivel() {
      return this.modo !== "indisponivel";
    },

    exibir(tipo) {
      if (this.modo === "indisponivel") return Promise.resolve({ concluido: false, motivo: "indisponivel" });
      if (this.modo === "erro") return Promise.reject(new Error("simulated ad failure"));
      if (this.exibindo) return Promise.resolve({ concluido: false, motivo: "em_andamento" });

      this.exibindo = true;

      return new Promise((resolver) => {
        let restante = Math.max(0, this.duracaoMs);
        let relogio = null;

        const terminar = (concluido, motivo) => {
          if (relogio !== null) cancelarAgenda(relogio);
          relogio = null;
          this.exibindo = false;
          if (typeof fecharAnuncioSimulado === "function") fecharAnuncioSimulado();
          resolver(concluido ? { concluido: true } : { concluido: false, motivo });
        };

        this.cancelarAtual = () => terminar(false, "cancelado");

        if (typeof abrirAnuncioSimulado === "function") abrirAnuncioSimulado(tipo, restante, this.cancelarAtual);

        if (this.modo === "cancelar") {
          relogio = agendar(() => terminar(false, "cancelado"), Math.min(restante, 500));
          return;
        }

        const passo = () => {
          const fatia = Math.min(1000, restante);
          relogio = agendar(() => {
            restante -= fatia;
            if (typeof atualizarContagemDoAnuncio === "function") atualizarContagemDoAnuncio(restante);
            if (restante <= 0) terminar(true);
            else passo();
          }, fatia);
        };

        passo();
      });
    },
  };

  return provedor;
}

// Registrado ao carregar: nesta versão é o único provedor
registrarProvedorDeAnuncios(criarProvedorSimulado());
