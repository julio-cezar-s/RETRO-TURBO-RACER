// Versão 4.0.0 — preparação para Android com Capacitor. A versão web NÃO muda: aqui se confere a
// configuração, a cópia www/, os caminhos dos recursos locais, o script de tela cheia e que nada do jogo foi alterado.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { carregarJogo, scriptsDoIndex, RAIZ } = require("./helpers/carregar-jogo");
const { prepararWeb, verificarReferencias, referenciasLocais, listarArquivos, ITENS_DO_JOGO, ITENS_OPCIONAIS } = require("../scripts/preparar-web");

// Itens do jogo que existem neste projeto (assets/ só tem pastas vazias e some num repositório clonado)
const itensPresentes = () => ITENS_DO_JOGO.filter((i) => fs.existsSync(path.join(RAIZ, i)));
const { gerarMainActivity, configurarAndroid, MARCA } = require("../scripts/configurar-android");

const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const hash = (arq) => crypto.createHash("sha256").update(fs.readFileSync(arq)).digest("hex");
const pastaTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rtr-"));

// ============================================================
// 1. Capacitor: configuração e scripts
// ============================================================

test("capacitor.config.json — válido, aponta para www e tem só o necessário (sem inventar decisões)", () => {
  const c = JSON.parse(ler("capacitor.config.json"));

  assert.equal(c.appName, "Retro Turbo Racer");
  assert.equal(c.webDir, "www");
  assert.match(c.appId, /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "appId no formato de pacote Android");
  assert.deepEqual(Object.keys(c).sort(), ["appId", "appName", "webDir"], "sem plugins, servidor, orientação ou outras decisões");
  assert.equal(c.server, undefined, "o esquema/endereço do servidor local fica no padrão do Capacitor");
});

test("package.json — dependências do Capacitor 7 (core, android, cli) e nenhuma a mais", () => {
  const p = JSON.parse(ler("package.json"));

  assert.deepEqual(Object.keys(p.dependencies).sort(), ["@capacitor/android", "@capacitor/core"]);
  assert.deepEqual(Object.keys(p.devDependencies), ["@capacitor/cli"]);
  for (const v of [...Object.values(p.dependencies), ...Object.values(p.devDependencies)]) assert.match(v, /^\^7\.\d+\.\d+$/);
  assert.ok(Number(p.engines.node.replace(/\D/g, "")) >= 20, "Node 20+ (exigência do Capacitor 7)");
  assert.equal(p.private, true);
});

test("package.json — comandos de Android: preparar, adicionar, sincronizar, abrir e executar", () => {
  const s = JSON.parse(ler("package.json")).scripts;

  assert.equal(s["android:preparar"], "node scripts/preparar-web.js");
  assert.equal(s["android:adicionar"], "npm run android:preparar && cap add android && node scripts/configurar-android.js");
  assert.equal(s["android:sync"], "npm run android:preparar && cap sync android");
  assert.equal(s["android:abrir"], "cap open android");
  assert.equal(s["android:executar"], "npm run android:sync && cap run android");
  assert.equal(s.test, 'node --test "tests/*.test.js"', "npm test continua o mesmo");
});

test(".gitignore — node_modules e a cópia www/ gerada ficam fora do controle de versão", () => {
  const linhas = ler(".gitignore").split("\n").map((l) => l.trim());
  assert.ok(linhas.includes("node_modules/") && linhas.includes("www/"));
});

// ============================================================
// 2. A cópia www/ é fiel e completa
// ============================================================

test("preparar-web — copia index.html, css, js, audio e assets SEM alterar nenhum byte", () => {
  const destino = path.join(pastaTemp(), "www");
  const r = prepararWeb({ destino });

  assert.deepEqual(r.problemas, []);
  assert.ok(r.arquivos.length > 100);

  for (const a of r.arquivos) assert.equal(hash(path.join(destino, a)), hash(path.join(RAIZ, a)), `${a} idêntico`);
  assert.deepEqual(fs.readdirSync(destino).sort(), itensPresentes().sort());
});

test("preparar-web — todos os arquivos de runtime do jogo estão na cópia (nenhum faltando)", () => {
  const destino = path.join(pastaTemp(), "www");
  const r = prepararWeb({ destino });
  const esperados = [];

  for (const item of itensPresentes()) {
    const origem = path.join(RAIZ, item);
    if (fs.statSync(origem).isDirectory()) esperados.push(...listarArquivos(origem).filter((a) => !a.endsWith(".md")).map((a) => `${item}/${a}`));
    else esperados.push(item);
  }

  assert.deepEqual(r.arquivos, esperados.sort());
  for (const mp3 of ["audio/batidaCarro.mp3", "audio/freadaCarro.mp3", "audio/policia.mp3"]) assert.ok(r.arquivos.includes(mp3), mp3);
  for (const s of scriptsDoIndex()) assert.ok(r.arquivos.includes(s), s);
});

