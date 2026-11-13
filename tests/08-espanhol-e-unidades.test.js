// Versão 3.4.0: espanhol (es) e unidades independentes do idioma (km/h ou mph, km ou mi)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { carregarJogo, RAIZ } = require("./helpers/carregar-jogo");
const { novoJogo, coletar } = require("./helpers/apoio");

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const plano = (x) => JSON.parse(JSON.stringify(x));
const idioma = (j, codigo) => assert.equal(j.f.definirIdioma(codigo), true);
const unidades = (j, vel, dist) => {
  assert.equal(j.f.definirUnidade("velocidade", vel), true);
  assert.equal(j.f.definirUnidade("distancia", dist), true);
};

const IDIOMAS = ["pt", "en", "es"];
const COMBINACOES = [["kmh", "km"], ["kmh", "mi"], ["mph", "km"], ["mph", "mi"]];

function pacotes() {
  const j = carregarJogo();
  const ler = (c) => j.avaliar(`JSON.parse(JSON.stringify(registroDeIdiomas.${c}.textos))`);
  return { j, pt: ler("pt"), en: ler("en"), es: ler("es") };
}

const marcas = (texto) => [...String(texto).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function textosDoQuadro(j) {
  j.ctx2d.__textos.length = 0;
  j.f.renderizar();
  return [...j.ctx2d.__textos];
}

// Clique de verdade: usa o ouvinte que o jogo registrou no document
function clicar(j, botao) {
  botao.closest = (seletor) => (botao.atributos[seletor.replace(/[\[\]]/g, "")] !== undefined ? botao : null);
  j.ouvintesDoDocumento.filter(([n]) => n === "click").forEach(([, fn]) => fn({ target: botao }));
}

const botoesDeUnidade = (j, tipo) =>
  j.avaliar("document.querySelectorAll('[data-unidade-codigo]')").filter((b) => b.getAttribute("data-unidade-tipo") === tipo);

// ============================================================
// ESPANHOL
// ============================================================

test("espanhol está registrado como terceiro idioma, com nome próprio, locale e lang do documento", () => {
  const j = carregarJogo();
  assert.deepEqual(plano(j.f.idiomasDisponiveis()), [
    { codigo: "pt", nome: "Português" }, { codigo: "en", nome: "English" }, { codigo: "es", nome: "Español" },
  ]);
  assert.equal(j.avaliar("registroDeIdiomas.es.locale"), "es-ES");
  assert.equal(j.avaliar("registroDeIdiomas.es.htmlLang"), "es");
});

test("o seletor de idioma ganhou o botão Español sozinho nas três telas, sem mudar o HTML dos seletores", () => {
  const j = carregarJogo();
  const es = j.avaliar("document.querySelectorAll('[data-idioma]')").filter((b) => b.getAttribute("data-idioma") === "es");
  assert.equal(es.length, 3, "início, opções e pausa");
  es.forEach((b) => {
    assert.equal(b.textContent, "Español");
    assert.equal(b.getAttribute("lang"), "es");
    assert.equal(b.getAttribute("aria-pressed"), "false");
  });
  assert.match(lerArquivo("index.html"), /<div class="seletor-idioma" data-seletor-idioma><\/div>/);
});

test("português continua o idioma padrão e o reserva (sem preferência salva)", () => {
  const j = carregarJogo();
  assert.equal(j.f.obterIdioma(), "pt");
  assert.equal(j.avaliar("IDIOMA_PADRAO"), "pt");
  assert.equal(j.elementos.playBtn.textContent, "JOGAR");
});

test("português, inglês e espanhol têm exatamente as mesmas chaves", () => {
  const { pt, en, es } = pacotes();
  assert.deepEqual(Object.keys(es).sort(), Object.keys(pt).sort());
  assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort());
  assert.ok(Object.keys(es).length > 60);
});

test("espanhol: nenhum texto vazio, marcas {n}/{nome} iguais ao português e listas do mesmo tamanho", () => {
  const { pt, es } = pacotes();
  for (const chave of Object.keys(pt)) {
    const v = es[chave];
    if (Array.isArray(v)) {
      assert.equal(v.length, pt[chave].length, `lista ${chave}`);
      assert.ok(v.every((x) => String(x).length > 0), chave);
    } else if (typeof v === "object") {
      assert.ok(Object.values(v).every((x) => x.length > 0), chave);
    } else {
      assert.ok(v.trim().length > 0, `${chave} vazio`);
    }
    if (typeof pt[chave] === "string" && typeof es[chave] === "string") assert.deepEqual(marcas(es[chave]), marcas(pt[chave]), `marcas de ${chave}`);
  }
});

test("espanhol: tudo foi realmente traduzido (só repete o português nas palavras neutras)", () => {
  const { pt, es } = pacotes();
  const neutras = new Set(["termos.turbo", "hud.combo", "powerup.nitro", "cenario.outdoors", "cenario.portico", "idioma.rotulo",
    "pausa.continuar", "acessibilidade.idioma", "combo.perdido", "hud.comboMaximo"]);
  const iguais = Object.keys(pt).filter((c) => JSON.stringify(pt[c]) === JSON.stringify(es[c]));
  assert.deepEqual(iguais.filter((c) => !neutras.has(c)), []);
});

test("espanhol: textos têm acentos e sinais ¡ ¿ corretos e nenhum caractere quebrado", () => {
  const { es } = pacotes();
  assert.equal(es["menu.opcoes"], "OPCIONES");
  assert.equal(es["menu.subtitulo"], "¡Prepárate para acelerar!");
  assert.equal(es["powerup.escudo"], "¡ESCUDO!");
  assert.equal(es["powerup.lentidao"], "CÁMARA LENTA");
  assert.equal(es["quase.aviso"], "¡{nome}!");
  assert.equal(es["combo.subiu"], "¡COMBO x{n}!");
  assert.equal(es["termos.turboVazio"], "VACÍO");
  assert.equal(es["opcoes.particulasLigadas"], "PARTÍCULAS: SÍ");
  assert.equal(es["fimDeJogo.pontuacao"], "Puntuación:");
  assert.equal(es["formato.ordinal"], "{n}.º");
  assert.ok(!lerArquivo("js/idiomas/textos/es.js").includes("\uFFFD"));
});

test("espanhol: textos de HUD e botões cabem no layout (mesmos limites do português e do inglês)", () => {
  const { es } = pacotes();
  ["hud.pontos", "hud.velocidade", "hud.distancia"].forEach((c) => assert.ok(es[c].length <= 12, c));
  ["opcoes.somLigado", "opcoes.somDesligado", "opcoes.particulasLigadas", "opcoes.particulasDesligadas",
    "opcoes.telaCheiaLigada", "opcoes.telaCheiaDesligada", "fimDeJogo.jogarNovamente", "fimDeJogo.menuPrincipal",
    "pausa.continuar", "menu.jogar", "menu.recordes", "menu.opcoes", "powerup.escudo", "powerup.lentidao",
    "powerup.dobro", "combo.caiu", "combo.perdido"].forEach((c) => assert.ok(es[c].length <= 24, `${c}: ${es[c].length}`));
});

