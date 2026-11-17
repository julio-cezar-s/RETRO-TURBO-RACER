# Mapa do código — Retro Turbo Racer

Cada pasta tem uma responsabilidade. A ordem de carregamento está em `index.html`.

| Pasta / arquivo | O que faz |
|---|---|
| `inicio/` | Primeiros e últimos scripts: `versao.js`, `diagnostico.js` (faixa de erro na tela), `compatibilidade.js` (recursos que faltam em navegadores antigos) e `pronto.js` (libera o botão JOGAR) |
| `config.js` | Canvas, estado global (`gameState`), jogador e constantes de tamanho (`GAME_HEIGHT` = 360 lógicos fixos; `GAME_WIDTH` = 640 é a largura-base — a largura real da vista é `VISTA.largura`; `RENDER_SCALE` = resolução interna, ajustada pelo layout) |
| `idiomas/` | Idiomas: `nucleo.js` (registro, `traduzir`, fallback, preferência salva), `formatacao.js` (números, unidades, ordinais, datas), `interface.js` (HTML e seletor), `unidades.js` (km/h, mph, km, mi), `textos/pt.js`, `en.js` e `es.js` (TODOS os textos do jogo) |
| `layout/` | Layout responsivo: `vista.js` (largura lógica do mundo, `VISTA`), `calculo.js` (onde fica cada parte da tela), `responsivo.js` (aplica na página, rotação, redimensionamento), `tela-cheia.js` e `desempenho.js` (baixa a resolução se o aparelho for lento) |
| `pista/` | Perspectiva e a estrada: céu, terreno, acostamento, asfalto, marcadores |
| `pista/perspectiva.js` | **Única** fonte de projeção 3D (todo desenho passa por `projX`/`projY`) |
| `pista/trajeto/` | Curvas e morros: `tracado.js` (onde estão) e `perfil.js` (como a câmera os vê) |
| `cenarios/` | Árvores, construções, cercas, sinalização, atmosfera e a ordem de desenho por profundidade; `lateral-ampliado.js` põe cenário extra nas laterais das telas largas |
| `carros/` | O carro do jogador (desenho e posição) |
| `obstaculos/` | Tudo que aparece na pista: catálogo (`tipos.js`), criação, movimento, colisão, efeitos e `desenho/` (um arquivo por tipo) |
| `dificuldade/` | Quando e o que aparece: `niveis.js` (tabela de níveis), `padroes.js` (cenas de obstáculos), `diretor.js` (ritmo) |
| `combo/` | Multiplicador de pontuação por desvios seguidos: `parametros.js` (degraus, bônus, penalidades), `deteccao.js`, `pontuacao.js`, `hud.js`, `som.js` |
| `powerups/` | Itens coletáveis: `tipos.js` (catálogo), `parametros.js` (frequência), `estado.js`, `itens.js`, `geracao.js`, `efeitos.js`, `feedback.js`, `som.js`, `hud.js` e `desenho/` |
| `quase-colisao/` | Risco e recompensa: `parametros.js` (números para calibrar), `deteccao.js`, `pontuacao.js` (combo), `feedback.js`, `hud-sequencia.js`, `som.js` |
| `sistemas/` | Regras de jogo isoladas: hodômetro, força centrífuga, derrapagem e `pontos.js` (todo ponto ganho passa por ali) |
| `ecras/` | Interface: pausa, eventos de botões, HUD desenhado no canvas |
| `recompensas/` | Recompensas voluntárias com anúncio SIMULADO (3.8.0): `parametros.js`, `estado.js`, `solicitar.js` (fluxo), `concessao.js` (efeitos), `anuncios.js` (provedor de anúncios) e `interface.js` (botões e tela do anúncio) |
| `scripts/` (raiz) | Ferramentas fora do jogo (o jogo não as usa): `preparar-web.js` (monta `www/`) e `configurar-android.js` (tela cheia) para o Android; `envio-github.js` (plano de envio pelo GitHub Web) |
| `game/` | Ciclo da partida: `state.js` (loop), `reset.js`, `loop.js` |
| `tela-inicial/` | Menu, opções e recordes |
| `audio/` | `gerenciador.js` (efeitos em arquivo) e `sintetizador.js` (sons gerados no navegador) |
| `entities.js`, `input.js` | Lista de obstáculos/partículas; teclado e área de toque do turbo (3.7.0) |
| `controles/` | `direcao-toque.js`: direção por toque nas metades da tela (veja "Direção por toque") |
| `../css/estilos/layout.css` | Visual da barra, da área de toque do turbo (sobre o indicador do canvas) e do aviso "gire o aparelho" (as medidas vêm de `layout/`) |
| `../tests/` | Testes automáticos (veja "Testes" abaixo) |

## Como ajustar o jogo

