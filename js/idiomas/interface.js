/* js/idiomas/interface.js
   Liga o sistema de idiomas ao HTML:
     data-i18n="chave"          troca o texto do elemento
     data-i18n-aria="chave"     troca o aria-label (leitores de tela)
     data-unidade="velocidade"  rótulo da unidade (KM/H ou MPH, KM ou MI)
     data-seletor-idioma        lugar onde nasce o seletor de idioma
     data-seletor-unidades      lugar onde nascem os seletores de unidade (velocidade e distância)
   e atualiza tudo quando o idioma ou uma unidade muda, sem reiniciar a partida.

   Os textos que o JavaScript escreve (opções, HUD, resumo...) cuidam de si:
   cada módulo se registra com aoMudarIdioma(...).
*/

function aplicarTraducoesNoDom(raiz = document) {
  raiz.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = traduzir(el.getAttribute("data-i18n"));
  });

  raiz.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", traduzir(el.getAttribute("data-i18n-aria")));
  });

  raiz.querySelectorAll("[data-unidade]").forEach((el) => {
    const tipo = el.getAttribute("data-unidade");

    el.textContent = tipo === "velocidade" ? rotuloDaVelocidade() : rotuloDaDistancia();
  });

  // Idioma do documento: leitores de tela e corretores usam isto
  if (document.documentElement) document.documentElement.setAttribute("lang", dadosDoIdioma().htmlLang);
}

// ----- Seletor de idioma -----
// Um botão por idioma registrado (o nome aparece no próprio idioma). Criado
// por código: adicionar um idioma novo não exige mexer no HTML.

function criarSeletoresDeIdioma() {
  document.querySelectorAll("[data-seletor-idioma]").forEach((caixa) => {
    caixa.textContent = "";
    caixa.setAttribute("role", "group");
    caixa.setAttribute("data-i18n-aria", "acessibilidade.idioma");

    const rotulo = document.createElement("span");
    rotulo.className = "seletor-idioma-rotulo";
    rotulo.setAttribute("data-i18n", "idioma.rotulo");

    const botoes = document.createElement("div");
    botoes.className = "seletor-idioma-botoes";

    idiomasDisponiveis().forEach(({ codigo, nome }) => {
      const botao = document.createElement("button");

      botao.type = "button";
      botao.className = "idioma-btn";
      botao.setAttribute("data-idioma", codigo);
      botao.setAttribute("lang", dadosDoIdioma(codigo).htmlLang);
      botao.textContent = nome;
      botoes.appendChild(botao);
    });

    caixa.append(rotulo, botoes);
  });
}

function atualizarSeletoresDeIdioma() {
  const atual = obterIdioma();

  document.querySelectorAll("[data-idioma]").forEach((botao) => {
    const ativo = botao.getAttribute("data-idioma") === atual;

    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-pressed", ativo ? "true" : "false");
  });
}

// ----- Seletores de unidade -----
// Um grupo por tipo (velocidade, distância) com um botão por unidade do catálogo
// (unidades.js). Reaproveitam o visual dos botões de idioma.

function criarSeletoresDeUnidade() {
  document.querySelectorAll("[data-seletor-unidades]").forEach((caixa) => {
    caixa.textContent = "";

    Object.keys(TIPOS_DE_UNIDADE).forEach((tipo) => {
      const grupo = document.createElement("div");
      grupo.className = "seletor-unidade";
      grupo.setAttribute("role", "group");
      grupo.setAttribute("data-i18n-aria", tipo === "velocidade" ? "acessibilidade.unidadeVelocidade" : "acessibilidade.unidadeDistancia");

      const rotulo = document.createElement("span");
      rotulo.className = "seletor-idioma-rotulo";
      // Mesmas palavras do HUD (VELOCIDADE / DISTÂNCIA): nenhum texto novo
      rotulo.setAttribute("data-i18n", tipo === "velocidade" ? "hud.velocidade" : "hud.distancia");

      const botoes = document.createElement("div");
      botoes.className = "seletor-idioma-botoes";

      unidadesDisponiveis(tipo).forEach(({ codigo, rotulo: nome }) => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "idioma-btn unidade-btn";
        botao.setAttribute("data-unidade-tipo", tipo);
        botao.setAttribute("data-unidade-codigo", codigo);
        botao.textContent = nome;
        botoes.appendChild(botao);
      });

      grupo.append(rotulo, botoes);
      caixa.appendChild(grupo);
    });
  });
}

function atualizarSeletoresDeUnidade() {
  document.querySelectorAll("[data-unidade-codigo]").forEach((botao) => {
    const tipo = botao.getAttribute("data-unidade-tipo");
    const ativo = botao.getAttribute("data-unidade-codigo") === obterUnidade(tipo);

    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-pressed", ativo ? "true" : "false");
  });
}

function iniciarIdiomas() {
  iniciarIdioma();
  iniciarUnidades();

  aoMudarIdioma(() => {
    aplicarTraducoesNoDom();
    atualizarSeletoresDeIdioma();
    atualizarSeletoresDeUnidade();
  });

  criarSeletoresDeIdioma();
  criarSeletoresDeUnidade();
  aplicarTraducoesNoDom();
  atualizarSeletoresDeIdioma();
  atualizarSeletoresDeUnidade();

  document.addEventListener("click", (evento) => {
    if (!evento.target.closest) return;

    const botao = evento.target.closest("[data-idioma]");

    if (botao) {
      definirIdioma(botao.getAttribute("data-idioma"));
      return;
    }

    const unidade = evento.target.closest("[data-unidade-codigo]");

    if (unidade) definirUnidade(unidade.getAttribute("data-unidade-tipo"), unidade.getAttribute("data-unidade-codigo"));
  });
}

iniciarIdiomas();
