// Organização para envio pelo GitHub Web (Upload files): no máximo 100 arquivos por envio e por pasta,
// sem mexer na estrutura lógica do projeto, nos caminhos, nem no que o jogo (web e Android) precisa.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { carregarJogo, scriptsDoIndex, RAIZ } = require("./helpers/carregar-jogo");
const { planejar, verificar, montar, descrever, listarArquivosDoProjeto, LIMITE_POR_ENVIO, LOTES } = require("../scripts/envio-github");
const { prepararWeb, referenciasLocais } = require("../scripts/preparar-web");

const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8");
const hash = (arq) => crypto.createHash("sha256").update(fs.readFileSync(arq)).digest("hex");
const pastaTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rtr-envio-"));
const contar = (lista, f) => lista.reduce((m, a) => m.set(f(a), (m.get(f(a)) || 0) + 1), new Map());
const pastaDe = (a) => path.posix.dirname(a);

// Cria um projeto de mentira com N arquivos por pasta (para testar o plano sem depender do projeto real)
function projetoFalso(pastas) {
  const raiz = pastaTemp();
  for (const [pasta, n] of Object.entries(pastas)) {
    fs.mkdirSync(path.join(raiz, pasta), { recursive: true });
    for (let i = 0; i < n; i++) fs.writeFileSync(path.join(raiz, pasta, `a${String(i).padStart(3, "0")}.js`), `// ${i}\n`);
  }
  return raiz;
}

// ============================================================
// 1. Contagem: nenhuma pasta passa do limite
// ============================================================

test("o projeto tem arquivos suficientes para exigir plano, mas NENHUMA pasta passa de 100 arquivos", () => {
  const arquivos = listarArquivosDoProjeto();
  const porPasta = contar(arquivos, pastaDe);

  assert.ok(arquivos.length > LIMITE_POR_ENVIO, `${arquivos.length} arquivos no total: um envio único passaria de 100`);
  for (const [pasta, n] of porPasta) assert.ok(n <= LIMITE_POR_ENVIO, `${pasta}: ${n} arquivos`);
  assert.ok(Math.max(...porPasta.values()) <= 20, "a maior pasta tem poucos arquivos: não foi preciso dividir nenhuma por limite");
});

test("só a pasta js/, tomada inteira (com subpastas), passa de 100 arquivos: arrastá-la de uma vez estouraria o limite", () => {
  const arquivos = listarArquivosDoProjeto();
  const pastasDeTopo = contar(arquivos, (a) => (a.includes("/") ? a.split("/")[0] : "(raiz)"));

  const acima = [...pastasDeTopo].filter(([, n]) => n > LIMITE_POR_ENVIO).map(([p]) => p);
  assert.deepEqual(acima, ["js"]);
});

// ============================================================
// 2. O plano: lotes de no máximo 100 arquivos, completos e sem repetição
// ============================================================

test("plano — cada arquivo do projeto está em exatamente um lote e nenhum lote ou pasta passa de 100", () => {
  const plano = planejar();
  const todos = plano.lotes.flatMap((l) => l.arquivos);

  assert.deepEqual(verificar(plano), []);
  assert.equal(todos.length, plano.total);
  assert.equal(new Set(todos).size, todos.length, "nada repetido");
  assert.deepEqual([...todos].sort(), listarArquivosDoProjeto(), "nada de fora");
  for (const l of plano.lotes) {
    assert.ok(l.arquivos.length <= LIMITE_POR_ENVIO, `lote ${l.numero}: ${l.arquivos.length}`);
    for (const [pasta, n] of l.porPasta) assert.ok(n <= LIMITE_POR_ENVIO, `lote ${l.numero}, ${pasta}: ${n}`);
  }
});

test("plano — são 3 lotes lógicos (base+testes, motor do jogo, sistemas e interface) e não há lote extra", () => {
  const plano = planejar();

  assert.equal(plano.lotes.length, LOTES.length);
  assert.equal(plano.sobras.length, 0, "todo arquivo cabe nos lotes lógicos");
  assert.match(plano.lotes[0].nome, /Base/);
  assert.match(plano.lotes[1].nome, /Motor/);
  assert.match(plano.lotes[2].nome, /interface/);
  for (const l of plano.lotes) assert.ok(l.arquivos.length <= 60, `lote ${l.numero} com folga: ${l.arquivos.length}`);
});