- **Dificuldade geral:** `dificuldade/niveis.js` (intervalos, pesos, chance de troca de faixa).
- **Novo tipo de obstáculo:** descreva em `obstaculos/tipos.js`, desenhe em
  `obstaculos/desenho/` e use em um padrão de `dificuldade/padroes.js`.
- **Novo padrão de obstáculos:** adicione em `dificuldade/padroes.js` e coloque o
  nome em `pesos` do nível desejado.
- **Power-ups (frequência, duração, efeitos):** `powerups/parametros.js` e `powerups/tipos.js`.
- **Combo de pontuação (degraus, bônus, penalidades):** `combo/parametros.js`.
- **Quase-colisão (folga, pontos, sequência):** `quase-colisao/parametros.js`.
- **Forma da estrada:** `pista/trajeto/tracado.js` (topo do arquivo, objeto `TRACADO`).

## Tela toda e campo de visão (3.6.0)

O jogo ocupa **toda a área disponível** (abaixo da barra de informações), sem faixas laterais.

- **Altura lógica fixa em 360; a largura acompanha a tela** (`layout/vista.js`, `VISTA.largura`):
  16:9 → 640 · 16:10 → 576 · 1363×550 → ~892 · 21:9 → ~840 · 32:9 → ~1280 · máximo 1440 (4:1).
  A escala é a mesma nos dois eixos: **nada é esticado**. Tela mais larga = mais cenário e pista
  dos lados (campo de visão horizontal maior). Carro, pista, obstáculos e HUD mantêm o tamanho
  (o carro ocupa sempre 70/360 da altura do canvas).
- **Só abaixo de 16:10** (tablet 4:3, janela quase quadrada) o canvas fica em 16:10 e sobra espaço
  em cima/embaixo. Acima de 4:1 sobram margens laterais simétricas.
- **Perspectiva:** `projX` centraliza a pista em `VISTA.largura / 2`. Céu (`pista/ceu.js`), terreno,
  atmosfera, flash e efeitos de tela leem `VISTA.largura`; o céu tem sempre 260 unidades a mais
  que a vista (paralaxe). `cenarios/lateral-ampliado.js` acrescenta árvores e construções distantes
  só quando a vista passa de 640 (na de 640 o cenário é idêntico ao de antes).
- **HUD no canvas:** velocímetro à esquerda, indicador de turbo na borda direita, nível e sequência no
  centro, medidores de power-up no canto direito — tudo ancorado na vista atual.
- **Modos de layout** (`layout/calculo.js`): `mesa` (mouse) e `cheio` (toque). Os dois usam o canvas
  inteiro; o turbo é o indicador do canvas (veja "Turbo no indicador", 3.7.0). Os antigos modos `lateral`
  (3.6.0) e `inferior` (3.7.0, faixa do botão laranja) foram removidos.
- **Resolução interna:** `VISTA.largura × 360` vezes a escala (1× a 2×); mudar a largura da vista refaz
  o canvas interno e o céu em cache.
- **Não mudou:** física, velocidade, colisões, hitboxes, pontuação, combo, power-ups, áudio e
  balanceamento — nenhum arquivo de lógica lê a largura da vista (há teste que confere e outro que
  roda a mesma partida em 5 larguras de vista e exige estado final idêntico).

## Envio pelo GitHub Web (Upload files)

O navegador do GitHub aceita no máximo **100 arquivos por envio**. O projeto tem 152 arquivos em 32 pastas
(a maior tem 15), então **nenhuma pasta precisou ser dividida e nenhum arquivo mudou de lugar**: a estrutura
lógica e todos os caminhos continuam como estavam. Só a pasta `js/`, tomada inteira (102 arquivos com as
subpastas), passaria do limite se arrastada de uma vez; por isso ela é enviada em dois lotes, **por assunto**.

| Lote | Conteúdo | Arquivos |
|---|---|---|
| **Lote 1** — base, recursos, scripts e testes | `index.html`, `package.json`, `capacitor.config.json`, `.gitignore`, `css/` (14), `audio/` (3), `scripts/` (3), `tests/` (26) | 50 |
| **Lote 2** — motor do jogo | `js/` (config, entities, input, este LEIA-ME), `js/game`, `js/inicio`, `js/pista`, `js/cenarios`, `js/carros`, `js/obstaculos`, `js/dificuldade`, `js/sistemas` | 51 |
| **Lote 3** — sistemas do jogador e interface | `js/powerups`, `js/combo`, `js/quase-colisao`, `js/recompensas`, `js/audio`, `js/idiomas`, `js/ecras`, `js/tela-inicial`, `js/layout`, `js/controles` | 51 |

Nenhum lote passa de 100 arquivos e nenhuma pasta tem mais de 15 em um mesmo envio.

