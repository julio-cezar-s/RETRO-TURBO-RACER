/* js/idiomas/textos/en.js
   English. Same keys as pt.js (the tests check it). A missing key falls back
   to Portuguese, so a half-finished translation never breaks the game.

   Units (km/h, mph, km, mi) are NOT part of a language: the player picks them
   separately (see idiomas/unidades.js), so English can use km/h and Portuguese mph.
*/

registrarIdioma({
  codigo: "en",
  nome: "English",
  locale: "en-US",
  htmlLang: "en",

  textos: {
    comum: {
      voltar: "BACK",
    },

    carregamento: {
      aviso: "LOADING...",
      falha: "Failed to load — see the notice at the top",
    },

    menu: {
      subtitulo: "Get ready to speed!",
      jogar: "PLAY",
      recordes: "HIGH SCORES",
      opcoes: "OPTIONS",
      versao: "version {versao}",
    },

    idioma: {
      rotulo: "LANGUAGE",
    },

    termos: {
      turbo: "TURBO",
      turboVazio: "EMPTY",
    },

    hud: {
      pontos: "SCORE",
      velocidade: "SPEED",
      distancia: "DISTANCE",
      nivel: "LEVEL {n}",
      combo: "COMBO",
      comboMaximo: "MAX",
      sequencia: "STREAK x{n}",
    },

    acessibilidade: {
      pausar: "Pause game",
      telaCheia: "Fullscreen",
      sairDaTelaCheia: "Exit fullscreen",
      turbo: "Activate turbo",
      idioma: "Language",
      unidadeVelocidade: "Speed unit",
      unidadeDistancia: "Distance unit",
    },

    pausa: {
      titulo: "GAME PAUSED",
      continuar: "RESUME",
      sair: "QUIT",
    },

    opcoes: {
      somLigado: "SOUND: ON",
      somDesligado: "SOUND: OFF",
      particulasLigadas: "PARTICLES: ON",
      particulasDesligadas: "PARTICLES: OFF",
      telaCheiaLigada: "FULLSCREEN: ON",
      telaCheiaDesligada: "FULLSCREEN: OFF",
    },

    fimDeJogo: {
      titulo: "GAME OVER",
      pontuacao: "Score:",
      jogarNovamente: "PLAY AGAIN",
      menuPrincipal: "MAIN MENU",
    },

    recordes: {
      vazio: "No high scores yet. Finish a race!",
    },

    girar: {
      titulo: "ROTATE YOUR DEVICE",
      texto: "Retro Turbo Racer is played with your phone in landscape.",
    },

    powerup: {
      nitro: "NITRO +{energia}",
      escudo: "SHIELD!",
      lentidao: "SLOW MOTION",
      dobro: "SCORE x2",
    },

    quase: {
      nivel: {
        RENTE: "GRAZE",
        PERTO: "CLOSE",
        QUASE: "NEAR MISS",
      },
      aviso: "{nome}!",
    },

    combo: {
      subiu: "COMBO x{n}!",
      perdido: "COMBO LOST",
      caiu: "COMBO DROPPED TO x{n}",
    },

    resumo: {
      combo: "Best combo: x{melhor} · Dodges: {desvios} (+{pontos} pts)",
      powerups: "Power-ups collected: {coletados}{salvou}",
      escudoSalvou: " · Shield saved you {n}x",
      quase: "Near misses: {total} (+{pontos} pts) · Best streak: x{sequencia}",
    },

    cenario: {
      cargaLarga: "WIDE LOAD",
      outdoors: ["TURBO", "NITRO", "RETRO", "FUEL"],
      portico: ["TURBO", "RETRO"],
    },

    erro: {
      carregarArquivo: "Could not load a game file",
      generico: "Game error",
      preparar: "Could not set up the game",
      iniciarPartida: "Could not start the match",
      recarregar: "Reload",
      fechar: "Close",
      dica: "If the error persists, reload ignoring the cache (Ctrl+F5) and check that all the files in the folder were copied.",
    },

    formato: {
      ordinal: { one: "{n}st", two: "{n}nd", few: "{n}rd", other: "{n}th" },
    },
  },
});