test("trocar para espanhol atualiza TODO o HTML, o atributo lang e os botões; voltar ao português restaura", () => {
  const j = carregarJogo();
  idioma(j, "es");
  const e = j.elementos;
  assert.equal(e.playBtn.textContent, "JUGAR");
  assert.equal(e.recordsBtn.textContent, "RÉCORDS");
  assert.equal(e.optionsBtn.textContent, "OPCIONES");
  assert.equal(e.resumeBtn.textContent, "CONTINUAR");
  assert.equal(e.quitBtn.textContent, "SALIR");
  assert.equal(e.restartBtn.textContent, "JUGAR DE NUEVO");
  assert.equal(e.backToMenuBtn.textContent, "MENÚ PRINCIPAL");
  assert.equal(e.closeRecordsBtn.textContent, "VOLVER");
  assert.equal(e.closeOptionsBtn.textContent, "VOLVER");
  assert.equal(e.turboBtn.getAttribute("aria-label"), "Activar el turbo");
  assert.equal(e.pauseBtn.getAttribute("aria-label"), "Pausar el juego");
  assert.equal(e.carregamentoAviso.textContent, "CARGANDO...");
  assert.equal(e.versaoDoJogo.textContent, "versión 3.5.0");
  assert.equal(j.avaliar("document.documentElement.getAttribute('lang')"), "es");

  const ativos = j.avaliar("document.querySelectorAll('[data-idioma]')").filter((b) => b.classList.contains("ativo"));
  assert.equal(ativos.length, 3);
  ativos.forEach((b) => assert.equal(b.getAttribute("data-idioma"), "es"));

  idioma(j, "pt");
  assert.equal(e.playBtn.textContent, "JOGAR");
  assert.equal(e.versaoDoJogo.textContent, "versão 3.5.0");
  assert.equal(j.avaliar("document.documentElement.getAttribute('lang')"), "pt-BR");
});

test("espanhol: a escolha é gravada, volta ao reabrir e a visita seguinte já abre em espanhol", () => {
  const primeira = carregarJogo();
  idioma(primeira, "es");
  assert.equal(primeira.armazenamento.retroTurboLanguage, "es");

  const segunda = carregarJogo({ armazenamento: { ...primeira.armazenamento } });
  assert.equal(segunda.f.obterIdioma(), "es");
  assert.equal(segunda.elementos.playBtn.textContent, "JUGAR");
  assert.equal(segunda.avaliar("document.documentElement.getAttribute('lang')"), "es");
});

test("espanhol: fallback para o português quando falta uma chave, e a própria chave se faltar em todos", () => {
  const j = carregarJogo();
  j.avaliar(`registrarIdioma({ codigo: "es", nome: "Español", locale: "es-ES", htmlLang: "es", textos: { menu: { jogar: "JUGAR" } } })`);
  idioma(j, "es");
  assert.equal(j.f.traduzir("menu.jogar"), "JUGAR");
  assert.equal(j.f.traduzir("pausa.titulo"), "JOGO PAUSADO", "faltou no es: usa português");
  assert.equal(j.f.traduzir("hud.nivel", { n: 2 }), "NÍVEL 2");
  assert.equal(j.f.traduzir("chave.que.nao.existe"), "chave.que.nao.existe");
  assert.ok(j.avaliar("estadoDoIdioma.ausentes.has('es:pausa.titulo')"));
});

test("espanhol: números, ordinais e datas seguem o idioma (vírgula decimal, 1.º, dia/mês/ano)", () => {
  const j = carregarJogo();
  idioma(j, "es");
  assert.equal(j.f.formatarDistancia(0), "0,00");
  assert.equal(j.f.formatarDistancia(12.3456), "12,35");
  assert.deepEqual([1, 2, 3, 10].map((n) => j.f.formatarOrdinal(n)), ["1.º", "2.º", "3.º", "10.º"]);
  assert.equal(j.f.formatarData("2026-11-10T12:00:00.000Z"), "10/11/2026");
  assert.equal(j.f.formatarData("não é data"), "");
});

test("espanhol: HUD no canvas, turbo vazio, combo, quase-colisão e power-ups saem em espanhol", () => {
  const j = novoJogo();
  idioma(j, "es");
  j.v.gameState.nivel = 3;
  const quadro = textosDoQuadro(j);
  assert.ok(quadro.includes("NIVEL 3") && quadro.includes("TURBO") && quadro.includes("COMBO") && quadro.includes("KM/H"));
  assert.ok(!quadro.includes("NÍVEL 3"));

  j.v.gameState.turboEnergy = 0;
  assert.ok(textosDoQuadro(j).includes("VACÍO"));

  j.v.combo.aviso = 60; j.v.combo.avisoChave = "combo.perdido"; j.v.combo.avisoPerda = true;
  assert.ok(textosDoQuadro(j).includes("COMBO PERDIDO"));
  j.v.combo.avisoChave = "combo.caiu"; j.v.combo.avisoMultiplicador = 3;
  assert.ok(textosDoQuadro(j).includes("COMBO BAJA A x3"));
  j.v.combo.avisoChave = "combo.subiu"; j.v.combo.avisoMultiplicador = 4;
  assert.ok(textosDoQuadro(j).includes("¡COMBO x4!"));

  const niveis = j.v.QUASE_COLISAO.niveis;
  j.f.emitirFeedbackDeQuaseColisao(niveis[0], 120, 1, 1);
  j.f.emitirFeedbackDeQuaseColisao(niveis[1], 50, 1, 1);
  j.f.emitirFeedbackDeQuaseColisao(niveis[2], 20, 1, 1);
  const q = textosDoQuadro(j);
  assert.ok(q.includes("¡RASPÓN!") && q.includes("¡CERCA!") && q.includes("¡POR POCO!"));

  const esperado = { nitro: "NITRO +40", escudo: "¡ESCUDO!", lentidao: "CÁMARA LENTA", dobro: "PUNTOS x2" };
  for (const [tipo, texto] of Object.entries(esperado)) {
    j.v.popupsDePowerUp.length = 0;
    coletar(j, tipo);
    assert.ok(textosDoQuadro(j).includes(texto), tipo);
  }
});