**Como enviar** (no repositório: **Add file > Upload files**, uma vez por lote, com o repositório na raiz):

    npm run envio:planejar     # mostra os lotes e a contagem por pasta (confere o limite de 100)
    npm run envio:montar       # cria envio-github/lote-1, lote-2 e lote-3 com os caminhos do projeto

Arraste o **conteúdo** de `lote-1` (as pastas e arquivos de dentro) para a página de envio e faça o **commit**;
repita com `lote-2` e `lote-3`. Como cada pasta do lote mantém o caminho do projeto (`js/...`), os arquivos
do Lote 3 se juntam aos do Lote 2 dentro de `js/`. Sem Node, é só seguir a tabela acima.

- **`.gitignore`** começa com ponto e alguns seletores de arquivos o escondem: arraste a partir do gerenciador de
  arquivos com "mostrar ocultos", ou crie-o no GitHub (**Add file > Create new file**).
- **`assets/`** só tem pastas vazias (reservadas para imagens) e o Git/GitHub **não guarda pasta vazia**: ela não
  vai no envio. Nada depende dela (`scripts/preparar-web.js` a trata como opcional); ao adicionar imagens, crie as
  pastas e envie normalmente.
- Não vão para o envio: `.git`, `node_modules/`, `www/` (gerada por `npm run android:preparar`), `android/`
  (gerada pelo Capacitor; é grande, versione com `git push`), `envio-github/` e caches (`scripts/envio-github.js`
  ignora tudo isso). Se criar arquivos novos, o planejador os coloca em lotes adicionais por pasta e o teste
  `tests/15-envio-github.test.js` falha se algum lote ou pasta passar de 100.

## Aplicativo Android com Capacitor (4.0.0)

A 4.0.0 **prepara** o projeto para virar app Android. O jogo em si não mudou (nenhum arquivo de `js/`, `css/`
ou `audio/` foi alterado; só a versão): a versão web continua abrindo direto o `index.html`, como sempre.

**O que foi adicionado (tudo na raiz do projeto):**

| Arquivo | Para quê |
|---|---|
| `capacitor.config.json` | `appId`, nome do app e pasta web (`www`). Só isso, nenhuma decisão a mais |
| `scripts/preparar-web.js` | Copia `index.html`, `css/`, `js/`, `audio/` e `assets/` para `www/` **sem alterar um byte** (deixa de fora testes, scripts, `.md`) e confere se todo script, CSS e áudio referenciado existe na cópia |
| `scripts/configurar-android.js` | Depois de criar o projeto Android, ativa a **tela cheia** (barras do sistema escondidas e uso da área do entalhe) reescrevendo o `MainActivity.java` padrão do Capacitor |
| `package.json` | Dependências `@capacitor/core`, `@capacitor/android` e `@capacitor/cli` (^7) e os comandos `android:*` |
| `.gitignore` | `node_modules/` e `www/` (a cópia é gerada) |

**Primeira vez** (precisa de internet, Node 20+, JDK 21 e Android Studio instalados):

    npm install                    # baixa o Capacitor
    npm run android:adicionar      # prepara www/, cria a pasta android/ (cap add android) e ativa a tela cheia
    npm run android:abrir          # abre o projeto no Android Studio (cap open android)

No Android Studio, escolha um celular (ou emulador) e clique em **Run**. Ou, sem abrir o Studio, com um
aparelho/emulador conectado: `npm run android:executar` (sincroniza e roda, `cap run android`).

**Sempre que mudar o jogo** (HTML, CSS, JS, áudio) e quiser ver no app:

    npm run android:sync           # refaz www/ e copia para o projeto Android (cap sync android)

Comandos soltos, se preferir: `npm run android:preparar` (só a pasta `www/`), `npx cap doctor` (confere o
ambiente), `npx cap sync android`, `npx cap open android`, `npx cap run android`.

**Importante — decida ANTES de `npm run android:adicionar`:**
- **`appId`** (em `capacitor.config.json`): hoje é o valor provisório `com.example.retroturboracer`. É o
  identificador permanente do app na Play Store e fica gravado no projeto nativo na criação; troque pelo
  seu (ex.: `br.com.seudominio.retroturboracer`) **antes** de criar a pasta `android/`.
- A pasta `android/` **não vem no zip**: ela é gerada pelo Capacitor (`cap add android`) e depois deve ser
  mantida no controle de versão. Se já existir, `android:adicionar` não é necessário: use `android:sync`.

**Como o jogo roda no app:** o Capacitor serve `www/` por um servidor local do próprio app, em
`https://localhost`, **sem internet**. Por isso todos os recursos são relativos (`audio/policia.mp3`, `js/...`)
e as maiúsculas/minúsculas dos nomes precisam bater (o Android diferencia). Idiomas, unidades, recordes e
opções ficam no `localStorage` desse endereço: **não mude `server.androidScheme` nem `server.hostname`**
depois de publicar, ou o app "esquece" os dados dos jogadores. O armazenamento do app é separado do
da versão web (recordes de um não aparecem no outro).

