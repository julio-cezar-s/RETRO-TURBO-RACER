#!/usr/bin/env node
/* scripts/envio-github.js — plano de envio pelo GitHub Web ("Add file > Upload files").

   O navegador do GitHub aceita no máximo 100 arquivos por envio. O projeto tem uma estrutura lógica
   (js/ por assunto, css/, tests/...) que NÃO foi mexida: aqui só se decide em QUAIS LOTES enviar cada
   pasta, sem nenhum lote passar de 100 arquivos (nem pasta passar de 100 arquivos). Uma pasta nunca é
   dividida entre lotes, exceto js/, que tem 102 arquivos no total e é dividida por subpasta, por assunto.

   Uso:
     node scripts/envio-github.js                       mostra o plano (lotes, pastas e contagens)
     node scripts/envio-github.js --montar envio-github copia cada lote para envio-github/lote-N/, com os
                                                        caminhos do projeto: é só arrastar o CONTEÚDO de
                                                        cada lote-N para a página de envio, na raiz do repositório
   Sem dependências além do Node.
*/

const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const LIMITE_POR_ENVIO = 100;        // regra do GitHub Web (e do pedido): nunca passar disto
const META_POR_LOTE = 60;            // alvo dos lotes automáticos: folga em relação ao limite

// Fora do envio: histórico do Git, dependências, saídas geradas e lixo de sistema
const FORA_DO_ENVIO = [/^\.git(\/|$)/, /^node_modules(\/|$)/, /^www(\/|$)/, /^android(\/|$)/, /^envio-github(\/|$)/,
  /(^|\/)__pycache__(\/|$)/, /\.pyc$/, /\.log$/, /~$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.(tmp|swp)$/];

// Lotes lógicos (cada item é uma pasta inteira ou arquivos da raiz); o que não estiver aqui vai para lotes extras
const LOTES = [
  {
    nome: "Base, recursos, scripts e testes",
    itens: ["index.html", "package.json", "capacitor.config.json", ".gitignore", "css/", "audio/", "scripts/", "tests/"],
  },
  {
    nome: "Motor do jogo: partida, pista, cenário, carros, obstáculos e dificuldade",
    itens: ["js/*", "js/game/", "js/inicio/", "js/pista/", "js/cenarios/", "js/carros/", "js/obstaculos/", "js/dificuldade/", "js/sistemas/"],
  },
  {
    nome: "Sistemas do jogador e interface: power-ups, combos, recompensas, áudio, idiomas, telas, layout e controles",
    itens: ["js/powerups/", "js/combo/", "js/quase-colisao/", "js/recompensas/", "js/audio/", "js/idiomas/", "js/ecras/", "js/tela-inicial/", "js/layout/", "js/controles/"],
  },
];

function listarArquivosDoProjeto(raiz = RAIZ) {
  const lista = [];

  (function andar(pasta) {
    for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
      const completo = path.join(pasta, e.name);
      const rel = path.relative(raiz, completo).split(path.sep).join("/");

      if (FORA_DO_ENVIO.some((r) => r.test(rel))) continue;
      if (e.isDirectory()) andar(completo);
      else lista.push(rel);
    }
  })(raiz);

  return lista.sort();
}

// Um item "pasta/" pega tudo dentro; "pasta/*" só os arquivos diretamente nela; outro texto é um arquivo
function pertence(arquivo, item) {
  if (item.endsWith("/*")) return path.posix.dirname(arquivo) === item.slice(0, -2);
  if (item.endsWith("/")) return arquivo.startsWith(item);
  return arquivo === item;
}

// Pasta de cada arquivo ("." = raiz)
const pastaDe = (arquivo) => path.posix.dirname(arquivo);

function arquivosPorPasta(arquivos) {
  const mapa = new Map();
  for (const a of arquivos) mapa.set(pastaDe(a), (mapa.get(pastaDe(a)) || 0) + 1);
  return mapa;
}

// Lotes extras (só para arquivos fora dos lotes lógicos, ex.: pasta nova): junta pastas inteiras até ~META_POR_LOTE
function lotesExtras(sobras) {
  const porPastaDeTopo = new Map();
  for (const a of sobras) {
    const topo = a.includes("/") ? a.split("/")[0] + "/" : "(raiz)";
    porPastaDeTopo.set(topo, [...(porPastaDeTopo.get(topo) || []), a]);
  }

  const lotes = [];
  let atual = null;

  for (const [topo, arquivos] of [...porPastaDeTopo].sort()) {
    // Uma pasta de topo grande demais é dividida por subpasta (nunca arquivo solto aleatório)
    const unidades = arquivos.length <= META_POR_LOTE ? [[topo, arquivos]] : [...agruparPorSubpasta(arquivos)];

    for (const [nome, lista] of unidades) {
      if (!atual || atual.arquivos.length + lista.length > META_POR_LOTE) {
        atual = { nome: `Lote adicional ${lotes.length + 1}`, itens: [], arquivos: [] };
        lotes.push(atual);
      }
      atual.itens.push(nome);
      atual.arquivos.push(...lista);
    }
  }

  return lotes;
}