test("preparar-web — deixa de fora testes, scripts, node_modules, android, .git e documentação", () => {
  const destino = path.join(pastaTemp(), "www");
  const r = prepararWeb({ destino });

  for (const a of r.arquivos) {
    assert.doesNotMatch(a, /^(tests|scripts|node_modules|android|www|\.git)\//, a);
    assert.doesNotMatch(a, /\.md$/, a);
    assert.doesNotMatch(a, /(^|\/)(package\.json|capacitor\.config\.json|\.gitignore)$/, a);
  }
});

test("preparar-web — é repetível: roda de novo e apaga o que sobrou da vez anterior", () => {
  const destino = path.join(pastaTemp(), "www");
  prepararWeb({ destino });
  fs.writeFileSync(path.join(destino, "sobra.txt"), "lixo");
  fs.writeFileSync(path.join(destino, "js", "velho.js"), "lixo");

  const r = prepararWeb({ destino });
  assert.ok(!r.arquivos.includes("sobra.txt") && !r.arquivos.includes("js/velho.js"));
});

test("preparar-web — denuncia referência quebrada (arquivo apagado, caminho absoluto, endereço externo)", () => {
  const destino = path.join(pastaTemp(), "www");
  prepararWeb({ destino });

  fs.rmSync(path.join(destino, "audio", "policia.mp3"));
  assert.ok(verificarReferencias(destino).some((p) => p.includes("audio/policia.mp3") && p.includes("não encontrado")));

  const html = fs.readFileSync(path.join(destino, "index.html"), "utf8");
  fs.writeFileSync(path.join(destino, "index.html"), html.replace("</body>", '<script src="/js/x.js"></script><script src="https://cdn.exemplo.com/a.js"></script></body>'));
  const p = verificarReferencias(destino).join("\n");
  assert.match(p, /\/js\/x\.js: caminho absoluto/);
  assert.match(p, /cdn\.exemplo\.com.*endereço externo/);
});

test("preparar-web — recusa montar a www se faltar parte do jogo (menos assets/, que é opcional)", () => {
  const raizVazia = pastaTemp();
  assert.throws(() => prepararWeb({ raiz: raizVazia, destino: path.join(pastaTemp(), "www") }), /Não encontrei "index\.html"/);

  // Sem a pasta assets (como num repositório clonado do GitHub, que não guarda pasta vazia) funciona normalmente
  const raiz = pastaTemp();
  for (const item of ITENS_DO_JOGO.filter((i) => !ITENS_OPCIONAIS.includes(i))) fs.cpSync(path.join(RAIZ, item), path.join(raiz, item), { recursive: true });
  const r = prepararWeb({ raiz, destino: path.join(pastaTemp(), "www") });
  assert.deepEqual(r.problemas, []);
  assert.ok(!r.arquivos.some((a) => a.startsWith("assets/")));
});

// ============================================================
// 3. Caminhos dos recursos locais (ambiente Android: https://localhost, sem internet, maiúsculas importam)
// ============================================================

test("caminhos — todo recurso do index.html, dos CSS e do áudio é relativo, existe e tem a MESMA caixa de letras", () => {
  const refs = referenciasLocais(RAIZ);
  assert.ok(refs.length > 100, `${refs.length} referências`);

  for (const ref of refs) {
    assert.doesNotMatch(ref, /^([a-z]+:)?\/\//i, `${ref}: endereço externo`);
    assert.ok(!ref.startsWith("/"), `${ref}: caminho absoluto`);

    // Sistema de arquivos do Android diferencia maiúsculas: confere cada parte do caminho com o nome real
    let pasta = RAIZ;
    for (const parte of ref.split("/")) {
      assert.ok(fs.readdirSync(pasta).includes(parte), `${ref}: "${parte}" não existe com essa grafia exata`);
      pasta = path.join(pasta, parte);
    }
  }
});

test("caminhos — nenhum arquivo do jogo usa file://, http(s):// ou caminho absoluto para carregar recurso", () => {
  const permitidoHtml = /^\s*$/;
  const arquivos = ["index.html", ...scriptsDoIndex(), ...listarArquivos(path.join(RAIZ, "css")).map((a) => `css/${a}`)];

  for (const a of arquivos) {
    const t = ler(a).replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    assert.doesNotMatch(t, /file:\/\//, a);
    assert.doesNotMatch(t, /(?:src|href)="(?:https?:)?\/\//, a);
    assert.doesNotMatch(t, /fetch\(|XMLHttpRequest|importScripts|new Worker\(|serviceWorker/, `${a}: pedido de rede/worker`);
    assert.doesNotMatch(t, /url\(\s*["']?\//, `${a}: url() absoluta`);
    assert.doesNotMatch(t, /new Audio\(\s*['"]\//, `${a}: áudio com caminho absoluto`);
    void permitidoHtml;
  }
});

test("caminhos — os três áudios são pedidos por caminho relativo e existem no projeto e na cópia", () => {
  const j = carregarJogo();
  const destino = path.join(pastaTemp(), "www");
  prepararWeb({ destino });

  for (const [nome, arquivo] of [["freada", "audio/freadaCarro.mp3"], ["policia", "audio/policia.mp3"], ["batida", "audio/batidaCarro.mp3"]]) {
    assert.ok(j.v.gerenciadorAudio.sons[nome].src.endsWith(arquivo), nome);
    assert.ok(fs.existsSync(path.join(RAIZ, arquivo)) && fs.existsSync(path.join(destino, arquivo)), arquivo);
    assert.ok(fs.statSync(path.join(destino, arquivo)).size > 10000, `${arquivo} não está vazio`);
  }
});

test("meta viewport e cor do tema continuam no index.html (tela toda e área segura do entalhe)", () => {
  const html = ler("index.html");
  assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover/);
  assert.match(html, /<meta name="theme-color" content="#080810"/);
  assert.match(html, /user-scalable=no/);
});

// ============================================================
// 4. Tela cheia no Android (script que configura o MainActivity)
// ============================================================

const MAIN_ACTIVITY_DO_CAPACITOR = `package com.example.retroturboracer;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
`;

function projetoAndroidFalso(conteudo = MAIN_ACTIVITY_DO_CAPACITOR, pacote = "com.example.retroturboracer") {
  const projeto = path.join(pastaTemp(), "android");
  const pasta = path.join(projeto, "app", "src", "main", "java", ...pacote.split("."));
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, "MainActivity.java"), conteudo);
  return { projeto, arquivo: path.join(pasta, "MainActivity.java") };
}

test("tela cheia — o MainActivity gerado esconde as barras do sistema e usa o entalhe, mantendo o pacote", () => {
  const java = gerarMainActivity("br.com.exemplo.corrida");

  assert.match(java, /^package br\.com\.exemplo\.corrida;/);
  assert.match(java, /public class MainActivity extends BridgeActivity \{/);
  assert.match(java, /WindowInsetsControllerCompat/);
  assert.match(java, /controle\.hide\(WindowInsetsCompat\.Type\.systemBars\(\)\)/);
  assert.match(java, /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);
  assert.match(java, /onWindowFocusChanged/);
  assert.match(java, /LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES/);
  assert.match(java, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.P/);
  assert.ok(java.includes(MARCA));

  // Sem decisões inventadas: orientação, tela ligada, voltar, cores de barra
  assert.doesNotMatch(java, /setRequestedOrientation|SCREEN_ORIENTATION|FLAG_KEEP_SCREEN_ON|OnBackPressed|setStatusBarColor|setNavigationBarColor/);
  // Chaves e parênteses balanceados (o Java não é compilado aqui)
  for (const [a, b] of [["{", "}"], ["(", ")"]]) assert.equal(java.split(a).length, java.split(b).length, `${a}${b} balanceados`);
});

test("tela cheia — configurarAndroid reescreve o MainActivity padrão e preserva o pacote do projeto", () => {
  const { projeto, arquivo } = projetoAndroidFalso(MAIN_ACTIVITY_DO_CAPACITOR.replaceAll("com.example.retroturboracer", "br.com.meujogo.corrida"), "br.com.meujogo.corrida");

  const r = configurarAndroid({ projeto });
  assert.equal(r.estado, "configurado");
  assert.match(fs.readFileSync(arquivo, "utf8"), /^package br\.com\.meujogo\.corrida;/);
  assert.match(fs.readFileSync(arquivo, "utf8"), /ocultarBarrasDoSistema/);
});

test("tela cheia — é idempotente: rodar de novo não muda o arquivo", () => {
  const { projeto, arquivo } = projetoAndroidFalso();
  configurarAndroid({ projeto });
  const depois = fs.readFileSync(arquivo, "utf8");

  assert.equal(configurarAndroid({ projeto }).estado, "ja-configurado");
  assert.equal(fs.readFileSync(arquivo, "utf8"), depois);
});

test("tela cheia — recusa mexer em MainActivity desconhecido e avisa quando falta o projeto Android", () => {
  const outro = "package a.b;\n\npublic class MainActivity extends AppCompatActivity { /* meu código */ }\n";
  const { projeto, arquivo } = projetoAndroidFalso(outro, "a.b");

  assert.throws(() => configurarAndroid({ projeto }), /não parece o MainActivity padrão/);
  assert.equal(fs.readFileSync(arquivo, "utf8"), outro, "arquivo intacto");
  assert.throws(() => configurarAndroid({ projeto: path.join(pastaTemp(), "inexistente") }), /npm run android:adicionar/);
});

// ============================================================
// 5. A versão web continua exatamente como antes
// ============================================================

test("versão web: o jogo carrega e roda sem nenhum erro, e a raiz continua com index.html, css, js, audio e assets", () => {
  const j = carregarJogo();
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
  assert.doesNotThrow(() => j.f.iniciarPartida());

  for (const item of ITENS_DO_JOGO.filter((i) => !ITENS_OPCIONAIS.includes(i))) assert.ok(fs.existsSync(path.join(RAIZ, item)), item);
  assert.ok(fs.existsSync(path.join(RAIZ, "index.html")), "index.html continua na raiz (abre direto no navegador)");
});

test("nenhum arquivo do jogo (js/, css/, index.html salvo a versão) menciona Capacitor, Android ou plugin nativo", () => {
  const arquivos = [...scriptsDoIndex(), ...listarArquivos(path.join(RAIZ, "css")).map((a) => `css/${a}`), "index.html"];

  for (const a of arquivos) assert.doesNotMatch(ler(a).replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, ""), /capacitor|Capacitor|window\.Android|cordova/, a);
});

test("controles, turbo, recompensas, idiomas, áudio e layout seguem como na 3.9.0 (valores e módulos)", () => {
  const j = carregarJogo();

  assert.equal(j.v.HITBOX_WIDTH_FACTOR, 0.84);
  assert.equal(j.avaliar("KMH_PER_SPEED"), 24);
  assert.equal(j.avaliar("WORLD_SPEED_FACTOR"), 0.023);
  assert.equal(j.avaliar("RECOMPENSAS.turbo.energia"), 30);
  assert.equal(j.avaliar("AJUSTE_DE_SOM.batida.volume"), 0.4);
  assert.equal(j.avaliar("obterProvedorDeAnuncios().nome"), "simulado", "anúncio simulado: sem AdMob");
  assert.deepEqual(["pt", "en", "es"].every((i) => j.f.traduzir.length >= 0 && typeof i === "string"), true);

  const html = ler("index.html");
  for (const id of ["turboBtn", "rewardTurboBtn", "rewardContinueBtn", "adScreen", "gameCanvas", "game-container"]) assert.match(html, new RegExp(`id="${id}"`));
});

test("sem AdMob: nenhuma dependência, configuração ou código de anúncio real no pacote", () => {
  const p = ler("package.json") + ler("capacitor.config.json");
  assert.doesNotMatch(p, /admob|google-mobile-ads|capacitor-community|ca-app-pub/i);
  assert.doesNotMatch(ler("scripts/configurar-android.js") + ler("scripts/preparar-web.js"), /admob|ca-app-pub|MobileAds/i);
});

// ============================================================
// 6. Versão e documentação
// ============================================================

test("versão 4.0.0 em todos os lugares e LEIA-ME documenta os comandos do Android", () => {
  const html = ler("index.html");
  const versoes = new Set([...html.matchAll(/\?v=([\w.]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...versoes], ["4.0.0"]);
  assert.equal(carregarJogo().avaliar("VERSAO_DO_JOGO"), "4.0.0");
  assert.equal(JSON.parse(ler("package.json")).version, "4.0.0");

  const leia = ler("js/LEIA-ME.md");
  assert.match(leia, /4\.0\.0/);
  for (const comando of ["npm install", "npm run android:adicionar", "npm run android:sync", "npm run android:abrir", "npm run android:executar", "npx cap", "appId"]) {
    assert.ok(leia.includes(comando), `LEIA-ME sem "${comando}"`);
  }
});