**Tela cheia:** `scripts/configurar-android.js` só acrescenta modo imersivo (barras de status e de navegação
somem; reaparecem ao deslizar da borda e escondem de novo) e o uso da área do entalhe (o CSS já trata a área
segura). É idempotente e se recusa a mexer num `MainActivity.java` que não reconhece. O botão de tela cheia do
jogo (Fullscreen API) continua como sempre.

**Decisões que ficaram para depois (nada disso foi mexido):** `appId` definitivo, ícone e tela de abertura
(o Capacitor gera os padrões), travar a orientação na horizontal (o jogo já mostra o aviso de girar o
aparelho), botão voltar do Android (hoje fecha o app), manter a tela ligada, assinatura e publicação na Play
Store, e o **AdMob** (o anúncio continua **simulado**, ver Recompensas).

**Verificação feita sem rede:** `tests/14-android.test.js` confere a configuração, a cópia `www/` (idêntica,
completa, sem sobras), os caminhos relativos e a grafia exata dos nomes, e o script de tela cheia;
`python3 tests/ferramentas/verificar-android-no-navegador.py` monta a `www/`, serve por **HTTPS em
`https://localhost`** e abre o jogo como um celular Android no Chromium: todos os recursos respondem 200 e vêm do
próprio app, os 3 áudios carregam, o jogo roda (turbo, direção, batida) e idioma, opção de som e recorde
persistem ao recarregar. O que só dá para provar com o Capacitor instalado (a criação da pasta `android/`, o
build e o Java de tela cheia compilado) deve ser conferido na primeira execução dos comandos acima.

## Sons mais suaves (3.9.0)

Só áudio: física, colisões, pontuação e power-ups não mudaram (há teste: a mesma partida com som e no
mudo termina idêntica). Os números ficam em `AJUSTE_DE_SOM` (`audio/gerenciador.js`).

- **Batida:** volume de 0,7 para **0,4**. O chiado de freada que tocava junto agora é bem mais baixo
  (0,5 → **0,18**) e **curto**: `tocarCurto` corta o arquivo (2,4 s) em 0,9 s com fade de 0,45 s.
- **Freada só em batida de verdade:** o som de freada **não toca mais** na **poça de óleo**
  (`sistemas/derrapagem.js`) nem no **cone** (`obstaculos/efeitos.js`); os efeitos visuais e as penalidades
  desses obstáculos continuam exatamente como eram. O único pedido de freada que sobrou é o de
  `iniciarBatida` (`game/loop.js`).
- **Sirene da polícia:** nasce **baixinha** quando a viatura surge longe e **sobe conforme ela se aproxima**.
  `volumeDaSirenePorDistancia(z)` vai de 0,03 (viatura em `Z_FAR`) a 0,4 (o volume de antes, em `PLAYER_Z`)
  com curva quadrática (sobe devagar de longe, mais rápido de perto). `atualizarSirene(dt)` segue a viatura
  mais próxima à frente e suaviza o volume quadro a quadro (sem saltos). Ao passar pela viatura o som se
  apaga com fade em ~0,3 s em vez de cortar seco, e a próxima viatura começa baixinha de novo. A batida,
  a pausa e o mudo continuam silenciando/retomando a sirene como antes.
- **Ajustar:** mexa só em `AJUSTE_DE_SOM` (volume da batida, da freada e da sirene mínimo/máximo/curva).

## Recompensas voluntárias (3.8.0)

O jogador pode **escolher** assistir a um anúncio para ganhar uma recompensa. Nesta versão o anúncio é
**simulado** (não há AdMob, SDK nem rede); tudo está pronto para trocar pelo anúncio real depois.

**As duas recompensas** (valores em `recompensas/parametros.js`):

| Recompensa | Quando é oferecida | O que dá | Limite |
|---|---|---|---|
| **+30 de turbo** | Tela inicial, ANTES da corrida | +30 de energia, como o nitro | 1 por corrida |
| **Continuar** | Tela de Game Over, com o Game Over já visível | Volta à corrida, mesma pontuação, com proteção de 5 s (300 quadros) | 1 por corrida |

- **O +30 de turbo é creditado quando cabe.** O turbo tem teto de 100 e começa cheio; creditar no início
  jogaria os 30 fora. A recompensa fica **reservada** e é somada UMA vez, no primeiro quadro da corrida em
  que a energia está ≤ 70 (`RECOMPENSAS.turbo.creditarAbaixoDe`), com o aviso "NITRO +30" de sempre. Consumo,
  recarga e teto do turbo não mudaram.
