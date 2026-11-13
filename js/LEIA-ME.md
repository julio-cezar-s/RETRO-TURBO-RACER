# Mapa do código — Retro Turbo Racer

Cada pasta tem uma responsabilidade. A ordem de carregamento está em `index.html`.

| Pasta / arquivo | O que faz |
|---|---|
| `inicio/` | Primeiros e últimos scripts: `versao.js`, `diagnostico.js` (faixa de erro na tela), `compatibilidade.js` (recursos que faltam em navegadores antigos) e `pronto.js` (libera o botão JOGAR) |
| `config.js` | Canvas, estado global (`gameState`), jogador e constantes de tamanho (`GAME_WIDTH/HEIGHT` = 640×360 lógicos; `RENDER_SCALE` = resolução interna, ajustada pelo layout) |
| `idiomas/` | Idiomas: `nucleo.js` (registro, `traduzir`, fallback, preferência salva), `formatacao.js` (números, unidades, ordinais, datas), `interface.js` (HTML e seletor), `unidades.js` (km/h, mph, km, mi), `textos/pt.js`, `en.js` e `es.js` (TODOS os textos do jogo) |
| `layout/` | Layout responsivo: `calculo.js` (onde fica cada parte da tela), `responsivo.js` (aplica na página, rotação, redimensionamento), `tela-cheia.js` e `desempenho.js` (baixa a resolução se o aparelho for lento) |
| `pista/` | Perspectiva e a estrada: céu, terreno, acostamento, asfalto, marcadores |
| `pista/perspectiva.js` | **Única** fonte de projeção 3D (todo desenho passa por `projX`/`projY`) |
| `pista/trajeto/` | Curvas e morros: `tracado.js` (onde estão) e `perfil.js` (como a câmera os vê) |
| `cenarios/` | Árvores, construções, cercas, sinalização, atmosfera e a ordem de desenho por profundidade |
| `carros/` | O carro do jogador (desenho e posição) |
| `obstaculos/` | Tudo que aparece na pista: catálogo (`tipos.js`), criação, movimento, colisão, efeitos e `desenho/` (um arquivo por tipo) |
| `dificuldade/` | Quando e o que aparece: `niveis.js` (tabela de níveis), `padroes.js` (cenas de obstáculos), `diretor.js` (ritmo) |
| `combo/` | Multiplicador de pontuação por desvios seguidos: `parametros.js` (degraus, bônus, penalidades), `deteccao.js`, `pontuacao.js`, `hud.js`, `som.js` |
| `powerups/` | Itens coletáveis: `tipos.js` (catálogo), `parametros.js` (frequência), `estado.js`, `itens.js`, `geracao.js`, `efeitos.js`, `feedback.js`, `som.js`, `hud.js` e `desenho/` |
| `quase-colisao/` | Risco e recompensa: `parametros.js` (números para calibrar), `deteccao.js`, `pontuacao.js` (combo), `feedback.js`, `hud-sequencia.js`, `som.js` |
| `sistemas/` | Regras de jogo isoladas: hodômetro, força centrífuga, derrapagem e `pontos.js` (todo ponto ganho passa por ali) |
| `ecras/` | Interface: pausa, eventos de botões, HUD desenhado no canvas |
| `game/` | Ciclo da partida: `state.js` (loop), `reset.js`, `loop.js` |
| `tela-inicial/` | Menu, opções e recordes |
| `audio/` | `gerenciador.js` (efeitos em arquivo) e `sintetizador.js` (sons gerados no navegador) |
| `entities.js`, `input.js` | Lista de obstáculos/partículas; teclado e botão de turbo |
| `controles/` | `direcao-toque.js`: direção por toque nas metades da tela (veja "Direção por toque") |
| `../css/estilos/layout.css` | Visual da barra, do botão de turbo e do aviso "gire o aparelho" (as medidas vêm de `layout/`) |
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
- **Layout:** os botões ◀ ▶ saíram; o turbo ficou onde estava (faixa inferior, com a mesma
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
2. No `index.html`, use Localizar e Substituir para trocar `?v=3.5.0` pela nova versão
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
- `06-layout` — layout em 17 resoluções (com e sem toque), proporção 16:9, áreas seguras,
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

Verificação em **navegador real** (opcional; precisa de Playwright com Chromium,
não faz parte do `npm test`): abre o jogo em 14 resoluções/orientações, mede
canvas, barra e botões, confere sobreposições, rotação e redimensionamento, e
salva capturas de tela:

    python3 tests/ferramentas/verificar-layout-no-navegador.py
    python3 tests/ferramentas/verificar-idiomas-no-navegador.py   # pt/en/es e unidades em 5 telas
    python3 tests/ferramentas/verificar-direcao-por-toque-no-navegador.py   # toques reais (CDP) em 10 resoluções

Os testes **não** medem FPS nem aparência: isso exige um aparelho real.