test("espanhol: caminhão, opções, tela cheia, resumo do Game Over, recordes e erros", () => {
  const j = novoJogo();
  idioma(j, "es");

  j.ctx2d.__textos.length = 0;
  j.f.desenharCaminhaoFrontal(0, 0, 200, 120, j.f.criarObstaculo("truck", { faixa: 1 }));
  assert.deepEqual(plano(j.ctx2d.__textos), ["CARGA ANCHA"]);

  assert.equal(j.elementos.optionsSoundBtn.textContent, "SONIDO: SÍ");
  assert.equal(j.elementos.particlesBtn.textContent, "PARTÍCULAS: SÍ");

  const doc = j.avaliar("document");
  doc.documentElement.requestFullscreen = () => Promise.resolve();
  const texto = { dataset: { telaCheia: "texto" }, classList: { toggle() {} }, setAttribute() {}, textContent: "" };
  const icone = { dataset: { telaCheia: "icone" }, classList: { toggle() {} }, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  doc.querySelectorAll = () => [texto, icone];
  j.f.atualizarBotoesDeTelaCheia();
  assert.equal(texto.textContent, "PANT. COMPLETA: NO");
  assert.equal(icone.attrs["aria-label"], "Pantalla completa");
  doc.fullscreenElement = doc.documentElement;
  j.f.atualizarBotoesDeTelaCheia();
  assert.equal(texto.textContent, "PANT. COMPLETA: SÍ");
  assert.equal(icone.attrs["aria-label"], "Salir de pantalla completa");

  for (let i = 0; i < 4; i++) j.f.registrarDesvio({ type: "civilian" });
  j.f.registrarQuaseColisao(j.v.QUASE_COLISAO.niveis[0], { worldX: 1 });
  j.v.powerUps.coletados = 2;
  j.v.powerUps.escudosUsados = 1;
  const resumo = j.f.resumoDaPartida().split("\n");
  assert.equal(resumo[0], "Mejor combo: x1 · Esquivas: 4 (+40 pts)");
  assert.equal(resumo[1], "Power-ups recogidos: 2 · El escudo te salvó 1x");
  assert.equal(resumo[2], "Casi choques: 1 (+120 pts) · Mejor racha: x1");

  const k = carregarJogo();
  idioma(k, "es");
  k.f.renderizarRecordes();
  assert.equal(k.elementos.recordsList.children.at(-1).textContent, "Aún no hay récords. ¡Completa una carrera!");
  k.armazenamento.retroTurboRecords = JSON.stringify([{ pontos: 1234, data: "2026-11-10T12:00:00.000Z" }, { pontos: 99, data: "2026-11-09T12:00:00.000Z" }]);
  k.f.renderizarRecordes();
  assert.match(k.elementos.recordsList.innerHTML, /<span>1\.º<\/span><strong>01234<\/strong><small>10\/11\/2026<\/small>/);
  assert.match(k.elementos.recordsList.innerHTML, /<span>2\.º<\/span>/);

  assert.equal(k.f.textoDoErro("erro.recarregar"), "Recargar");
  assert.ok(k.f.textoDoErro("erro.dica").startsWith("Si el error continúa"));
});

test("espanhol: girar o aparelho, mensagem de carregamento e falha acompanham o idioma", () => {
  const j = carregarJogo();
  idioma(j, "es");
  assert.equal(j.f.traduzir("girar.titulo"), "GIRA EL DISPOSITIVO");
  assert.match(j.f.traduzir("girar.texto"), /^Retro Turbo Racer se juega/);
  j.avaliar("falhasDoJogo.push('x|y')");
  j.f.prepararJogo();
  assert.equal(j.elementos.carregamentoAviso.textContent, "Error al cargar — mira el aviso de arriba");
});

// ============================================================
// UNIDADES — padrão, catálogo e conversões
// ============================================================

test("padrão inicial: km/h e km, sem preferência salva, e nada é gravado sozinho", () => {
  const j = carregarJogo();
  assert.equal(j.f.obterUnidade("velocidade"), "kmh");
  assert.equal(j.f.obterUnidade("distancia"), "km");
  assert.equal(j.f.rotuloDaVelocidade(), "KM/H");
  assert.equal(j.f.rotuloDaDistancia(), "KM");
  assert.equal(j.armazenamento.retroTurboSpeedUnit, undefined);
  assert.equal(j.armazenamento.retroTurboDistanceUnit, undefined);
});

test("catálogo: dois tipos, cada um com as unidades na ordem dos botões", () => {
  const j = carregarJogo();
  assert.deepEqual(plano(j.f.unidadesDisponiveis("velocidade")), [{ codigo: "kmh", rotulo: "KM/H" }, { codigo: "mph", rotulo: "MPH" }]);
  assert.deepEqual(plano(j.f.unidadesDisponiveis("distancia")), [{ codigo: "km", rotulo: "KM" }, { codigo: "mi", rotulo: "MI" }]);
  assert.deepEqual(plano(j.f.unidadesDisponiveis("peso")), []);
});

test("conversões de velocidade: km/h → mph (inteiro, arredondado para baixo) e km/h → km/h", () => {
  const j = carregarJogo();
  const tabela = [[0, 0, 0], [1, 1, 0], [50, 50, 31], [60, 60, 37], [100, 100, 62], [120, 120, 74], [240, 240, 149], [287.9, 287, 178], [540, 540, 335]];
  for (const [kmh, esperadoKmh, esperadoMph] of tabela) {
    j.f.definirUnidade("velocidade", "kmh");
    assert.equal(j.f.converterVelocidade(kmh), esperadoKmh, `${kmh} km/h`);
    j.f.definirUnidade("velocidade", "mph");
    assert.equal(j.f.converterVelocidade(kmh), esperadoMph, `${kmh} km/h em mph`);
  }
  assert.equal(j.avaliar("MILHAS_POR_KM"), 0.621371, "mesmo fator da versão anterior");
});

test("conversões de distância: km → mi com duas casas, no separador do idioma", () => {
  const casos = [[0, "0,00", "0.00", "0,00"], [1, "0,62", "0.62", "0,62"], [2.5, "1,55", "1.55", "1,55"], [10, "6,21", "6.21", "6,21"],
    [42.195, "26,22", "26.22", "26,22"], [100, "62,14", "62.14", "62,14"]];
  const j = carregarJogo();
  j.f.definirUnidade("distancia", "mi");
  for (const [km, pt, en, es] of casos) {
    idioma(j, "pt"); assert.equal(j.f.formatarDistancia(km), pt);
    idioma(j, "en"); assert.equal(j.f.formatarDistancia(km), en);
    idioma(j, "es"); assert.equal(j.f.formatarDistancia(km), es);
  }
  j.f.definirUnidade("distancia", "km");
  idioma(j, "en"); assert.equal(j.f.formatarDistancia(42.195), "42.20");
  idioma(j, "es"); assert.equal(j.f.formatarDistancia(42.195), "42,20");
});

test("o fator das unidades padrão é 1: km/h e km mostram exatamente o valor interno", () => {
  const j = carregarJogo();
  assert.equal(j.f.fatorDaVelocidade(), 1);
  assert.equal(j.avaliar("UNIDADES_DE_DISTANCIA.km.fator"), 1);
  assert.equal(j.f.htmlDaVelocidade(120), "120 <small>KM/H</small>");
});

// ============================================================
// UNIDADES — independência do idioma (todas as combinações)
// ============================================================

test("TODAS as combinações de idioma × velocidade × distância: HUD HTML, hodômetro, rótulos e canvas", () => {
  const rotVel = { kmh: "KM/H", mph: "MPH" };
  const rotDist = { km: "KM", mi: "MI" };
  const velEsperada = { kmh: 120, mph: 74 };
  const distEsperada = { km: 2.5, mi: 1.55 };
  const decimal = { pt: ",", en: ".", es: "," };
  let combinacoes = 0;

  const j = novoJogo();
  j.v.gameState.gameSpeed = 5;                    // 120 km/h
  j.avaliar("distanciaPercorridaKm = 2.5");

  for (const cod of IDIOMAS) {
    idioma(j, cod);
    for (const [vel, dist] of COMBINACOES) {
      unidades(j, vel, dist);
      j.f.atualizarInterface();
      j.f.atualizarExibicaoOdometro();
      const tag = `${cod}/${vel}/${dist}`;

      assert.equal(j.elementos.speedometer.innerHTML, `${velEsperada[vel]} <small>${rotVel[vel]}</small>`, tag);
      assert.equal(j.elementos.distanceometer.textContent, distEsperada[dist].toFixed(2).replace(".", decimal[cod]), tag);
      assert.deepEqual(plano(j.avaliar("document.querySelectorAll('[data-unidade]')").map((u) => u.textContent)), [rotDist[dist]], tag);
      assert.equal(j.f.rotuloDaVelocidade(), rotVel[vel], tag);
      assert.equal(j.f.rotuloDaDistancia(), rotDist[dist], tag);

      const quadro = textosDoQuadro(j);
      assert.ok(quadro.includes(rotVel[vel]), `${tag}: rótulo no velocímetro do canvas`);
      assert.ok(!quadro.includes(rotVel[vel === "kmh" ? "mph" : "kmh"]), `${tag}: só a unidade escolhida aparece`);
      assert.equal(j.avaliar("document.documentElement.getAttribute('lang')"), { pt: "pt-BR", en: "en", es: "es" }[cod]);
      combinacoes++;
    }
  }
  assert.equal(combinacoes, 12);
});

test("mostrador analógico e placas do cenário seguem só a unidade, em todos os idiomas", () => {
  const j = novoJogo();
  const graduacao = () => { j.ctx2d.__textos.length = 0; j.f.desenharVelocimetro(60, 304, 46); return plano([...j.ctx2d.__textos].filter((t) => /^\d+$/.test(t))); };
  // Anda pela pista coletando as placas que aparecem (uma a cada 33 unidades)
  const placas = () => {
    const valores = new Set();
    for (let dist = 0; dist < 3000; dist += 7) {
      j.v.gameState.worldDistance = dist;
      const l = [];
      j.f.coletarElementos(l);
      l.filter((e) => e.tipo === "placa").forEach((e) => valores.add(e.valor));
    }
    j.v.gameState.worldDistance = 0;
    return [...valores].sort();
  };

  for (const cod of IDIOMAS) {
    idioma(j, cod);
    j.f.definirUnidade("velocidade", "kmh");
    assert.deepEqual(graduacao(), ["0", "100", "200", "300", "400", "500"], `${cod} km/h`);
    assert.deepEqual(placas(), ["100", "120", "60", "80"], `${cod} placas km/h`);

    j.f.definirUnidade("velocidade", "mph");
    assert.deepEqual(graduacao(), ["0", "100", "200", "300"], `${cod} mph`);
    assert.deepEqual(placas(), ["35", "50", "65", "75"], `${cod} placas mph`);
  }
});

test("o ponteiro do velocímetro aponta o mesmo ângulo em km/h e em mph, em qualquer idioma", () => {
  const j = novoJogo();
  j.v.gameState.gameSpeed = 9;
  const gravados = [];
  const contexto = j.avaliar("ctx");
  const original = contexto.rotate;
  contexto.rotate = (a) => { gravados.push(a); return original(a); };
  const angulo = () => { gravados.length = 0; j.f.desenharVelocimetro(60, 304, 46); return gravados.at(-1); };

  const referencia = angulo();
  for (const cod of IDIOMAS) {
    idioma(j, cod);
    for (const vel of ["kmh", "mph"]) {
      j.f.definirUnidade("velocidade", vel);
      assert.ok(Math.abs(angulo() - referencia) < 0.03, `${cod}/${vel}`);
    }
  }
});

test("trocar o idioma NÃO muda as unidades, e trocar as unidades NÃO muda o idioma", () => {
  const j = carregarJogo();
  unidades(j, "mph", "mi");
  for (const cod of IDIOMAS) {
    idioma(j, cod);
    assert.equal(j.f.obterUnidade("velocidade"), "mph");
    assert.equal(j.f.obterUnidade("distancia"), "mi");
  }
  idioma(j, "es");
  unidades(j, "kmh", "km");
  assert.equal(j.f.obterIdioma(), "es");
  assert.equal(j.elementos.playBtn.textContent, "JUGAR");
});

test("velocidade e distância são independentes entre si (mph com km, km/h com mi)", () => {
  const j = carregarJogo();
  j.f.definirUnidade("velocidade", "mph");
  assert.equal(j.f.obterUnidade("distancia"), "km");
  assert.equal(j.f.rotuloDaDistancia(), "KM");
  j.f.definirUnidade("velocidade", "kmh");
  j.f.definirUnidade("distancia", "mi");
  assert.equal(j.f.obterUnidade("velocidade"), "kmh");
  assert.equal(j.f.rotuloDaVelocidade(), "KM/H");
  assert.equal(j.f.rotuloDaDistancia(), "MI");
});

test("inglês e espanhol sozinhos mostram km/h e km (o idioma inglês não ativa mais mph)", () => {
  for (const cod of ["en", "es"]) {
    const j = novoJogo();
    j.v.gameState.gameSpeed = 5;
    idioma(j, cod);
    j.f.atualizarInterface();
    assert.equal(j.elementos.speedometer.innerHTML, "120 <small>KM/H</small>", cod);
    assert.equal(j.f.rotuloDaDistancia(), "KM", cod);
  }
});

// ============================================================
// UNIDADES — persistência e compatibilidade
// ============================================================

test("as escolhas são gravadas em chaves próprias e voltam ao fechar e abrir o jogo", () => {
  const primeira = carregarJogo();
  primeira.f.definirUnidade("velocidade", "mph");
  assert.equal(primeira.armazenamento.retroTurboSpeedUnit, "mph");
  assert.equal(primeira.armazenamento.retroTurboDistanceUnit, undefined, "só a unidade trocada é gravada");
  primeira.f.definirUnidade("distancia", "mi");
  assert.equal(primeira.armazenamento.retroTurboDistanceUnit, "mi");

  const segunda = carregarJogo({ armazenamento: { ...primeira.armazenamento } });
  assert.equal(segunda.f.obterUnidade("velocidade"), "mph");
  assert.equal(segunda.f.obterUnidade("distancia"), "mi");
  assert.equal(segunda.f.rotuloDaVelocidade(), "MPH");
  assert.deepEqual(plano(segunda.avaliar("document.querySelectorAll('[data-unidade]')").map((u) => u.textContent)), ["MI"]);
  assert.equal(segunda.f.obterIdioma(), "pt");

  segunda.f.definirUnidade("velocidade", "kmh");
  const terceira = carregarJogo({ armazenamento: { ...segunda.armazenamento } });
  assert.equal(terceira.f.obterUnidade("velocidade"), "kmh");
  assert.equal(terceira.f.obterUnidade("distancia"), "mi");
});

test("preferência de idioma e de unidades convivem: mesma página, três chaves independentes", () => {
  const j = carregarJogo();
  idioma(j, "es");
  unidades(j, "mph", "km");
  const novo = carregarJogo({ armazenamento: { ...j.armazenamento } });
  assert.equal(novo.f.obterIdioma(), "es");
  assert.equal(novo.f.obterUnidade("velocidade"), "mph");
  assert.equal(novo.f.obterUnidade("distancia"), "km");
  assert.deepEqual(Object.keys(j.armazenamento).sort(), ["retroTurboDistanceUnit", "retroTurboLanguage", "retroTurboSpeedUnit"]);
});

test("compatibilidade com a 3.3.0: preferências antigas continuam valendo e as unidades abrem no padrão", () => {
  const antigas = {
    retroTurboLanguage: "en",
    retroTurboOptions: JSON.stringify({ sound: false, particles: true }),
    retroTurboRecords: JSON.stringify([{ pontos: 777, data: "2026-11-10T12:00:00.000Z" }]),
    retroTurboMaxScore: "777",
  };
  const j = carregarJogo({ armazenamento: { ...antigas } });
  assert.equal(j.f.obterIdioma(), "en", "o idioma salvo na 3.3.0 segue valendo");
  assert.equal(j.f.obterUnidade("velocidade"), "kmh");
  assert.equal(j.f.obterUnidade("distancia"), "km");
  assert.equal(j.elementos.optionsSoundBtn.textContent, "SOUND: OFF", "opções salvas continuam");
  j.f.renderizarRecordes();
  assert.match(j.elementos.recordsList.innerHTML, /<strong>00777<\/strong>/);
  assert.deepEqual(plano(j.armazenamento), plano(antigas), "carregar não reescreve nada");

  for (const cod of ["pt", "en"]) {
    const k = carregarJogo({ armazenamento: { retroTurboLanguage: cod } });
    assert.equal(k.f.obterIdioma(), cod);
  }
});

test("a chave de opções (som e partículas) não é tocada pelas unidades", () => {
  const j = carregarJogo({ armazenamento: { retroTurboOptions: JSON.stringify({ sound: true, particles: false }) } });
  unidades(j, "mph", "mi");
  idioma(j, "es");
  assert.equal(j.armazenamento.retroTurboOptions, JSON.stringify({ sound: true, particles: false }));
  assert.equal(j.elementos.optionsParticlesBtn.textContent, "PARTÍCULAS: NO");
});

test("valores salvos inválidos voltam ao padrão sem erro (inclusive nomes perigosos e trocados de tipo)", () => {
  for (const lixo of ["xx", "", "KMH", "Mph", "km", "mi", "__proto__", "constructor", "toString", "hasOwnProperty", " mph", "mph "]) {
    const j = carregarJogo({ armazenamento: { retroTurboSpeedUnit: lixo } });
    assert.equal(j.f.obterUnidade("velocidade"), "kmh", `velocidade salva "${lixo}"`);
    assert.equal(j.avaliar("falhasDoJogo.length"), 0);
  }
  for (const lixo of ["xx", "", "KM", "Mi", "kmh", "mph", "__proto__", "constructor", "valueOf"]) {
    const j = carregarJogo({ armazenamento: { retroTurboDistanceUnit: lixo } });
    assert.equal(j.f.obterUnidade("distancia"), "km", `distância salva "${lixo}"`);
    assert.equal(j.avaliar("falhasDoJogo.length"), 0);
  }
});

test("armazenamento bloqueado: padrão km/h e km, a troca vale nesta visita e nada quebra", () => {
  const j = carregarJogo({ armazenamentoQuebrado: true });
  assert.equal(j.f.obterUnidade("velocidade"), "kmh");
  assert.doesNotThrow(() => j.f.definirUnidade("velocidade", "mph"));
  assert.doesNotThrow(() => j.f.definirUnidade("distancia", "mi"));
  assert.equal(j.f.obterUnidade("velocidade"), "mph");
  assert.equal(j.f.obterUnidade("distancia"), "mi");
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
});

test("unidade ou tipo desconhecido é ignorado: nada muda, nada é gravado, ninguém é avisado", () => {
  const j = carregarJogo();
  let avisos = 0;
  j.avaliar("globalThis.__avisos = 0; aoMudarIdioma(() => { globalThis.__avisos++; })");
  for (const [tipo, cod] of [["velocidade", "ms"], ["velocidade", "km"], ["distancia", "kmh"], ["peso", "kg"], ["velocidade", undefined],
    ["velocidade", null], ["velocidade", 5], ["distancia", "__proto__"], ["__proto__", "kmh"], ["constructor", "km"], ["velocidade", "toString"]]) {
    assert.equal(j.f.definirUnidade(tipo, cod), false, `${tipo}/${String(cod)}`);
  }
  avisos = j.avaliar("globalThis.__avisos");
  assert.equal(avisos, 0);
  assert.equal(j.f.obterUnidade("velocidade"), "kmh");
  assert.equal(j.f.obterUnidade("distancia"), "km");
  assert.equal(j.f.obterUnidade("peso"), undefined);
  assert.deepEqual(plano(j.armazenamento), {});
});

test("escolher a unidade que já está ativa regrava a preferência mas não refaz a interface", () => {
  const j = carregarJogo();
  j.avaliar("globalThis.__avisos = 0; aoMudarIdioma(() => { globalThis.__avisos++; })");
  assert.equal(j.f.definirUnidade("velocidade", "kmh"), true);
  assert.equal(j.avaliar("globalThis.__avisos"), 0);
  assert.equal(j.armazenamento.retroTurboSpeedUnit, "kmh");
  j.f.definirUnidade("velocidade", "mph");
  assert.equal(j.avaliar("globalThis.__avisos"), 1);
});

test("definirUnidade com salvar: false aplica sem gravar", () => {
  const j = carregarJogo();
  assert.equal(j.f.definirUnidade("velocidade", "mph", { salvar: false }), true);
  assert.equal(j.f.obterUnidade("velocidade"), "mph");
  assert.equal(j.armazenamento.retroTurboSpeedUnit, undefined);
});

// ============================================================
// UNIDADES — seletores na interface
// ============================================================

test("seletores de unidade: um grupo de velocidade e um de distância nas telas de opções e de pausa", () => {
  const j = carregarJogo();
  const caixas = j.avaliar("document.querySelectorAll('[data-seletor-unidades]')");
  assert.equal(caixas.length, 2);

  const vel = botoesDeUnidade(j, "velocidade");
  const dist = botoesDeUnidade(j, "distancia");
  assert.equal(vel.length, 4, "2 botões × 2 telas");
  assert.equal(dist.length, 4);
  assert.deepEqual(plano(vel.map((b) => b.textContent)), ["KM/H", "MPH", "KM/H", "MPH"]);
  assert.deepEqual(plano(dist.map((b) => b.textContent)), ["KM", "MI", "KM", "MI"]);

  [...vel, ...dist].forEach((b) => {
    const ativo = ["kmh", "km"].includes(b.getAttribute("data-unidade-codigo"));
    assert.equal(b.getAttribute("aria-pressed"), ativo ? "true" : "false");
    assert.equal(b.classList.contains("ativo"), ativo);
    assert.equal(b.type, "button");
  });
});

test("clicar nos botões de unidade escolhe a unidade (ouvinte real) e marca o botão ativo nas duas telas", () => {
  const j = carregarJogo();
  const mph = botoesDeUnidade(j, "velocidade").filter((b) => b.getAttribute("data-unidade-codigo") === "mph");
  clicar(j, mph[1]);                                  // botão do menu de pausa
  assert.equal(j.f.obterUnidade("velocidade"), "mph");
  assert.equal(j.armazenamento.retroTurboSpeedUnit, "mph");
  botoesDeUnidade(j, "velocidade").forEach((b) => assert.equal(b.classList.contains("ativo"), b.getAttribute("data-unidade-codigo") === "mph"));

  const mi = botoesDeUnidade(j, "distancia").filter((b) => b.getAttribute("data-unidade-codigo") === "mi");
  clicar(j, mi[0]);                                   // botão da tela de opções
  assert.equal(j.f.obterUnidade("distancia"), "mi");
  botoesDeUnidade(j, "distancia").forEach((b) => {
    const ativo = b.getAttribute("data-unidade-codigo") === "mi";
    assert.equal(b.classList.contains("ativo"), ativo);
    assert.equal(b.getAttribute("aria-pressed"), ativo ? "true" : "false");
  });
  assert.equal(j.f.obterUnidade("velocidade"), "mph", "velocidade não mudou ao trocar a distância");
});

test("clicar no botão de idioma continua funcionando com o ouvinte novo (e fora de qualquer botão não faz nada)", () => {
  const j = carregarJogo();
  const es = j.avaliar("document.querySelectorAll('[data-idioma]')").find((b) => b.getAttribute("data-idioma") === "es");
  clicar(j, es);
  assert.equal(j.f.obterIdioma(), "es");

  const fora = { closest: () => null };
  assert.doesNotThrow(() => j.ouvintesDoDocumento.filter(([n]) => n === "click").forEach(([, fn]) => fn({ target: fora })));
  assert.equal(j.f.obterIdioma(), "es");
});

test("os botões de unidade ficam marcados corretamente ao abrir com preferências salvas", () => {
  const j = carregarJogo({ armazenamento: { retroTurboSpeedUnit: "mph", retroTurboDistanceUnit: "mi" } });
  botoesDeUnidade(j, "velocidade").forEach((b) => assert.equal(b.classList.contains("ativo"), b.getAttribute("data-unidade-codigo") === "mph"));
  botoesDeUnidade(j, "distancia").forEach((b) => assert.equal(b.classList.contains("ativo"), b.getAttribute("data-unidade-codigo") === "mi"));
});

test("rótulos dos seletores de unidade reaproveitam VELOCIDADE/DISTÂNCIA do HUD (sem texto novo), com acessibilidade nos três idiomas", () => {
  const j = carregarJogo();
  const esperado = {
    pt: { vel: "VELOCIDADE", dist: "DISTÂNCIA", avel: "Unidade de velocidade", adist: "Unidade de distância" },
    en: { vel: "SPEED", dist: "DISTANCE", avel: "Speed unit", adist: "Distance unit" },
    es: { vel: "VELOCIDAD", dist: "DISTANCIA", avel: "Unidad de velocidad", adist: "Unidad de distancia" },
  };
  for (const cod of IDIOMAS) {
    idioma(j, cod);
    assert.equal(j.f.traduzir("acessibilidade.unidadeVelocidade"), esperado[cod].avel);
    assert.equal(j.f.traduzir("acessibilidade.unidadeDistancia"), esperado[cod].adist);

    const rotulos = j.avaliar("document.querySelectorAll('[data-i18n]')").filter((e) => e.className === "seletor-idioma-rotulo" && /^hud\./.test(e.getAttribute("data-i18n")));
    assert.equal(rotulos.length, 4, "dois grupos × duas telas");
    assert.deepEqual(plano(rotulos.map((e) => e.textContent)), [esperado[cod].vel, esperado[cod].dist, esperado[cod].vel, esperado[cod].dist]);
    const grupos = j.avaliar("document.querySelectorAll('[data-i18n-aria]')").filter((e) => /^acessibilidade\.unidade/.test(e.getAttribute("data-i18n-aria")));
    assert.deepEqual(plano(grupos.map((g) => g.getAttribute("aria-label"))), [esperado[cod].avel, esperado[cod].adist, esperado[cod].avel, esperado[cod].adist]);
  }
  const pt = j.avaliar("JSON.parse(JSON.stringify(registroDeIdiomas.pt.textos))");
  assert.equal(Object.keys(pt).filter((c) => c.startsWith("unidades.")).length, 0, "nenhuma chave nova só para os rótulos");
});

// ============================================================
// UNIDADES — troca durante a partida e “só apresentação”
// ============================================================

test("trocar as unidades no meio da partida (pausa) atualiza HUD e hodômetro na hora e não reinicia nada", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.quadros.pendentes.length = 0;
  const v = j.v;
  v.gameState.score = 4321;
  v.gameState.nivel = 3;
  v.gameState.gameSpeed = 5;
  v.powerUps.escudo = 700;
  v.combo.sequencia = 20;
  j.f.criarObstaculo("civilian", { faixa: 0 });
  j.avaliar("distanciaPercorridaKm = 3.25");
  j.f.atualizarInterface();
  j.f.atualizarExibicaoOdometro();
  const idDoLoop = j.avaliar("animationFrameId");
  const obstaculos = v.obstacles.length;
  const turbo = v.gameState.turboEnergy;

  j.f.pausarJogo();
  assert.equal(j.elementos.speedometer.innerHTML, "120 <small>KM/H</small>");
  assert.equal(j.elementos.distanceometer.textContent, "3,25");

  j.f.definirUnidade("velocidade", "mph");
  assert.equal(j.elementos.speedometer.innerHTML, "74 <small>MPH</small>", "HUD atualizou sem esperar o próximo quadro");
  j.f.definirUnidade("distancia", "mi");
  assert.equal(j.elementos.distanceometer.textContent, "2,02");
  assert.deepEqual(plano(j.avaliar("document.querySelectorAll('[data-unidade]')").map((u) => u.textContent)), ["MI"]);

  idioma(j, "en"); idioma(j, "es");
  j.f.definirUnidade("velocidade", "kmh");
  j.f.definirUnidade("distancia", "km");
  assert.equal(j.elementos.speedometer.innerHTML, "120 <small>KM/H</small>");
  assert.equal(j.elementos.distanceometer.textContent, "3,25");

  assert.equal(v.gameState.score, 4321);
  assert.equal(v.gameState.nivel, 3);
  assert.equal(v.gameState.gameSpeed, 5);
  assert.equal(v.gameState.isPaused, true, "continua pausado");
  assert.equal(v.gameState.isGameOver, false);
  assert.equal(v.powerUps.escudo, 700);
  assert.equal(v.combo.sequencia, 20);
  assert.equal(v.obstacles.length, obstaculos);
  assert.equal(v.gameState.turboEnergy, turbo);
  assert.equal(j.avaliar("distanciaPercorridaKm"), 3.25, "a distância real segue em km");
  assert.equal(j.avaliar("animationFrameId"), idDoLoop, "o mesmo loop segue rodando");
  assert.equal(j.elementos.pauseScreen.classList.contains("hidden"), false);

  j.f.continuarJogo();
  assert.equal(v.gameState.isPaused, false);
});