- **A proteção ao continuar** reaproveita a janela de invulnerabilidade que o escudo já usa
  (`powerUps.invulneravel`: as batidas são absorvidas). Sem power-up novo, sem mudança de física, velocidade
  ou pontuação; o loop volta com a velocidade normal da corrida. A linha de recorde gravada na batida é
  retirada ao continuar, para a mesma corrida não aparecer duas vezes: vale o resultado final.
- **Só depois da confirmação.** `solicitar.js` verifica → pergunta ao provedor se há anúncio → exibe → e SÓ
  se o provedor responder `{ concluido: true }` (booleano) confere de novo e concede. Fechar o anúncio,
  falha, "sem anúncio" ou resposta estranha = nada é concedido, o botão continua para tentar de novo e o jogo
  segue normalmente (JOGAR NOVAMENTE, MENU PRINCIPAL, etc.).
- **Sem duplicar.** Pedidos enquanto um anúncio roda são recusados (`em_andamento`); uma recompensa já
  usada ou reservada é recusada sem exibir anúncio (`ja_usada`, `ja_reservada`); fora de hora (turbo durante
  a corrida, continuar antes do Game Over ou depois de voltar ao menu) também (`fora_de_hora`); um anúncio
  que termina depois de outra corrida começar vale nada (`expirada`). `reiniciarRecompensasDaPartida()` roda
  em cada `resetGame()`.
- **Sem anúncio disponível o botão some** e a tela fica como era. A tela "ANÚNCIO SIMULADO" (3 s, contagem
  regressiva, botão FECHAR ANÚNCIO) fica acima de todas as outras.

**Trocar pelo anúncio real (AdMob, depois):** escreva um provedor e registre-o; o resto não muda.

    registrarProvedorDeAnuncios({
      nome: "admob",
      disponivel(tipo) { /* há anúncio carregado para "turbo" | "continuar"? */ },
      exibir(tipo)     { /* Promise: { concluido: true } só quando o jogador ganhou a recompensa;
                           qualquer outra coisa → { concluido: false, motivo } */ },
    });

O provedor simulado (`criarProvedorSimulado({ modo, duracaoMs })`) aceita `modo`: `concluir` (padrão),
`cancelar`, `indisponivel` ou `erro`. Textos em `recompensas.*` nos três idiomas.

**Ganchos no jogo (todos guardados por `typeof`):** `resetGame` → `reiniciarRecompensasDaPartida`;
`simular` → `aplicarReservaDeTurbo`; `iniciarBatida` → `registrarBatidaParaContinuacao`; `mostrarGameOver` →
`oferecerContinuacao`; `sairParaMenu` → `encerrarOfertaDeContinuacao`.

## Turbo no indicador circular (3.7.0)

O botão quadrado laranja **TURBO** saiu. O **indicador circular** que já existia no canto direito do
canvas (`ecras/hud.js`, ícone de fogo, arco com a quantidade e rótulo) é agora o botão:

- **Toque / clique:** uma área de toque **invisível** (`#turboBtn`: círculo transparente, sem texto,
  com `aria-label`) fica sobre o indicador, com o mesmo centro. Diâmetro `--turbo-toque` =
  `max(64 px, 88 unidades lógicas × --px)`: ~90 px no Galaxy A37, nunca menos de 64 px. Existe em todos
  os modos (toque e mouse), posicionada pelo CSS (`css/estilos/layout.css`) a 52 unidades da borda
  direita e da base, então acompanha `VISTA.largura` em qualquer tela.
- **Funcionamento igual ao do botão antigo:** segurar liga (`ativarTurbo`), soltar/cancelar/perder o
  dedo desliga (`desativarTurbo`). Mecânica, consumo (0,45), recarga (0,18), duração e intensidade
  não mudaram; teclado (Espaço), pausa (P/Esc) e tela cheia também não.
- **Cores:** azul em repouso e **laranja enquanto o turbo está ativo** (disco, aro e arco de energia),
  voltando ao azul sozinho ao soltar ou quando a energia acaba. As cores ficam na tabela `DISCO_TURBO`
  (`ecras/hud.js`); o arco vermelho de pouca energia continua. O velocímetro não mudou.
- **Quantidade:** continua no arco do círculo e no rótulo (TURBO/VAZIO), e na barra e na porcentagem
  do HUD em HTML. Sem energia a área ganha `aria-disabled="true"` (não usa `disabled`, para o toque
  nunca cair na direção).
- **Direção:** tocar no círculo não dirige (toda `button` é toque próprio, ver `direcao-toque.js`); um dedo
  pode dirigir e outro segurar o turbo ao mesmo tempo.
- **Layout:** sem faixa de botões, todo celular usa o canvas inteiro abaixo da barra.