test("plano — a organização é lógica: cada pasta fica INTEIRA em um único lote (nada de arquivo solto sorteado)", () => {
  const plano = planejar();
  const loteDaPasta = new Map();

  for (const l of plano.lotes) {
    for (const a of l.arquivos) {
      const pasta = pastaDe(a);
      if (loteDaPasta.has(pasta)) assert.equal(loteDaPasta.get(pasta), l.numero, `${pasta} dividida entre lotes`);
      loteDaPasta.set(pasta, l.numero);
    }
  }

  // Tudo o que é de uma mesma pasta de assunto vai junto com as subpastas (ex.: js/powerups e js/powerups/desenho)
  for (const base of ["js/powerups", "js/obstaculos", "js/pista", "js/idiomas", "css", "tests"]) {
    const lotes = new Set([...loteDaPasta].filter(([p]) => p === base || p.startsWith(base + "/")).map(([, n]) => n));
    assert.equal(lotes.size, 1, `${base} e subpastas em lotes diferentes: ${[...lotes]}`);
  }
});

test("plano — js/ é dividida por assunto em dois lotes; os arquivos de js/ raiz e a documentação vão com o motor", () => {
  const plano = planejar();
  const lotesDeJs = plano.lotes.filter((l) => l.arquivos.some((a) => a.startsWith("js/")));

  assert.equal(lotesDeJs.length, 2);
  assert.ok(lotesDeJs[0].arquivos.includes("js/config.js") && lotesDeJs[0].arquivos.includes("js/LEIA-ME.md"));
  assert.ok(lotesDeJs[0].arquivos.some((a) => a.startsWith("js/pista/")) && lotesDeJs[0].arquivos.some((a) => a.startsWith("js/game/")));
  assert.ok(lotesDeJs[1].arquivos.some((a) => a.startsWith("js/recompensas/")) && lotesDeJs[1].arquivos.some((a) => a.startsWith("js/idiomas/")));
  assert.equal(lotesDeJs[0].arquivos.length + lotesDeJs[1].arquivos.length, listarArquivosDoProjeto().filter((a) => a.startsWith("js/")).length);
});

test("plano — o lote 1 leva o que o Capacitor e o npm precisam (package.json, capacitor.config.json, .gitignore, scripts/)", () => {
  const lote1 = planejar().lotes[0].arquivos;

  for (const a of ["index.html", "package.json", "capacitor.config.json", ".gitignore", "scripts/preparar-web.js", "scripts/configurar-android.js", "scripts/envio-github.js",
    "audio/batidaCarro.mp3", "audio/freadaCarro.mp3", "audio/policia.mp3"]) assert.ok(lote1.includes(a), a);
  assert.ok(lote1.some((a) => a.startsWith("tests/")));
});

test("plano — o texto do plano mostra a contagem por pasta de cada lote", () => {
  const texto = descrever(planejar());
  assert.match(texto, /LOTE 1 —/);
  assert.match(texto, /LOTE 3 —/);
  assert.match(texto, /\d+\s+js\/pista\//);
  assert.match(texto, /Limite por envio: 100/);
});

// ============================================================
// 3. Os lotes montados em disco (o que o usuário arrasta para o GitHub)
// ============================================================

test("montar — cada lote vira uma pasta com os caminhos do projeto, byte a byte iguais, com no máximo 100 arquivos", () => {
  const plano = planejar();
  const destino = path.join(pastaTemp(), "envio-github");
  montar(plano, destino);

  const naoVisto = new Set(listarArquivosDoProjeto());
  const contagens = [];

  for (const l of plano.lotes) {
    const pastaLote = path.join(destino, `lote-${l.numero}`);
    const emDisco = [];
    (function andar(p) { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const c = path.join(p, e.name); e.isDirectory() ? andar(c) : emDisco.push(path.relative(pastaLote, c).split(path.sep).join("/")); } })(pastaLote);

    assert.deepEqual(emDisco.sort(), [...l.arquivos].sort(), `lote ${l.numero} em disco`);
    assert.ok(emDisco.length <= LIMITE_POR_ENVIO);
    for (const a of emDisco) { assert.equal(hash(path.join(pastaLote, a)), hash(path.join(RAIZ, a)), `${a} idêntico`); assert.ok(naoVisto.delete(a), `${a} repetido`); }
    contagens.push(emDisco.length);
  }

  assert.equal(naoVisto.size, 0, "nenhum arquivo ficou de fora");
  assert.equal(contagens.reduce((a, b) => a + b, 0), plano.total);
});

