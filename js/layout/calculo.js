/* js/layout/calculo.js
   CÁLCULO do layout: dado o tamanho da janela, decide onde ficam o canvas, a
   barra de informações (HUD em HTML) e o botão de turbo. É matemática pura (sem
   DOM), por isso é testada com dezenas de resoluções.

   O canvas OCUPA TODA a área disponível (abaixo da barra de informações). A altura
   lógica é sempre 360; a LARGURA lógica acompanha a proporção da área
   (js/layout/vista.js): 640 em 16:9, 576 em 16:10 e mais larga em telas mais largas,
   mostrando mais cenário e pista dos lados. A escala é a mesma nos dois eixos, então
   nada é esticado. Só quando a área é MAIS ESTREITA que 16:10 (tablet 4:3, janela quase
   quadrada) o canvas fica em 16:10 e o resto da tela é usado pela barra e pelo botão.

   Modos:
     cheio     celular/tablet largo na horizontal: o canvas ocupa tudo abaixo da barra e o
               botão de turbo fica SOBRE o canvas, no canto direito, acima do indicador de
               turbo (a direção é por toque nas duas metades da tela, sem botões)
     inferior  celular de vista estreita (< 740 lógicos de largura, onde o botão cairia em
               cima da pista): barra em cima, faixa do botão de turbo embaixo
     mesa      notebook/desktop com mouse e teclado: só a barra em cima, o canvas ocupa todo
               o resto (os botões de toque ficam escondidos até alguém tocar na tela)
*/

const LAYOUT = {
  proporcao: VISTA.proporcaoMinima,   // menor proporção do canvas (16:10)

  // Fator de escala da interface em HTML: acompanha o menor lado da janela
  ui: { referencia: 400, min: 0.85, max: 1.3 },

  // Medidas em pixels CSS para ui = 1 (são multiplicadas por ui)
  barra: 40,               // altura da barra de informações
  controlesInferior: 58,   // altura da faixa de botões (modo inferior)
  controlesInferiorMin: 56, // nunca menor que isso (botão de 44 px + folga)

  // Modo "cheio": o botão de turbo (≈ 108 unidades lógicas de largura, no canto direito) precisa
  // ficar FORA do asfalto. A pista tem meia largura de 262 unidades (1,5 faixa × 175), então
  // 2 × (262 + 108) = 740 é a menor largura lógica em que ele não cobre nenhuma faixa.
  larguraMinimaDoBotaoSobreposto: 740,

  // Abaixo desta largura a barra usa o formato compacto (rótulo sobre o valor)
  larguraCompacta: 700,

  // Resolução interna do canvas, como múltiplo da vista lógica (nítida sem pesar)
  escalas: [1, 1.25, 1.5, 1.75, 2],
};

function fatorDeInterface(largura, altura) {
  const { referencia, min, max } = LAYOUT.ui;

  return Math.max(min, Math.min(max, Math.min(largura, altura) / referencia));
}

// Retângulo do canvas dentro de (largura × altura), em pixels FÍSICOS inteiros:
//   - área com proporção ≥ 16:10: ocupa TUDO (até a proporção máxima da vista, 4:1);
//     a largura lógica acompanha a proporção, então nada é esticado
//   - área mais estreita que 16:10: maior 16:10 que cabe, em múltiplos de 16×10 pixels físicos
//     (proporção exata, sem reamostragem com borrão)
function ajustarMundo(largura, altura, dpr) {
  const w = Math.max(0, largura);
  const h = Math.max(0, altura);

  if (w <= 0 || h <= 0) return { w: 0, h: 0 };

  if (w / h >= LAYOUT.proporcao - 1e-9) {
    const hFisico = Math.floor(h * dpr + 1e-6);
    const wFisico = Math.min(Math.floor(w * dpr + 1e-6), Math.floor(hFisico * VISTA.proporcaoMaxima));

    if (hFisico < 1 || wFisico < 1) return { w: 0, h: 0 };

    return { w: wFisico / dpr, h: hFisico / dpr };
  }

  const blocos = Math.floor((Math.min(w, h * LAYOUT.proporcao) * dpr) / 16);

  if (blocos < 1) return { w: 0, h: 0 };

  return { w: (blocos * 16) / dpr, h: (blocos * 10) / dpr };
}