## Direção por toque (3.5.0)

Não há botões de seta: a área do jogo é dividida ao meio, sem nada desenhado.

- **Metade esquerda** pressionada e mantida: o carro vira para a esquerda. **Metade
  direita**: vira para a direita. **Levantar o dedo** para a direção na hora.
- **Alternar:** arrastar o dedo de uma metade para a outra troca a direção sem levantá-lo
  (ou levantar e tocar do outro lado). O meio exato pertence à metade direita.
- **Vários dedos:** cada dedo conta. Dois dedos do mesmo lado: soltar um mantém a direção.
  Um dedo em cada lado se anulam (como segurar as duas setas no teclado).
- **A divisão** usa a largura do `#game-container` (a tela toda), então tocar nas laterais
  fora do canvas também dirige. Toque em **botão** (turbo, pausa, tela cheia) ou em menu
  não dirige; o turbo funciona ao mesmo tempo que um dedo dirigindo.
- **Só dirige com a partida rodando:** sem partida, pausada ou encerrada, o toque é ignorado.
- **Cancela a direção** (e solta todos os dedos registrados) ao pausar (inclusive pelo aviso
  de girar o aparelho), reiniciar, sair para o menu, bater, falhar o loop, perder o foco,
  esconder a aba ou fechar a página. Depois de retomar a pausa é preciso um toque novo.
  O fim do toque é ouvido na **janela** (fase de captura): levantar o dedo fora do canvas, ou
  fora da página, também solta; `pointercancel`/`touchcancel` (gesto do sistema) idem.
- **Sem rolagem nem zoom:** `touch-action: none` no `#game-container`, `overscroll-behavior:
  none` na página, `preventDefault` nos toques que dirigem, pressão longa e gesto de pinça do
  Safari bloqueados durante a partida, e `user-scalable=no` no viewport. Os menus continuam
  rolando pelos próprios contêineres.
- **Eventos:** Pointer Events (toque e caneta); sem eles, Touch Events. O **mouse não dirige**:
  no computador o controle segue sendo o teclado, que não foi alterado.
- **Só mexe em `input.left` / `input.right`**: física, velocidade e sensibilidade da direção
  são as mesmas do teclado (um teste compara o movimento por toque e por teclado quadro a quadro).
  Para escrever no mesmo par de variáveis sem apagar uma tecla apertada, o módulo só grava
  quando o estado vindo do toque muda.
- **Layout (histórico, 3.5.0):** os botões ◀ ▶ saíram; o turbo ficou onde estava (faixa inferior, com a mesma
  largura de antes, ou lateral direita). O cálculo de layout não mudou (um teste compara as
  14 resoluções com os valores da 3.4.0).

## Idiomas e unidades (3.4.0)

Português (padrão e reserva), inglês e espanhol. Nenhum texto da tela fica espalhado
pelo código: tudo está em `js/idiomas/textos/<codigo>.js`. **Unidades de medida não
fazem parte do idioma** (veja abaixo).

- **Escolher o idioma:** botões "Português / English / Español" no menu inicial, em
  OPÇÕES e no menu de pausa (o espanhol entrou sozinho: os botões nascem da lista de
  idiomas registrados). A troca vale na hora, **sem reiniciar a partida**. A escolha
  fica no `localStorage` (`retroTurboLanguage`); valor inválido ou armazenamento
  bloqueado = português. O idioma do navegador não é consultado.
- **No HTML:** `data-i18n="chave"` (texto), `data-i18n-aria="chave"` (leitor de
  tela), `data-unidade="velocidade|distancia"` (rótulo da unidade escolhida).
- **No JavaScript:** `traduzir("hud.nivel", { n: 3 })`. Texto que já está na tela
  (popups, avisos do combo) guarda a CHAVE e é traduzido ao desenhar, por isso
  acompanha a troca. Quem escreve texto por código se registra com
  `aoMudarIdioma(funcao)`: **o aviso também dispara quando uma unidade muda**.
- **Idioma controla:** textos, separador decimal (vírgula em pt/es, ponto em en),
  ordinais dos recordes (1º / 1st 2nd 3rd / 1.º) e datas.
- **Faltou uma tradução?** Cai no português; se faltar até lá, aparece a própria
  chave. Os testes exigem as mesmas chaves nos três idiomas.
- **Palavras que não mudam:** TURBO, NITRO, RETRO, FUEL e o nome do jogo.
- A faixa de erro (`inicio/diagnostico.js`) guarda uma cópia de emergência em português
  para funcionar mesmo se o módulo de idiomas não carregar; um teste a mantém igual ao `pt.js`.

### Unidades (`js/idiomas/unidades.js`)

- **Velocidade:** km/h ou mph. **Distância:** km ou mi. As duas são independentes entre
  si e do idioma (ex.: espanhol com mph e km).