test("montar — é repetível e apaga o que sobrou da montagem anterior", () => {
  const destino = path.join(pastaTemp(), "envio-github");
  const plano = planejar();
  montar(plano, destino);
  fs.writeFileSync(path.join(destino, "lote-1", "sobra.txt"), "lixo");
  montar(plano, destino);
  assert.ok(!fs.existsSync(path.join(destino, "lote-1", "sobra.txt")));
});

// ============================================================
// 4. O que NÃO entra no envio (temporários, dependências, saídas)
// ============================================================

test("o planejador ignora .git, node_modules, www, android, envio-github, caches e lixo de sistema", () => {
  const raiz = projetoFalso({ js: 3, css: 2 });
  for (const lixo of ["node_modules/pkg/index.js", "www/index.html", "android/app/x.java", "envio-github/lote-1/a.js", ".git/HEAD", "tests/__pycache__/a.pyc",
    "debug.log", ".DS_Store", "js/.DS_Store", "x.tmp", "Thumbs.db", "js/arq.js~"]) {
    fs.mkdirSync(path.dirname(path.join(raiz, lixo)), { recursive: true });
    fs.writeFileSync(path.join(raiz, lixo), "x");
  }

  assert.deepEqual(listarArquivosDoProjeto(raiz), ["css/a000.js", "css/a001.js", "js/a000.js", "js/a001.js", "js/a002.js"]);
});

test("o projeto não tem temporários, caches, dependências nem saídas geradas", () => {
  const todos = listarArquivosDoProjeto();
  const raiz = fs.readdirSync(RAIZ);

  for (const proibido of ["node_modules", "www", "android", "envio-github", ".git"]) {
    if (proibido === ".git") continue;      // o histórico local do Git não é enviado (o planejador o ignora)
    assert.ok(!raiz.includes(proibido), `${proibido}/ não deveria estar no projeto entregue`);
  }
  for (const a of todos) assert.doesNotMatch(a, /__pycache__|\.pyc$|\.log$|\.tmp$|\.swp$|~$|\.DS_Store|Thumbs\.db|package-lock/, a);
});

test("nomes de arquivo seguros para o GitHub: sem espaço, acento, nome vazio nem arquivo acima de 25 MB", () => {
  for (const a of listarArquivosDoProjeto()) {
    assert.match(a, /^[A-Za-z0-9._\-\/]+$/, `${a}: caracteres fora do padrão`);
    assert.ok(a.length < 200, `${a}: caminho longo`);
    assert.ok(fs.statSync(path.join(RAIZ, a)).size < 25 * 1024 * 1024, `${a}: maior que 25 MB (limite do envio pelo navegador)`);
    assert.ok(fs.statSync(path.join(RAIZ, a)).size > 0, `${a}: arquivo vazio (o GitHub Web recusa)`);
  }
});

// ============================================================
// 5. O planejador funciona também quando o projeto crescer
// ============================================================

test("planejador — pasta nova vira lote adicional (por pasta inteira) e nunca passa de 100", () => {
  const raiz = projetoFalso({ "js/game": 5, "novos/a": 40, "novos/b": 40, "novos/c": 40, "outra": 10 });
  const plano = planejar({ raiz });

  assert.deepEqual(verificar(plano), []);
  assert.equal(plano.total, 135);
  assert.ok(plano.lotes.length >= 3);
  for (const l of plano.lotes) assert.ok(l.arquivos.length <= LIMITE_POR_ENVIO);
  // cada subpasta de "novos" fica inteira em um lote
  for (const sub of ["novos/a", "novos/b", "novos/c"]) {
    assert.equal(new Set(plano.lotes.filter((l) => l.arquivos.some((a) => pastaDe(a) === sub)).map((l) => l.numero)).size, 1, sub);
  }
});