test("a pausa pede redesenho do canvas ao trocar uma unidade (o rótulo do velocímetro não fica velho)", () => {
  const j = carregarJogo();
  j.f.iniciarPartida();
  j.f.pausarJogo();
  j.v.gameState.pausaDesenhada = true;
  j.f.definirUnidade("velocidade", "mph");
  assert.equal(j.v.gameState.pausaDesenhada, false);
  j.v.gameState.pausaDesenhada = true;
  j.f.definirUnidade("distancia", "mi");
  assert.equal(j.v.gameState.pausaDesenhada, false);
});

test("sem partida em andamento (menu), trocar uma unidade redesenha o canvas na hora", () => {
  const j = carregarJogo();
  const antes = j.ctx2d.__chamadas.fillRect || 0;
  j.f.definirUnidade("velocidade", "mph");
  assert.ok((j.ctx2d.__chamadas.fillRect || 0) > antes);
});

test("o velocímetro mostra o mesmo valor ao trocar de unidade duas vezes seguidas com o mesmo número (0)", () => {
  const j = novoJogo();
  j.v.gameState.gameSpeed = 0;
  j.f.atualizarInterface();
  assert.equal(j.elementos.speedometer.innerHTML, "0 <small>KM/H</small>");
  j.f.definirUnidade("velocidade", "mph");
  assert.equal(j.elementos.speedometer.innerHTML, "0 <small>MPH</small>", "o rótulo muda mesmo com o número igual");
  j.f.definirUnidade("velocidade", "kmh");
  assert.equal(j.elementos.speedometer.innerHTML, "0 <small>KM/H</small>");
});