- **Escolher:** dois grupos de botões em OPÇÕES e no menu de pausa; a troca vale na
  hora, inclusive durante a partida (HUD, velocímetro analógico, hodômetro, placas de
  velocidade da pista).
- **Padrão inicial:** km/h e km. Chaves no `localStorage`: `retroTurboSpeedUnit`
  (`kmh`/`mph`) e `retroTurboDistanceUnit` (`km`/`mi`); valor inválido = padrão.
  Quem tinha só `retroTurboLanguage` da 3.3.0 mantém o idioma e abre em km/h e km
  (antes, inglês mostrava mph automaticamente).
- **Só apresentação:** física, velocidade interna (`gameSpeed`, 24 km/h por unidade),
  `distanciaPercorridaKm`, pontuação e recordes continuam iguais. Os recordes guardam
  só pontos e data, por isso não mudam com a unidade.
- **Catálogo:** `UNIDADES_DE_VELOCIDADE` / `UNIDADES_DE_DISTANCIA` em `unidades.js`
  (fator, rótulo, graduação do mostrador 0–540 km/h ou 0–340 mph, números das placas
  60/80/100/120 km/h ou 35/50/65/75 mph). Os rótulos dos seletores reaproveitam
  VELOCIDADE/DISTÂNCIA do HUD.
- Conversão: `converterVelocidade`, `formatarDistancia`, `htmlDaVelocidade` etc. em
  `idiomas/formatacao.js`.

### Como adicionar outro idioma

1. Copie `js/idiomas/textos/es.js`, troque `codigo`, `nome`, `locale`, `htmlLang` e
   os textos (plural: `{ one: "...", other: "..." }`; ordinal em `formato.ordinal`).
2. No `index.html`, acrescente `<script src="js/idiomas/textos/<codigo>.js?v=...">`
   depois de `es.js`. Os botões, o `lang` do documento e o fallback já funcionam.

- **Tela cheia:** botão ⛶ na barra, tecla **F** e botão nos menus de pausa e
  opções (somem onde não há suporte, como no iPhone). No celular o primeiro
  clique em JOGAR tenta entrar sozinho em tela cheia, uma vez só.
- **Nitidez:** a resolução interna do canvas acompanha o tamanho e a densidade da
  tela (degraus 1, 1,25, 1,5, 1,75 e 2 × 640×360). Se o aparelho ficar abaixo de
  ~42 quadros/s por alguns segundos, cai um degrau (nunca sobe sozinho até a
  tela mudar de tamanho).
- **Ajustes:** `LAYOUT` no topo de `layout/calculo.js` (alturas, largura mínima das
  laterais, degraus de resolução). Para limitar a qualidade, troque o último
  degrau de `LAYOUT.escalas`.
- O HTML da barra (pontos, velocidade, distância, turbo, ⛶, pausa) usa o fator
  `--ui`, calculado pela menor dimensão da tela; botões de toque nunca ficam
  abaixo de 44 px.
- `css/base.css`, `css/controles.css`, `css/painel.css` e `css/modais.css` (na raiz
  de `css/`) são antigos e **não** são carregados pelo `index.html`.

## Carregamento e erros

- O menu mostra **CARREGANDO...** e o botão JOGAR fica inerte até o último script
  (`inicio/pronto.js`) rodar. Sem isso, clicar cedo demais na primeira visita
  escondia o menu e deixava só a tela vazia.
- Qualquer falha (arquivo que não carregou, erro durante a partida) aparece numa
  **faixa vermelha no topo** com botão de recarregar. Nada falha em silêncio.
- A **versão** aparece no rodapé do menu. Se ela não for a esperada, o navegador
  está usando arquivos antigos do cache: recarregue com Ctrl+F5.

## Ao atualizar arquivos

1. Troque `VERSAO_DO_JOGO` em `inicio/versao.js`.
2. No `index.html`, use Localizar e Substituir para trocar `?v=3.7.0` pela nova versão
   em todos os `<script>` e `<link>` (isso impede o navegador de misturar arquivos
   novos com antigos guardados no cache).
3. Se criar um arquivo novo, inclua-o no `index.html` **antes** de
   `js/inicio/pronto.js`, que deve continuar sendo o último script.

## Testes

Os testes carregam os scripts **reais** do jogo, na ordem do `index.html`, num
ambiente simulado (sem navegador, sem dependências). Precisam só do Node 20+:

    npm test                      # ou: node --test "tests/*.test.js"
    npm run simular-powerups      # frequência e tempo de efeito (evidência de balanceamento)

