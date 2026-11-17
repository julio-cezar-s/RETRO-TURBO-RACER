/* js/idiomas/unidades.js
   UNIDADES de medida mostradas ao jogador: velocidade (km/h ou mph) e distância
   (km ou mi). São escolhas INDEPENDENTES entre si e do idioma.

   - Só a APRESENTAÇÃO muda: física, velocidade interna, distância percorrida e
     pontuação continuam sempre em km/h e quilômetros.
   - Padrão inicial: km/h e km. Cada escolha fica no localStorage, com chave própria.
   - Depende de nucleo.js (usa os mesmos ouvintes de aoMudarIdioma: quem refaz textos
     ao trocar o idioma também refaz ao trocar uma unidade).
   - Para uma unidade nova (ex.: nós), basta acrescentá-la ao catálogo abaixo: o
     seletor da tela nasce sozinho. Os textos de interface ficam em idiomas/textos.
*/

const UNIDADE_DE_VELOCIDADE_PADRAO = "kmh";
const UNIDADE_DE_DISTANCIA_PADRAO = "km";
const CHAVE_DA_UNIDADE_DE_VELOCIDADE = "retroTurboSpeedUnit";
const CHAVE_DA_UNIDADE_DE_DISTANCIA = "retroTurboDistanceUnit";

// Quantas milhas há em um quilômetro (mesmo fator da versão anterior)
const MILHAS_POR_KM = 0.621371;

// Catálogo. A ordem aqui é a ordem dos botões. "fator" converte km/h (ou km) para a unidade.
const UNIDADES_DE_VELOCIDADE = {
  kmh: {
    rotulo: "KM/H",
    fator: 1,
    mostrador: { maximo: 540, passoMenor: 20, passoMaior: 100 },   // graduação do velocímetro analógico
    limites: ["60", "80", "100", "120"],                          // números das placas de velocidade do cenário
  },
  mph: {
    rotulo: "MPH",
    fator: MILHAS_POR_KM,
    mostrador: { maximo: 340, passoMenor: 20, passoMaior: 100 },
    limites: ["35", "50", "65", "75"],
  },
};

const UNIDADES_DE_DISTANCIA = {
  km: { rotulo: "KM", fator: 1 },
  mi: { rotulo: "MI", fator: MILHAS_POR_KM },
};

// tipo → { catalogo, padrao, chave }. É o único lugar que liga cada tipo ao seu catálogo.
const TIPOS_DE_UNIDADE = {
  velocidade: { catalogo: UNIDADES_DE_VELOCIDADE, padrao: UNIDADE_DE_VELOCIDADE_PADRAO, chave: CHAVE_DA_UNIDADE_DE_VELOCIDADE },
  distancia: { catalogo: UNIDADES_DE_DISTANCIA, padrao: UNIDADE_DE_DISTANCIA_PADRAO, chave: CHAVE_DA_UNIDADE_DE_DISTANCIA },
};

const estadoDasUnidades = {
  velocidade: UNIDADE_DE_VELOCIDADE_PADRAO,
  distancia: UNIDADE_DE_DISTANCIA_PADRAO,
};

function tipoDeUnidadeExiste(tipo) {
  return Object.prototype.hasOwnProperty.call(TIPOS_DE_UNIDADE, tipo);
}

function unidadeExiste(tipo, codigo) {
  return tipoDeUnidadeExiste(tipo)
    && typeof codigo === "string"
    && Object.prototype.hasOwnProperty.call(TIPOS_DE_UNIDADE[tipo].catalogo, codigo);
}

// [{ codigo: "kmh", rotulo: "KM/H" }, { codigo: "mph", rotulo: "MPH" }]
function unidadesDisponiveis(tipo) {
  if (!tipoDeUnidadeExiste(tipo)) return [];

  const catalogo = TIPOS_DE_UNIDADE[tipo].catalogo;

  return Object.keys(catalogo).map((codigo) => ({ codigo, rotulo: catalogo[codigo].rotulo }));
}

// Código escolhido ("kmh" | "mph" ou "km" | "mi")
function obterUnidade(tipo) {
  return tipoDeUnidadeExiste(tipo) ? estadoDasUnidades[tipo] : undefined;
}

// Definição completa (rótulo, fator...) da unidade escolhida
function dadosDaUnidade(tipo) {
  return TIPOS_DE_UNIDADE[tipo].catalogo[estadoDasUnidades[tipo]];
}

function lerUnidadeSalva(tipo) {
  try {
    const salvo = localStorage.getItem(TIPOS_DE_UNIDADE[tipo].chave);

    if (unidadeExiste(tipo, salvo)) return salvo;
  } catch (erro) {
    // Armazenamento bloqueado: usa a unidade padrão
  }

  return TIPOS_DE_UNIDADE[tipo].padrao;
}

function salvarUnidade(tipo, codigo) {
  try {
    localStorage.setItem(TIPOS_DE_UNIDADE[tipo].chave, codigo);
  } catch (erro) {
    // Navegação privada: a escolha vale só nesta visita
  }
}

// Troca uma unidade e avisa a interface. Tipo ou código desconhecido é ignorado (devolve false).
function definirUnidade(tipo, codigo, { salvar = true } = {}) {
  if (!unidadeExiste(tipo, codigo)) return false;

  const mudou = estadoDasUnidades[tipo] !== codigo;

  estadoDasUnidades[tipo] = codigo;
  if (salvar) salvarUnidade(tipo, codigo);

  if (mudou) avisarOuvintes();

  return true;
}

// Carrega as unidades salvas (sem regravar nem avisar os ouvintes)
function iniciarUnidades() {
  Object.keys(TIPOS_DE_UNIDADE).forEach((tipo) => {
    estadoDasUnidades[tipo] = lerUnidadeSalva(tipo);
  });
}