test("o hodômetro acumula sempre em km, qualquer que seja a unidade mostrada", () => {
  const rodar = (vel, dist) => {
    const j = novoJogo();
    unidades(j, vel, dist);
    j.avaliar("resetarOdometro()");
    for (let q = 0; q < 600; q++) j.f.atualizarOdometro(1000 + q * 16.6667, 120);
    return j.avaliar("distanciaPercorridaKm");
  };
  const base = rodar("kmh", "km");
  assert.ok(base > 0.3 && base < 0.4, `${base}`);
  for (const [vel, dist] of COMBINACOES) assert.equal(rodar(vel, dist), base, `${vel}/${dist}`);
});

test("a unidade NÃO altera a simulação: mesma semente, mesmos resultados nas 4 combinações × 3 idiomas, com trocas durante a partida", () => {
  const rodar = (cod, vel, dist, trocar) => {
    const j = carregarJogo({ armazenamento: { retroTurboLanguage: cod, retroTurboSpeedUnit: vel, retroTurboDistanceUnit: dist } });
    j.semente(2026);
    j.f.iniciarPartida();
    j.semente(2026);
    for (let q = 0; q < 1200 && !j.v.gameState.isGameOver; q++) {
      j.v.input.left = q % 120 < 30;
      j.v.input.right = q % 120 >= 60 && q % 120 < 90;
      j.v.gameState.isTurboActive = q % 300 < 40;
      j.f.simular(1, 1000 + q * (1000 / 60));
      if (trocar && q % 150 === 75) {
        j.f.definirUnidade("velocidade", j.f.obterUnidade("velocidade") === "kmh" ? "mph" : "kmh");
        j.f.definirUnidade("distancia", j.f.obterUnidade("distancia") === "km" ? "mi" : "km");
      }
      if (q % 20 === 0) j.f.renderizar();
    }
    const v = j.v;
    return JSON.stringify({
      score: v.gameState.score.toFixed(6), nivel: v.gameState.nivel, over: v.gameState.isGameOver,
      velocidade: v.gameState.gameSpeed.toFixed(6), turbo: v.gameState.turboEnergy.toFixed(6),
      distancia: j.avaliar("distanciaPercorridaKm").toFixed(9), x: v.player.worldX.toFixed(6),
      obstaculos: v.obstacles.map((o) => [o.type, o.z.toFixed(4), o.worldX.toFixed(4)]),
      combo: [v.combo.sequencia, v.combo.totalDeDesvios], quase: v.quase.total,
      powerups: [v.powerUps.coletados, v.powerUps.escudosUsados],
    });
  };

  const referencia = rodar("pt", "kmh", "km", false);
  for (const cod of IDIOMAS) {
    for (const [vel, dist] of COMBINACOES) assert.equal(rodar(cod, vel, dist, false), referencia, `${cod}/${vel}/${dist}`);
  }
  assert.equal(rodar("es", "kmh", "km", true), referencia, "trocando as unidades durante a partida");
  assert.equal(rodar("en", "mph", "mi", true), referencia, "trocando as unidades durante a partida (2)");
});