- `01-geracao` — regras do sorteio (escudo, pesos, nitro)
- `02-efeitos-e-colisoes` — coleta, escudo, cone e óleo
- `03-reinicio-e-pontos` — reinício limpa tudo; pontos x2 em todas as fontes
- `04-celular` — HUD em telas pequenas, som, câmera lenta, fim de partida
- `05-regressao` — hitboxes, parâmetros preservados, carregamento e partidas simuladas
- `06-layout` — layout em 17 resoluções (com e sem toque), tela toda e proporção da vista, áreas seguras,
  rotação e pausa, resolução interna, desempenho e tela cheia
- `07-idiomas` — troca de idioma, preferência salva, fallback, novo idioma (francês simulado),
  consistência dos textos, acentuação/UTF-8, nenhum texto solto no código ou no HTML,
  números/datas, textos no canvas, e simulação idêntica em qualquer idioma
- `08-espanhol-e-unidades` — espanhol completo (chaves, fallback, canvas, persistência),
  unidades independentes (12 combinações idioma × velocidade × distância), conversões,
  persistência e compatibilidade com a 3.3.0, seletores e cliques, troca durante a partida,
  simulação e pontuação idênticas em qualquer unidade
- `09-direcao-por-toque` — zonas esquerda/direita (pressionar, soltar, meio exato, várias larguras),
  alternar zona, multitouch, turbo junto, pausa/fim de jogo/foco/saída, dedo solto fora do canvas,
  Pointer e Touch Events, rolagem e zoom, botões removidos, teclado e física inalterados
- `15-envio-github` — nenhuma pasta ou lote acima de 100 arquivos, cada arquivo em um só lote, pastas inteiras em um
  lote, lotes montados idênticos, ignorados (.git, node_modules, www...), nomes seguros, repositório sem pastas vazias
- `14-android` — configuração do Capacitor, cópia `www/` (idêntica e completa), caminhos relativos e grafia exata,
  script de tela cheia (idempotente, recusa arquivo desconhecido), versão web intacta, sem AdMob
- `13-sons` — sirene baixinha que sobe com a distância (início, subida sem saltos, duas viaturas, fade ao
  passar, reinício), freada fora do óleo e do cone, batida e freada mais baixas e curtas, mudo/pausa, som não
  altera a simulação
- `12-recompensas` — contrato do provedor, concluir/cancelar/indisponível/erro, nada concedido antes da
  confirmação, limites de 1 por corrida, cliques duplos, anúncio atrasado, recorde sem duplicar, física e
  pontuação idênticas, interface e textos nos 3 idiomas, anúncio simulado (contagem e fechar)
- `11-turbo-no-indicador` — botão quadrado removido (HTML/CSS), ativar/encerrar pelo círculo (toque, mouse,
  cancelamento, energia zero), azul → laranja → azul, quantidade no arco e no HUD, consumo idêntico ao
  do teclado, mecânica e física inalteradas, direção por toque (o círculo nunca dirige; turbo + direção),
  área de toque ≥ 64 px centrada no indicador em 18 resoluções
- `10-vista-ampla` — largura lógica da vista, tela toda sem faixas (1363×602, Galaxy A37, notebooks 16:9 e
  16:10, ultrawide 21:9 e 32:9), comparação antes × depois, escala igual nos dois eixos e proporção
  dos objetos, perspectiva, HUD e turbo sem cortes, cenário lateral extra, controles em metades,
  pausa/turbo/tela cheia, redimensionar e girar, e simulação idêntica em qualquer largura de vista

Verificação em **navegador real** (opcional; precisa de Playwright com Chromium,
não faz parte do `npm test`): abre o jogo em 14 resoluções/orientações, mede
canvas, barra e botões, confere sobreposições, rotação e redimensionamento, e
salva capturas de tela:

    python3 tests/ferramentas/verificar-layout-no-navegador.py
    python3 tests/ferramentas/verificar-idiomas-no-navegador.py   # pt/en/es e unidades em 5 telas
    python3 tests/ferramentas/verificar-direcao-por-toque-no-navegador.py   # toques reais (CDP) em 10 resoluções
    node scripts/envio-github.js   # plano de envio pelo GitHub Web (lotes de até 100 arquivos)
    python3 tests/ferramentas/verificar-android-no-navegador.py   # ambiente do app: www/ por https://localhost, como celular Android
    python3 tests/ferramentas/verificar-sons-no-navegador.py   # sons no Chromium: sirene, freada, batida
    python3 tests/ferramentas/verificar-recompensas-no-navegador.py   # recompensas no Chromium: concluir, cancelar, indisponível, limites
    python3 tests/ferramentas/verificar-turbo-no-navegador.py   # turbo real no Chromium: toque, cor, direção, resoluções
    python3 tests/ferramentas/verificar-vista-ampla-no-navegador.py   # tela toda: mede faixas vazias e proporção dos objetos

Os testes **não** medem FPS nem aparência: isso exige um aparelho real.
