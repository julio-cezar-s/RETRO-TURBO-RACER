#!/usr/bin/env node
/* scripts/preparar-web.js — prepara a pasta www/ que o Capacitor empacota no app Android.

   O jogo na web NÃO muda: index.html, css/, js/, audio/ e assets/ continuam na raiz, exatamente
   como sempre. Este script só COPIA esses arquivos (sem alterar nenhum byte) para www/, deixando
   de fora o que não é do jogo (testes, scripts, node_modules, android/, documentação .md).
   Depois confere se tudo que o index.html, os CSS e o gerenciador de áudio pedem existe na cópia.

   Uso:  node scripts/preparar-web.js [--destino pasta]      (padrão: www/)
   Sem dependências além do Node.
*/

const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");

// O que faz parte do jogo em tempo de execução
const ITENS_DO_JOGO = ["index.html", "css", "js", "audio", "assets"];

// assets/ é opcional: hoje só tem pastas vazias (reservadas para imagens) e o Git/GitHub NÃO guarda pasta
// vazia, então num repositório clonado ele pode não existir. Os demais itens são obrigatórios.
const ITENS_OPCIONAIS = ["assets"];

// Arquivos que ficam de fora da cópia: documentação e lixo de sistema
const IGNORAR = (nome) => nome.endsWith(".md") || nome === ".DS_Store" || nome === "Thumbs.db";

function listarArquivos(pasta, base = pasta) {
  const lista = [];

  for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
    const completo = path.join(pasta, entrada.name);

    if (entrada.isDirectory()) lista.push(...listarArquivos(completo, base));
    else lista.push(path.relative(base, completo).split(path.sep).join("/"));
  }

  return lista.sort();
}

function copiarItem(origem, destino) {
  const info = fs.statSync(origem);

  if (info.isDirectory()) {
    fs.mkdirSync(destino, { recursive: true });
    for (const filho of fs.readdirSync(origem)) {
      if (!IGNORAR(filho)) copiarItem(path.join(origem, filho), path.join(destino, filho));
    }
  } else {
    fs.copyFileSync(origem, destino);
  }
}

// Caminhos locais que a cópia precisa conter: scripts e CSS do index.html + arquivos de áudio dos .js
function referenciasLocais(pastaWeb) {
  const refs = new Set();
  const html = fs.readFileSync(path.join(pastaWeb, "index.html"), "utf8");

  for (const m of html.matchAll(/<(?:script|link|img|source|audio)\b[^>]*?\b(?:src|href)="([^"]+)"/g)) refs.add(m[1]);

  for (const arquivo of listarArquivos(pastaWeb).filter((a) => a.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(pastaWeb, arquivo), "utf8");
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) refs.add(path.posix.join(path.posix.dirname(arquivo), m[1]));
  }

  for (const arquivo of listarArquivos(pastaWeb).filter((a) => a.endsWith(".js"))) {
    const js = fs.readFileSync(path.join(pastaWeb, arquivo), "utf8");
    for (const m of js.matchAll(/new Audio\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.add(m[1]);
  }

  return [...refs].map((r) => r.split("?")[0]).sort();
}

function verificarReferencias(pastaWeb) {
  const problemas = [];

  for (const ref of referenciasLocais(pastaWeb)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//")) { problemas.push(`${ref}: endereço externo (o app deve funcionar offline)`); continue; }
    if (ref.startsWith("/")) { problemas.push(`${ref}: caminho absoluto (use caminho relativo ao index.html)`); continue; }
    if (!fs.existsSync(path.join(pastaWeb, ref))) problemas.push(`${ref}: arquivo não encontrado`);
  }

  return problemas;
}

function prepararWeb({ raiz = RAIZ, destino = path.join(RAIZ, "www") } = {}) {
  for (const item of ITENS_DO_JOGO) {
    if (!ITENS_OPCIONAIS.includes(item) && !fs.existsSync(path.join(raiz, item))) throw new Error(`Não encontrei "${item}" em ${raiz}`);
  }

  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });

  for (const item of ITENS_DO_JOGO) {
    if (fs.existsSync(path.join(raiz, item))) copiarItem(path.join(raiz, item), path.join(destino, item));
  }

  return { destino, arquivos: listarArquivos(destino), problemas: verificarReferencias(destino) };
}

module.exports = { prepararWeb, verificarReferencias, referenciasLocais, listarArquivos, ITENS_DO_JOGO, ITENS_OPCIONAIS, RAIZ };

if (require.main === module) {
  const i = process.argv.indexOf("--destino");
  const destino = i >= 0 ? path.resolve(process.argv[i + 1]) : path.join(RAIZ, "www");
  const r = prepararWeb({ destino });
  const bytes = r.arquivos.reduce((s, a) => s + fs.statSync(path.join(r.destino, a)).size, 0);

  console.log(`www pronta em ${r.destino}: ${r.arquivos.length} arquivos, ${(bytes / 1024).toFixed(0)} KB`);

  if (r.problemas.length) {
    console.error("Referências quebradas:\n  " + r.problemas.join("\n  "));
    process.exit(1);
  }
  console.log("Todas as referências locais (scripts, CSS, áudio) existem na cópia.");
}
