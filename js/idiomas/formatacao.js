/* js/idiomas/formatacao.js
   Números, ordinais e datas conforme o IDIOMA atual, e conversão de velocidade e
   distância conforme as UNIDADES escolhidas (unidades.js; independentes do idioma).
   Depende de nucleo.js e unidades.js. Nada aqui altera valores do jogo: só a
   APRESENTAÇÃO (a física e a pontuação seguem em km/h e quilômetros).
*/

function localeAtual() {
  return dadosDoIdioma().locale;
}

// 0.06 → "0,06" (pt) ou "0.06" (en)
function formatarDecimal(valor, casas) {
  try {
    return new Intl.NumberFormat(localeAtual(), {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    }).format(valor);
  } catch (erro) {
    return Number(valor).toFixed(casas);
  }
}

// 1 → "1º" (pt) ou "1st" (en). O modelo de cada idioma fica em formato.ordinal.
function formatarOrdinal(n) {
  const modelo = buscarTexto("formato.ordinal");

  if (typeof modelo === "string") return preencherParametros(modelo, { n });
  if (!modelo) return String(n);

  let categoria = "other";

  try {
    categoria = new Intl.PluralRules(localeAtual(), { type: "ordinal" }).select(n);
  } catch (erro) {
    categoria = "other";
  }

  return preencherParametros(modelo[categoria] !== undefined ? modelo[categoria] : modelo.other, { n });
}

// Data guardada em ISO ("2026-11-10T...") → data curta do idioma
function formatarData(iso) {
  if (!iso) return "";

  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) return "";

  try {
    return data.toLocaleDateString(localeAtual());
  } catch (erro) {
    return data.toLocaleDateString();
  }
}

// ----- Unidades -----
// O idioma só decide o separador decimal (vírgula ou ponto). A unidade em que a
// velocidade e a distância aparecem vem da escolha do jogador (unidades.js).

// Fator km/h → unidade escolhida (1 em km/h)
function fatorDaVelocidade() {
  return dadosDaUnidade("velocidade").fator;
}

// Velocidade em km/h → número inteiro na unidade escolhida
function converterVelocidade(kmh) {
  return Math.floor(kmh * fatorDaVelocidade());
}

function rotuloDaVelocidade() {
  return dadosDaUnidade("velocidade").rotulo;
}

function mostradorDeVelocidade() {
  return dadosDaUnidade("velocidade").mostrador;
}

// Números das placas de velocidade do cenário, na unidade escolhida
function limitesDeVelocidade() {
  return dadosDaUnidade("velocidade").limites;
}

// Distância em km → "0,06" / "0.04" na unidade escolhida
function formatarDistancia(km) {
  return formatarDecimal(km * dadosDaUnidade("distancia").fator, 2);
}

function rotuloDaDistancia() {
  return dadosDaUnidade("distancia").rotulo;
}

// Velocímetro do HUD em HTML: "120 <small>KM/H</small>"
function htmlDaVelocidade(kmh) {
  return `${converterVelocidade(kmh)} <small>${rotuloDaVelocidade()}</small>`;
}