test("planejador — denuncia uma pasta com mais de 100 arquivos diretos (precisaria ser dividida em subpastas)", () => {
  const raiz = projetoFalso({ grande: 120 });
  const problemas = verificar(planejar({ raiz }));

  assert.ok(problemas.some((p) => /a pasta grande tem 120 arquivos/.test(p)), problemas.join(" | "));
});

// ============================================================
// 6. Nada quebrou: caminhos, versão web, Capacitor e repositório sem pastas vazias (como no GitHub)
// ============================================================

test("caminhos: todo script do index.html, CSS e áudio existe e todo arquivo de js/ está em algum lote", () => {
  const todosNosLotes = new Set(planejar().lotes.flatMap((l) => l.arquivos));

  for (const ref of referenciasLocais(RAIZ)) assert.ok(todosNosLotes.has(ref), `${ref} não está em nenhum lote de envio`);
  for (const s of scriptsDoIndex()) assert.ok(todosNosLotes.has(s), s);
});

test("o projeto reconstruído a partir dos lotes (como fica no GitHub) funciona: www/ completa e referências íntegras", () => {
  const plano = planejar();
  const repo = pastaTemp();
  for (const l of plano.lotes) for (const a of l.arquivos) { fs.mkdirSync(path.dirname(path.join(repo, a)), { recursive: true }); fs.copyFileSync(path.join(RAIZ, a), path.join(repo, a)); }

  // O GitHub não guarda pasta vazia: o repositório não tem assets/ nem as subpastas vazias dele
  assert.ok(!fs.existsSync(path.join(repo, "assets")));

  const r = prepararWeb({ raiz: repo, destino: path.join(repo, "www") });
  assert.deepEqual(r.problemas, []);
  for (const a of listarArquivosDoProjeto().filter((x) => /^(css|js|audio)\//.test(x) && !x.endsWith(".md"))) assert.ok(r.arquivos.includes(a), a);
  assert.ok(r.arquivos.includes("index.html"));
});

test("scripts npm, Capacitor, testes e documentação continuam no projeto", () => {
  const p = JSON.parse(ler("package.json"));

  for (const s of ["test", "android:preparar", "android:adicionar", "android:sync", "android:abrir", "android:executar", "verificar-android", "envio:planejar", "envio:montar"]) assert.ok(p.scripts[s], s);
  assert.equal(p.scripts["envio:montar"], "node scripts/envio-github.js --montar envio-github");
  assert.deepEqual(Object.keys(p.dependencies).sort(), ["@capacitor/android", "@capacitor/core"]);
  assert.equal(JSON.parse(ler("capacitor.config.json")).webDir, "www");
  assert.match(ler(".gitignore"), /^node_modules\/$/m);
  assert.match(ler(".gitignore"), /^www\/$/m);
  assert.match(ler(".gitignore"), /^envio-github\/$/m);

  const testes = fs.readdirSync(path.join(RAIZ, "tests")).filter((f) => f.endsWith(".test.js"));
  assert.ok(testes.length >= 15);
});

test("a versão web continua intacta: o jogo carrega sem erro e a versão segue 4.0.0", () => {
  const j = carregarJogo();
  assert.equal(j.avaliar("falhasDoJogo.length"), 0);
  assert.equal(j.avaliar("VERSAO_DO_JOGO"), "4.0.0");
  assert.equal(JSON.parse(ler("package.json")).version, "4.0.0");
  assert.equal(j.avaliar("obterProvedorDeAnuncios().nome"), "simulado");
});

test("LEIA-ME documenta o envio pelo GitHub Web: os 3 lotes, os comandos e o aviso das pastas vazias", () => {
  const leia = ler("js/LEIA-ME.md");

  assert.match(leia, /Envio pelo GitHub Web/);
  for (const t of ["npm run envio:planejar", "npm run envio:montar", "Lote 1", "Lote 2", "Lote 3", "100 arquivos", ".gitignore", "assets/"]) assert.ok(leia.includes(t), `LEIA-ME sem "${t}"`);
});