test("a pontuação não depende das unidades (mesmos desvios, mesmo resultado)", () => {
  const pontos = (vel, dist) => {
    const j = novoJogo();
    unidades(j, vel, dist);
    for (let i = 0; i < 6; i++) j.f.registrarDesvio({ type: "civilian" });
    j.f.registrarQuaseColisao(j.v.QUASE_COLISAO.niveis[0], { worldX: 1 });
    return [j.v.gameState.score, j.v.combo.sequencia, j.v.quase.total];
  };
  const base = pontos("kmh", "km");
  for (const [vel, dist] of COMBINACOES) assert.deepEqual(pontos(vel, dist), base, `${vel}/${dist}`);
});

test("recordes: a lista guardada e a exibida não dependem das unidades (e acompanham a troca sem se perder)", () => {
  const registros = JSON.stringify([{ pontos: 1234, data: "2026-11-10T12:00:00.000Z" }, { pontos: 99, data: "2026-11-09T12:00:00.000Z" }]);
  const j = carregarJogo({ armazenamento: { retroTurboRecords: registros, retroTurboMaxScore: "1234" } });
  j.f.renderizarRecordes();
  const antes = j.elementos.recordsList.innerHTML;
  assert.match(antes, /<strong>01234<\/strong>/);

  for (const [vel, dist] of COMBINACOES) {
    unidades(j, vel, dist);
    assert.equal(j.elementos.recordsList.innerHTML, antes, `${vel}/${dist}: lista igual`);
    assert.equal(j.armazenamento.retroTurboRecords, registros, "recordes guardados intactos");
    assert.equal(j.armazenamento.retroTurboMaxScore, "1234");
  }

  // Gravar um recorde novo com milhas escolhidas guarda o mesmo formato de sempre
  j.f.checkAndSaveRecord(555);
  const lista = JSON.parse(j.armazenamento.retroTurboRecords);
  assert.deepEqual(lista.map((r) => r.pontos), [1234, 555, 99]);
  assert.deepEqual(Object.keys(lista[0]).sort(), ["data", "pontos"]);
});

