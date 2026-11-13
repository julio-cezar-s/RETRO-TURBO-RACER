# 🏎️ Retro Turbo Racer

**Um jogo de corrida arcade desenvolvido para navegador, com visual estilizado, velocidade, obstáculos, power-ups e controles adaptados para dispositivos móveis.**

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![Versão](https://img.shields.io/badge/vers%C3%A3o-3.5.0-green)
![Idiomas](https://img.shields.io/badge/idiomas-PT%20%7C%20EN%20%7C%20ES-orange)
![Plataforma](https://img.shields.io/badge/plataforma-Web%20%7C%20Android-lightgrey)

---

## 📌 1. Sobre o projeto

O **Retro Turbo Racer** é um jogo de corrida arcade desenvolvido com tecnologias web, utilizando HTML, CSS e JavaScript.

O jogador controla um carro em uma estrada com perspectiva, desvia de obstáculos, coleta power-ups, utiliza turbo e tenta alcançar a maior pontuação possível.

O projeto busca combinar:

- Jogabilidade simples e acessível.
- Visual arcade estilizado.
- Controles responsivos.
- Compatibilidade com celulares e computadores.
- Experiência em diferentes idiomas.
- Sistema de pontuação e recordes.
- Possibilidade de expansão para plataformas móveis.
- Estrutura preparada para futuras funcionalidades.

O jogo foi pensado para funcionar principalmente em dispositivos móveis na orientação horizontal, mas também pode ser executado em notebooks e computadores.

## 🎯 2. Objetivos

Os principais objetivos do projeto são:

1. Desenvolver um jogo de corrida divertido e acessível.
2. Oferecer uma experiência consistente em diferentes tamanhos de tela.
3. Permitir que jogadores de diferentes países utilizem o jogo.
4. Manter uma arquitetura modular e de fácil manutenção.
5. Evoluir o jogo sem comprometer funcionalidades já implementadas.
6. Preparar o projeto para publicação.

## 🕹️ 3. Como funciona o jogo

O jogador controla um veículo em uma estrada com perspectiva tridimensional simulada.

Durante a partida, é necessário:

- Desviar de carros, caminhões, motocicletas e outros obstáculos.
- Evitar colisões.
- Manter o controle do veículo.
- Utilizar o turbo estrategicamente.
- Coletar itens especiais.
- Aproveitar os efeitos temporários dos power-ups.
- Acumular pontos e melhorar o próprio recorde.

A velocidade, a distância percorrida, os pontos e o combo são apresentados na interface durante a corrida.

## 🎮 4. Controles

### Celulares e dispositivos com tela sensível ao toque

O jogo utiliza direção por zonas invisíveis de toque.

| Ação | Comando |
|---|---|
| Virar à esquerda | Pressionar a metade esquerda da tela |
| Virar à direita | Pressionar a metade direita da tela |
| Parar de direcionar | Retirar o dedo da tela |
| Turbo | Pressionar o botão TURBO |
| Pausar | Pressionar o botão de pausa |
| Tela cheia | Utilizar o botão de tela cheia |

**Características dos controles móveis:**

- Não existem botões visíveis de direção.
- O jogador pode manter o dedo pressionado para continuar virando.
- Arrastar o dedo entre as duas metades troca a direção.
- Multitouch é suportado.
- É possível dirigir e utilizar turbo simultaneamente.
- A direção é cancelada ao pausar ou encerrar a partida.
- O sistema evita manter o carro virando quando o toque é interrompido.

### Computadores e notebooks

Os controles de teclado são preservados.

| Ação | Comando |
|---|---|
| Direção esquerda | Tecla de direção esquerda |
| Direção direita | Tecla de direção direita |
| Turbo | Botão TURBO ou comando configurado no jogo |
| Pausar | Botão de pausa |
| Tela cheia | Botão de tela cheia ou tecla F, quando suportada |

Os controles de teclado não devem ser alterados pelas atualizações do sistema de toque.

## ⚡ 5. Power-ups

O jogo possui quatro tipos de power-ups.

### Nitro

- Fornece 40 unidades de turbo instantaneamente.
- Ajuda o jogador a recuperar a capacidade de aceleração.
- Seu aproveitamento depende da quantidade de turbo disponível.

### Escudo

- Protege contra uma colisão.
- Permanece ativo por até 15 segundos ou até ser utilizado.
- Após absorver uma colisão, concede proteção adicional de 1,25 segundo.
- Não elimina os efeitos de cones e óleo.

### Câmera lenta

- Reduz a velocidade do mundo para 60%.
- Dura 6 segundos.
- Não reduz a resposta dos controles de direção.

### Pontos x2

- Dobra os pontos recebidos durante 10 segundos.
- Afeta pontos por tempo, desvios, quase-colisões e combo.

### Coleta dos itens

Os power-ups aparecem na pista e podem ser coletados ao passar sobre eles.

Características:

- Os itens possuem animações visuais.
- Há efeitos de destaque para facilitar a identificação.
- A geração dos itens possui intervalos controlados.
- O sistema evita determinadas combinações de efeitos simultâneos.

## 🏆 6. Pontuação e combo

O sistema de pontuação recompensa o desempenho do jogador.

Entre os elementos considerados estão:

- Tempo de sobrevivência.
- Desvios de obstáculos.
- Quase-colisões.
- Combos.
- Multiplicadores temporários de pontos.

O sistema de combo utiliza multiplicadores para recompensar sequências de bom desempenho.

Os pontos são centralizados em uma rotina própria, facilitando a manutenção e a expansão do sistema.

Os recordes armazenam pontuação e data.

## 🌍 7. Idiomas

O Retro Turbo Racer possui três idiomas:

| Idioma | Código | Situação |
|---|---|---|
| Português | pt | Padrão |
| Inglês | en | Disponível |
| Espanhol | es | Disponível |

### Recursos de internacionalização

- Troca de idioma sem reiniciar a partida.
- Tradução dos menus.
- Tradução do HUD.
- Tradução dos avisos e mensagens.
- Tradução dos power-ups.
- Localização de números e datas.
- Preferência de idioma salva no dispositivo.
- Português utilizado como idioma de fallback.

O idioma pode ser alterado nas telas de início, opções e pausa.

## 📏 8. Unidades de medida

O idioma e as unidades são configurações independentes.

### Velocidade

- km/h
- mph

### Distância

- km
- mi

O jogador pode utilizar, por exemplo:

- Português com km/h e km.
- Português com mph e mi.
- Inglês com km/h e km.
- Espanhol com mph e mi.

As preferências são salvas separadamente no armazenamento local.

**Importante:** as conversões são utilizadas apenas na apresentação dos valores. A física, a velocidade interna, a distância interna, a pontuação e os cálculos do jogo permanecem independentes das unidades escolhidas.

## 🖥️ 9. Interface e HUD

A interface apresenta informações importantes durante a corrida.

Entre os elementos disponíveis:

- Pontuação atual.
- Velocidade.
- Distância percorrida.
- Indicador de turbo.
- Velocímetro analógico.
- Indicador de combo.
- Nível da partida.
- Botão de turbo.
- Botão de pausa.
- Botão de tela cheia.

A interface utiliza elementos visuais estilizados e cores de destaque para facilitar a leitura durante a partida.

## 📱 10. Responsividade e orientação

O jogo possui um sistema próprio de layout responsivo.

O sistema considera:

- Largura e altura da tela.
- Orientação do dispositivo.
- Área disponível para o jogo.
- Posicionamento dos elementos do HUD.
- Tamanho dos controles.
- Resolução de renderização.
- Desempenho do dispositivo.

### Celulares

A orientação recomendada é horizontal.

Quando o aparelho está na vertical, o jogo apresenta uma orientação para girar o dispositivo e interrompe a partida até que o jogador possa continuar.

### Computadores e notebooks

A interface adapta os elementos ao espaço disponível, preservando a proporção dos componentes.

### Próxima melhoria de tela — versão 3.6.0

Está planejada uma evolução do sistema de renderização para aproveitar melhor telas muito largas.

O objetivo é:

- Eliminar espaços vazios laterais.
- Expandir o campo de visão horizontal.
- Adaptar a perspectiva da estrada.
- Mostrar mais cenário nas laterais.
- Preservar as proporções do carro e dos objetos.
- Evitar deformações e cortes na interface.

Essa melhoria ainda depende da implementação e validação da versão 3.6.0.

## 🔊 11. Áudio

O projeto possui sistema de áudio integrado à experiência de jogo.

O áudio pode ser habilitado ou desabilitado pelas opções.

O desbloqueio de áudio considera as restrições dos navegadores móveis, que normalmente exigem uma interação do usuário antes da reprodução de sons.

## ⚙️ 12. Configurações e armazenamento

O jogo utiliza armazenamento local do navegador para preservar preferências.

Entre as configurações existentes estão:

- Idioma.
- Unidade de velocidade.
- Unidade de distância.
- Som.
- Partículas.

As preferências de unidades utilizam as chaves:

- `retroTurboSpeedUnit`
- `retroTurboDistanceUnit`

As opções gerais também possuem armazenamento próprio.

O armazenamento é local ao navegador e ao dispositivo. A sincronização entre dispositivos não deve ser considerada disponível sem uma implementação específica.

## 🛠️ 13. Tecnologias utilizadas

O projeto utiliza tecnologias web:

| Tecnologia | Utilização |
|---|---|
| HTML5 | Estrutura do jogo |
| CSS3 | Interface, layout e responsividade |
| JavaScript | Lógica e sistemas do jogo |
| Canvas 2D | Renderização gráfica |
| Node.js | Execução dos testes |
| npm | Gerenciamento de scripts e dependências |
| Chromium | Testes de navegador |
| Playwright / CDP | Automação e verificações no navegador |

A implementação utiliza JavaScript modular, com responsabilidades separadas por sistemas.

## 🧩 14. Organização do projeto

A estrutura é organizada por funcionalidades.

Alguns diretórios e arquivos importantes:

```text
Retro-Turbo-Racer/
│
├── index.html
├── package.json
│
├── css/
│   └── estilos/
│       ├── base.css
│       ├── layout.css
│       └── menus.css
│
├── js/
│   ├── input.js
│   │
│   ├── controles/
│   │   └── direcao-toque.js
│   │
│   ├── idiomas/
│   │   ├── nucleo.js
│   │   ├── formatacao.js
│   │   ├── interface.js
│   │   ├── unidades.js
│   │   └── textos/
│   │       ├── pt.js
│   │       ├── en.js
│   │       └── es.js
│   │
│   ├── powerups/
│   │   ├── tipos.js
│   │   ├── parametros.js
│   │   ├── estado.js
│   │   ├── itens.js
│   │   ├── geracao.js
│   │   ├── efeitos.js
│   │   ├── feedback.js
│   │   ├── som.js
│   │   ├── hud.js
│   │   └── desenho/
│   │
│   ├── layout/
│   ├── ecras/
│   ├── cenarios/
│   ├── game/
│   ├── sistemas/
│   └── LEIA-ME.md
│
└── tests/
    ├── helpers/
    └── ferramentas/
```

A estrutura acima apresenta os principais módulos conhecidos do projeto. Outros arquivos e diretórios podem existir na versão completa.

### Separação de responsabilidades

- `controles/`: entrada e direção por toque.
- `idiomas/`: traduções, formatação e unidades.
- `powerups/`: geração, coleta, efeitos e apresentação dos itens.
- `layout/`: adaptação da interface às telas.
- `ecras/`: HUD e elementos das telas.
- `game/`: ciclo e gerenciamento da partida.
- `cenarios/`: elementos visuais do cenário.
- `sistemas/`: sistemas auxiliares do jogo.
- `tests/`: testes automatizados e ferramentas de validação.

## 🧪 15. Testes e qualidade

O projeto possui uma suíte automatizada para evitar regressões.

Na versão 3.5.0, os resultados registrados foram:

| Verificação | Resultado |
|---|---:|
| Testes automatizados | 364 aprovados |
| Testes anteriores preservados | 292 |
| Testes novos de direção por toque | 72 |
| Verificações de toque no Chromium | 368 |
| Verificações de layout | 214 |
| Verificações de idiomas e unidades | 480 |
| Falhas registradas nessas verificações | 0 |

### O que é testado

- Direção por teclado.
- Direção por toque.
- Pointer Events.
- Touch Events.
- Multitouch.
- Alternância entre zonas.
- Cancelamento dos comandos.
- Pausa e reinício.
- Colisões.
- Power-ups.
- Pontuação.
- Combo.
- Idiomas.
- Unidades.
- Persistência de preferências.
- Responsividade.
- Interface e menus.

Os testes de navegador complementam a suíte automatizada e verificam o comportamento em diferentes resoluções.

**Observação:** esses números representam os resultados da versão 3.5.0. Devem ser atualizados após cada nova versão.

## 💻 16. Como executar o projeto

### Requisitos para testes

- Node.js 20 ou superior.
- npm.
- Navegador atualizado.

### Instalação

Na pasta do projeto, execute:

```bash
npm install
```

### Executar os testes

```bash
npm test
```

O comando utiliza o script de testes configurado no `package.json`.

### Executar no navegador

O projeto pode ser servido localmente por um servidor HTTP estático.

Abra o endereço local disponibilizado pelo servidor e acesse `index.html`.

Não é necessário um backend próprio para a execução básica do jogo, desde que todos os recursos estáticos estejam disponíveis corretamente.

## 🔄 17. Histórico de versões

### Versão 3.1 — Power-ups

- Implementação dos quatro power-ups.
- Sistema de coleta.
- Efeitos temporários.
- Integração com pontuação.
- Feedback visual e sonoro.

### Versão 3.1.1 — Correções e estabilidade

- Correção da geração do escudo.
- Ajustes no HUD.
- Melhorias no áudio.
- Correções nos estados de reinício.
- Ampliação dos testes.

### Versão 3.2.0 — Layout responsivo

- Adaptação para celulares e computadores.
- Suporte à orientação horizontal.
- Ajustes de tela cheia.
- Melhorias no posicionamento do HUD.
- Escala de renderização.
- Ajustes de desempenho.

### Versão 3.3.0 — Internacionalização

- Português como idioma padrão.
- Inglês disponível.
- Troca de idioma durante a partida.
- Tradução dos menus e elementos gráficos.
- Formatação localizada.

### Versão 3.4.0 — Espanhol e unidades independentes

- Espanhol adicionado.
- Idioma e unidades separados.
- km/h e mph.
- km e mi.
- Preferências persistentes.
- Conversões sem alterar a física do jogo.

### Versão 3.5.0 — Direção por toque

- Remoção dos botões visíveis de direção.
- Duas zonas invisíveis de toque.
- Suporte a multitouch.
- Alternância de direção por arraste.
- Direção simultânea ao turbo.
- Cancelamento seguro dos comandos.
- Testes reais de toque no Chromium.

### Versão 3.6.0 — Expansão da área de jogo

Melhoria planejada:

- Aproveitamento da largura e altura disponíveis.
- Campo de visão adaptativo.
- Ajuste da perspectiva.
- Eliminação dos espaços laterais desperdiçados.
- Melhor adaptação a telas ultrawide.
- Preservação da proporção dos elementos.

## 💰 18. Monetização e modelo de negócio

O modelo de monetização planejado prioriza anúncios recompensados e voluntários.

A intenção é permitir que o jogador escolha assistir a um anúncio em troca de uma recompensa dentro do jogo.

### Recompensas planejadas

**Continuar a partida:**

- Opção de assistir a um anúncio após Game Over.
- Concessão de uma proteção temporária para continuar.
- Limite de uma utilização por partida.

**Turbo extra:**

- Opção de assistir a um anúncio antes da corrida.
- Concessão de 30 unidades adicionais de turbo.
- Limite de uma utilização por partida.

### Princípios de monetização

- Não interromper corridas com anúncios obrigatórios.
- Não prejudicar quem prefere jogar sem anúncios.
- Utilizar anúncios de teste durante o desenvolvimento.
- Conceder recompensas somente após confirmação de conclusão do anúncio.
- Manter o jogo funcional quando não houver anúncios disponíveis.

### Plataformas planejadas

- Android: integração futura com Google AdMob.
- Navegador: estratégia de monetização web independente.
- iOS: possibilidade de expansão futura.

**Situação:** o modelo está planejado, mas não deve ser considerado implementado ou publicado sem a integração e os testes correspondentes.

## 🚀 19. Roadmap

| Etapa | Objetivo | Situação |
|---|---|---|
| 3.1 | Power-ups | Concluída |
| 3.2 | Responsividade | Concluída |
| 3.3 | Português e inglês | Concluída |
| 3.4 | Espanhol e unidades independentes | Concluída |
| 3.5 | Direção por toque | Concluída |
| 3.6 | Melhor aproveitamento da tela | Planejada |
| Futuras | Refinamento visual e desempenho | Planejado |
| Futuras | Preparação para Android | Planejado |
| Futuras | Anúncios recompensados | Planejado |
| Futuras | Publicação e divulgação | Planejado |

## 🔐 20. Privacidade e dados

O jogo utiliza armazenamento local para guardar determinadas preferências.

Antes de uma publicação comercial, deverão ser avaliados e documentados:

- Política de privacidade.
- Tratamento de dados.
- Consentimento para publicidade.
- Dados coletados por SDKs de terceiros.
- Requisitos de privacidade das lojas.
- Requisitos de classificação etária.

A implementação de serviços externos deverá ser documentada separadamente.

## 📦 21. Distribuição e publicação

Os formatos de distribuição considerados para o projeto são:

**Web**
- Execução em navegadores compatíveis.
- Hospedagem dos arquivos do jogo.
- Acesso por computador e celular.

**Android**
- Empacotamento futuro com uma solução como Capacitor.
- Integração com os recursos necessários da plataforma.
- Preparação para publicação na Google Play.

**iOS**
- Expansão futura.
- Adequação às exigências da plataforma Apple.

A publicação em lojas depende de testes, documentação, políticas de privacidade e configurações próprias de cada plataforma.

## 🤝 22. Diretrizes de desenvolvimento

Para manter a estabilidade do Retro Turbo Racer, novas implementações devem seguir estas diretrizes:

1. Preservar funcionalidades já concluídas.
2. Evitar alterações fora do escopo de cada versão.
3. Manter a arquitetura modular.
4. Criar testes para funcionalidades novas.
5. Executar a suíte completa após as alterações.
6. Testar em navegador real.
7. Validar em dispositivos móveis quando houver mudanças de interface ou controles.
8. Atualizar a documentação.
9. Atualizar o número da versão.
10. Gerar um novo pacote de distribuição.

Mudanças de física, pontuação e balanceamento devem ser tratadas separadamente das alterações de interface.

## 📄 23. Licença

A licença de distribuição do projeto deve ser definida antes da publicação pública do código-fonte.

Até que exista uma licença formal no repositório, não se deve presumir autorização para copiar, modificar ou redistribuir o jogo.

---

## 🏁 Retro Turbo Racer

**Velocidade, reflexos e diversão em uma experiência arcade multiplataforma.**

Projeto em evolução contínua.