// Entrada: { largura, altura, toque, dpr, seguro: { topo, direita, base, esquerda } }
function calcularLayout(entrada) {
  const dpr = entrada.dpr > 0 ? entrada.dpr : 1;
  const seguro = { topo: 0, direita: 0, base: 0, esquerda: 0, ...(entrada.seguro || {}) };

  // Área útil (descontando entalhes e barras do sistema)
  const area = {
    x: seguro.esquerda,
    y: seguro.topo,
    w: Math.max(0, entrada.largura - seguro.esquerda - seguro.direita),
    h: Math.max(0, entrada.altura - seguro.topo - seguro.base),
  };

  const ui = fatorDeInterface(area.w, area.h);
  const alturaBarra = Math.round(LAYOUT.barra * ui);
  const alturaControles = Math.max(LAYOUT.controlesInferiorMin, Math.round(LAYOUT.controlesInferior * ui));

  // Cada candidato diz que espaço sobra para o canvas
  const candidatos = [];

  if (entrada.toque) {
    candidatos.push({
      modo: "inferior",
      disponivel: { w: area.w, h: area.h - alturaBarra - alturaControles },
    });
    candidatos.push({
      modo: "cheio",
      disponivel: { w: area.w, h: area.h - alturaBarra },
      // O botão de turbo fica sobre o canvas: só vale quando ele cai fora da pista
      exigeLargura: LAYOUT.larguraMinimaDoBotaoSobreposto,
    });
  } else {
    candidatos.push({ modo: "mesa", disponivel: { w: area.w, h: area.h - alturaBarra } });
  }

  // Vence o que dá o maior canvas (em empate, o primeiro da lista)
  let melhor = null;

  candidatos.forEach((c) => {
    c.mundo = ajustarMundo(Math.max(0, c.disponivel.w), Math.max(0, c.disponivel.h), dpr);
    c.larguraLogica = c.mundo.h > 0 ? larguraLogicaDaProporcao(c.mundo.w / c.mundo.h) : GAME_WIDTH;
    c.pontos = c.mundo.w * c.mundo.h;

    if (c.exigeLargura && c.larguraLogica < c.exigeLargura) return;
    if (!melhor || c.pontos > melhor.pontos) melhor = c;
  });

  // Sem candidato válido (janela minúscula): cai no primeiro
  if (!melhor) melhor = candidatos[0];

  const { modo, mundo } = melhor;

  // Posição do canvas: centralizado na horizontal e, na vertical, no espaço
  // que fica entre a barra de cima e (no modo inferior) a faixa de botões
  const topoDoMundo = area.y + alturaBarra;
  const baseDoMundo = area.y + area.h - (modo === "inferior" ? alturaControles : 0);

  const mundoRect = {
    x: area.x + (area.w - mundo.w) / 2,
    y: Math.max(topoDoMundo, topoDoMundo + (baseDoMundo - topoDoMundo - mundo.h) / 2),
    w: mundo.w,
    h: mundo.h,
  };

  const barra = { x: area.x, y: area.y, w: area.w, h: alturaBarra };

  let controles = null;

  if (modo === "inferior") {
    controles = { x: area.x, y: baseDoMundo, w: area.w, h: alturaControles };
  } else if (modo === "cheio") {
    // Sobre o canvas: o botão de turbo é posicionado pelo CSS no canto direito
    controles = { ...mundoRect };
  }

  const lateral = {
    esquerda: mundoRect.x - area.x,
    direita: area.x + area.w - (mundoRect.x + mundoRect.w),
  };

  const larguraLogica = melhor.larguraLogica;

  return {
    modo,
    ui,
    larguraLogica,
    // pixels CSS por unidade lógica (igual nos dois eixos: nada esticado)
    pxPorUnidade: mundoRect.h > 0 ? mundoRect.h / GAME_HEIGHT : 0,
    compacto: area.w < LAYOUT.larguraCompacta,
    area,
    barra,
    mundo: mundoRect,
    controles,
    lateral,
    aproveitamento: (mundoRect.w * mundoRect.h) / Math.max(1, entrada.largura * entrada.altura),
  };
}

// Resolução interna do canvas (múltiplo da vista lógica) para a largura mostrada na
// tela: o menor degrau que ainda fica nítido, limitado pelo teto de qualidade.
// larguraLogica: largura lógica da vista (padrão 640).
function escolherEscalaDeRenderizacao(larguraNaTela, dpr, teto, larguraLogica = GAME_WIDTH) {
  const degraus = LAYOUT.escalas;
  const necessaria = (larguraNaTela * (dpr > 0 ? dpr : 1)) / (larguraLogica > 0 ? larguraLogica : GAME_WIDTH);
  const limite = teto === undefined ? degraus[degraus.length - 1] : teto;

  const degrau = degraus.find((d) => d >= necessaria - 0.05) ?? degraus[degraus.length - 1];

  return Math.max(degraus[0], Math.min(degrau, limite));
}

// Degrau logo abaixo de "escala" (ou o mínimo, se já estiver nele)
function degrauAbaixoDe(escala) {
  const menores = LAYOUT.escalas.filter((d) => d < escala - 1e-9);

  return menores.length ? menores[menores.length - 1] : LAYOUT.escalas[0];
}