function agruparPorSubpasta(arquivos) {
  const mapa = new Map();
  for (const a of arquivos) {
    const partes = a.split("/");
    const chave = partes.length > 2 ? `${partes[0]}/${partes[1]}/` : `${partes[0]}/*`;
    mapa.set(chave, [...(mapa.get(chave) || []), a]);
  }
  return mapa;
}

function planejar({ raiz = RAIZ } = {}) {
  const todos = listarArquivosDoProjeto(raiz);
  const usados = new Set();
  const lotes = [];

  for (const def of LOTES) {
    const arquivos = todos.filter((a) => !usados.has(a) && def.itens.some((i) => pertence(a, i)));
    arquivos.forEach((a) => usados.add(a));
    if (arquivos.length) lotes.push({ nome: def.nome, itens: def.itens, arquivos });
  }

  const sobras = todos.filter((a) => !usados.has(a));
  lotesExtras(sobras).forEach((l) => lotes.push(l));

  lotes.forEach((l, i) => { l.numero = i + 1; l.porPasta = arquivosPorPasta(l.arquivos); });

  return { total: todos.length, lotes, porPasta: arquivosPorPasta(todos), sobras };
}

// Confere as regras; devolve a lista de problemas (vazia = tudo certo)
function verificar(plano, limite = LIMITE_POR_ENVIO) {
  const problemas = [];
  const vistos = new Set();

  for (const l of plano.lotes) {
    if (l.arquivos.length > limite) problemas.push(`Lote ${l.numero} tem ${l.arquivos.length} arquivos (limite ${limite})`);
    for (const [pasta, n] of l.porPasta) if (n > limite) problemas.push(`Lote ${l.numero}: a pasta ${pasta} tem ${n} arquivos (limite ${limite})`);
    for (const a of l.arquivos) { if (vistos.has(a)) problemas.push(`${a} está em mais de um lote`); vistos.add(a); }
  }

  if (vistos.size !== plano.total) problemas.push(`${plano.total - vistos.size} arquivo(s) fora de qualquer lote`);

  return problemas;
}

function montar(plano, destino, raiz = RAIZ) {
  fs.rmSync(destino, { recursive: true, force: true });

  for (const l of plano.lotes) {
    for (const a of l.arquivos) {
      const alvo = path.join(destino, `lote-${l.numero}`, ...a.split("/"));
      fs.mkdirSync(path.dirname(alvo), { recursive: true });
      fs.copyFileSync(path.join(raiz, ...a.split("/")), alvo);
    }
  }
}

function descrever(plano) {
  const linhas = [`Projeto: ${plano.total} arquivos em ${plano.porPasta.size} pastas (maior pasta: ${Math.max(...plano.porPasta.values())} arquivos). Limite por envio: ${LIMITE_POR_ENVIO}.`, ""];

  for (const l of plano.lotes) {
    linhas.push(`LOTE ${l.numero} — ${l.nome}: ${l.arquivos.length} arquivos`);
    for (const [pasta, n] of [...l.porPasta].sort()) linhas.push(`   ${String(n).padStart(3)}  ${pasta === "." ? "(raiz)" : pasta + "/"}`);
    linhas.push("");
  }

  return linhas.join("\n");
}

module.exports = { planejar, verificar, montar, descrever, listarArquivosDoProjeto, LOTES, LIMITE_POR_ENVIO, FORA_DO_ENVIO, RAIZ };

if (require.main === module) {
  const plano = planejar();
  const i = process.argv.indexOf("--montar");

  console.log(descrever(plano));

  const problemas = verificar(plano);
  if (problemas.length) { console.error("Problemas:\n  " + problemas.join("\n  ")); process.exit(1); }

  if (i >= 0) {
    const destino = path.resolve(process.argv[i + 1] || "envio-github");
    montar(plano, destino);
    console.log(`Lotes montados em ${destino} (arraste o CONTEÚDO de cada lote-N para o GitHub, na raiz do repositório).`);
  }

  console.log("OK: nenhum lote e nenhuma pasta passa de " + LIMITE_POR_ENVIO + " arquivos.");
}