test("recordes abertos refazem a lista ao trocar uma unidade (o mesmo gancho do idioma)", () => {
  const j = carregarJogo({ armazenamento: { retroTurboRecords: JSON.stringify([{ pontos: 10, data: "2026-11-10T12:00:00.000Z" }]) } });
  j.f.renderizarRecordes();
  j.elementos.recordsList.innerHTML = "marcador";
  j.f.definirUnidade("velocidade", "mph");
  assert.match(j.elementos.recordsList.innerHTML, /<strong>00010<\/strong>/);
});

test("fim de jogo e resumo da partida seguem iguais com qualquer unidade", () => {
  const j = novoJogo();
  for (let i = 0; i < 4; i++) j.f.registrarDesvio({ type: "civilian" });
  const base = j.f.resumoDaPartida();
  for (const [vel, dist] of COMBINACOES) { unidades(j, vel, dist); assert.equal(j.f.resumoDaPartida(), base); }
});

// ============================================================
// Arquitetura: sem sistema paralelo, sem texto duplicado
// ============================================================

test("as unidades moram num só lugar: nada de bloco 'unidades' nos arquivos de idioma, nem lista de placas", () => {
  for (const cod of IDIOMAS) {
    const fonte = lerArquivo(`js/idiomas/textos/${cod}.js`);
    assert.doesNotMatch(fonte, /fator\s*:/, `${cod}.js não define fatores de conversão`);
    assert.doesNotMatch(fonte, /mostrador\s*:/, `${cod}.js não define graduação do velocímetro`);
    assert.doesNotMatch(fonte, /limites\s*:/, `${cod}.js não define placas de velocidade`);
    assert.doesNotMatch(fonte, /unidades\s*:\s*\{\s*velocidade\s*:\s*\{/, `${cod}.js não define o catálogo de unidades`);
  }
  const j = carregarJogo();
  for (const cod of IDIOMAS) assert.equal(j.avaliar(`registroDeIdiomas.${cod}.unidades`), undefined);
  assert.equal(j.avaliar("typeof unidadesDoIdioma"), "undefined");
  assert.equal(j.avaliar("typeof traduzirLista('cenario.limites').length"), "number");
  assert.deepEqual(plano(j.f.traduzirLista("cenario.limites")), [], "a lista de placas não existe mais nos textos");
});

test("os módulos de idiomas existentes foram reaproveitados: unidades usam o mesmo aviso de ouvintes do idioma", () => {
  const unidadesJs = lerArquivo("js/idiomas/unidades.js");
  assert.match(unidadesJs, /avisarOuvintes\(\)/);
  assert.doesNotMatch(unidadesJs, /ouvintes\s*=|new Set|addEventListener/, "sem sistema de eventos próprio");
  assert.match(lerArquivo("js/idiomas/nucleo.js"), /function avisarOuvintes\(\)/);
  assert.equal(lerArquivo("js/idiomas/nucleo.js").match(/function avisarOuvintes/g).length, 1);
});

test("index.html: unidades.js vem antes de formatacao.js, es.js depois de en.js, e tudo antes de interface.js", () => {
  const scripts = [...lerArquivo("index.html").matchAll(/<script[^>]*\ssrc="([^"?]+)/g)].map((m) => m[1]);
  const pos = (nome) => scripts.indexOf(nome);
  assert.ok(pos("js/idiomas/nucleo.js") < pos("js/idiomas/unidades.js"));
  assert.ok(pos("js/idiomas/unidades.js") < pos("js/idiomas/formatacao.js"));
  assert.ok(pos("js/idiomas/textos/en.js") < pos("js/idiomas/textos/es.js"));
  assert.ok(pos("js/idiomas/textos/es.js") < pos("js/idiomas/interface.js"));
  assert.ok(pos("js/idiomas/interface.js") < pos("js/config.js"));
  assert.equal(scripts.at(-1), "js/inicio/pronto.js");
});

