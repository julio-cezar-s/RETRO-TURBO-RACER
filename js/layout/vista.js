/* js/layout/vista.js
   VISTA: a janela do jogo para o mundo. A ALTURA lógica é sempre 360 (GAME_HEIGHT) e a
   LARGURA lógica acompanha a proporção da área disponível na tela:

     tela 16:9                     → 640  (igual ao jogo de antes)
     tela mais larga que 16:9      → 360 × proporção  (ex.: 1363×550 → ~892; 21:9 → ~840)
     tela 16:10 (notebooks)        → 576  (a pista e o acostamento continuam inteiros: meia vista
                                           de 288 ≥ 287 do acostamento)
     tela mais quadrada que 16:10  → 576 e o canvas fica em 16:10 (sobra só em cima/embaixo)

   Como a escala vertical da câmera não muda, cada unidade lógica continua com o mesmo
   tamanho na tela nos dois eixos: carro, pista, obstáculos e HUD NÃO são esticados — a
   tela mais larga simplesmente mostra MAIS cenário e pista dos lados (campo de visão
   horizontal maior). Física, colisões e pontuação trabalham em unidades de mundo e não
   dependem da largura da vista.

   Todo desenho horizontal (centro da perspectiva, céu, terreno, atmosfera, HUD no canvas)
   lê VISTA.largura; GAME_WIDTH continua sendo a largura-base (640) do projeto original.
   Este arquivo só guarda a medida e a matemática; layout/responsivo.js a atualiza.
*/

const VISTA = {
  largura: GAME_WIDTH,          // largura lógica atual (de 576 a 1280)
  altura: GAME_HEIGHT,          // altura lógica (fixa)
  // 16:10: com 576 lógicos a pista inteira (kerb a 1,64 faixa = 287 px) ainda cabe; mais estreito cortaria a pista
  proporcaoMinima: 16 / 10,
  // 4:1 (1440 lógicos): cobre o monitor 32:9 (5120×1440) mesmo descontando a barra de cima; além disso sobram margens laterais
  proporcaoMaxima: 4,
};

// Largura lógica que preenche exatamente uma área de proporção "proporcao" (largura ÷ altura)
function larguraLogicaDaProporcao(proporcao) {
  if (!(proporcao > 0)) return GAME_WIDTH;

  const p = Math.max(VISTA.proporcaoMinima, Math.min(VISTA.proporcaoMaxima, proporcao));

  return VISTA.altura * p;
}

// Fator de ampliação do campo de visão em relação ao jogo original (1 = 640 lógicos ou menos)
function fatorDeCampoDeVisao() {
  return Math.max(1, VISTA.largura / GAME_WIDTH);
}

// Troca a largura lógica. Devolve true se mudou. O desenho das camadas em cache (céu)
// depende da largura, então elas são refeitas na próxima vez.
function definirLarguraDaVista(largura) {
  const nova = larguraLogicaDaProporcao(largura / VISTA.altura);

  if (Math.abs(nova - VISTA.largura) < 1e-6) return false;

  VISTA.largura = nova;
  if (typeof camadasCeu !== "undefined") camadasCeu = null;

  return true;
}