test("index.html: os seletores de unidade existem só em OPÇÕES e na PAUSA, sem texto solto", () => {
  const html = lerArquivo("index.html");
  assert.equal((html.match(/data-seletor-unidades/g) || []).length, 2);
  const bloco = (id) => html.slice(html.indexOf(`id="${id}"`), html.indexOf("</section>", html.indexOf(`id="${id}"`)));
  assert.match(bloco("optionsScreen"), /data-seletor-unidades/);
  assert.match(bloco("pauseScreen"), /data-seletor-unidades/);
  assert.doesNotMatch(bloco("startScreen"), /data-seletor-unidades/);
});

test("CSS dos seletores de unidade existe e reaproveita as classes dos botões de idioma", () => {
  const css = lerArquivo("css/estilos/layout.css");
  assert.match(css, /\.seletor-unidades\s*\{/);
  assert.match(css, /\.unidade-btn\s*\{/);
  const interfaceJs = lerArquivo("js/idiomas/interface.js");
  assert.match(interfaceJs, /idioma-btn unidade-btn/);
});

// ============================================================
// Preservação do jogo
// ============================================================

test("valores do jogo intactos na 3.5.0: física, hitbox, power-ups, pontuação, versão e fator de conversão", () => {
  const j = carregarJogo();
  const { POWERUPS, TIPOS_DE_POWERUP: T } = j.v;
  assert.equal(JSON.stringify(POWERUPS), JSON.stringify({ primeiroEm: 420, intervalo: [660, 960], maximoNaPista: 1, larguraDeColeta: 0.6, profundidadeDeColeta: 0.25, janelaSegura: 3.2, invulnerabilidade: 75, suavizacaoDoTempo: 0.12 }));
  assert.equal(T.nitro.energia, 40);
  assert.equal(T.escudo.duracao, 900);
  assert.equal(T.lentidao.fator, 0.6);
  assert.equal(T.dobro.multiplicador, 2);
  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.v.QUASE_COLISAO.niveis.map((n) => `${n.nome}:${n.pontos}`).join(), "RENTE:120,PERTO:50,QUASE:20");
  assert.equal(j.avaliar("VERSAO_DO_JOGO"), "3.5.0");
  assert.equal(JSON.parse(lerArquivo("package.json")).version, "3.5.0");
});

test("os três idiomas renderizam partidas completas com unidades trocadas, sem erro (40 quadros desenhados em cada)", () => {
  for (const cod of IDIOMAS) {
    for (const [vel, dist] of [["kmh", "km"], ["mph", "mi"]]) {
      const j = carregarJogo({ armazenamento: { retroTurboLanguage: cod, retroTurboSpeedUnit: vel, retroTurboDistanceUnit: dist } });
      j.semente(5);
      j.f.iniciarPartida();
      for (let q = 0; q < 2400 && !j.v.gameState.isGameOver; q++) {
        j.f.simular(1, 1000 + q * (1000 / 60));
        if (q % 60 === 0) j.f.renderizar();
      }
      assert.equal(j.avaliar("falhasDoJogo.length"), 0, `${cod}/${vel}/${dist}`);
    }
  }
});

test("todo o HTML traduzido existe nos três idiomas: nenhuma chave 'crua' aparece em espanhol, inglês ou português", () => {
  const { pt, en, es } = pacotes();
  const html = lerArquivo("index.html");
  const chaves = new Set([...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]));
  ["acessibilidade.unidadeVelocidade", "acessibilidade.unidadeDistancia"].forEach((c) => chaves.add(c));
  for (const chave of chaves) for (const [cod, pacote] of [["pt", pt], ["en", en], ["es", es]]) assert.ok(chave in pacote, `${cod}: ${chave}`);
});
