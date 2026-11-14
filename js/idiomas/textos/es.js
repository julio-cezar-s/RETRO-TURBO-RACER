/* js/idiomas/textos/es.js
   Español. Mismas claves que pt.js (las pruebas lo comprueban). Si falta una
   clave, se usa el portugués, así una traducción a medias nunca rompe el juego.

   Las unidades (km/h, mph, km, mi) NO forman parte del idioma: el jugador las
   elige aparte (ver idiomas/unidades.js).
*/

registrarIdioma({
  codigo: "es",
  nome: "Español",
  locale: "es-ES",
  htmlLang: "es",

  textos: {
    comum: {
      voltar: "VOLVER",
    },

    carregamento: {
      aviso: "CARGANDO...",
      falha: "Error al cargar — mira el aviso de arriba",
    },

    menu: {
      subtitulo: "¡Prepárate para acelerar!",
      jogar: "JUGAR",
      recordes: "RÉCORDS",
      opcoes: "OPCIONES",
      versao: "versión {versao}",
    },

    idioma: {
      rotulo: "IDIOMA",
    },

    termos: {
      turbo: "TURBO",
      turboVazio: "VACÍO",
    },

    hud: {
      pontos: "PUNTOS",
      velocidade: "VELOCIDAD",
      distancia: "DISTANCIA",
      nivel: "NIVEL {n}",
      combo: "COMBO",
      comboMaximo: "MÁXIMO",
      sequencia: "RACHA x{n}",
    },

    acessibilidade: {
      pausar: "Pausar el juego",
      telaCheia: "Pantalla completa",
      sairDaTelaCheia: "Salir de pantalla completa",
      turbo: "Activar el turbo",
      idioma: "Idioma",
      unidadeVelocidade: "Unidad de velocidad",
      unidadeDistancia: "Unidad de distancia",
    },

    pausa: {
      titulo: "JUEGO EN PAUSA",
      continuar: "CONTINUAR",
      sair: "SALIR",
    },

    opcoes: {
      somLigado: "SONIDO: SÍ",
      somDesligado: "SONIDO: NO",
      particulasLigadas: "PARTÍCULAS: SÍ",
      particulasDesligadas: "PARTÍCULAS: NO",
      telaCheiaLigada: "PANT. COMPLETA: SÍ",
      telaCheiaDesligada: "PANT. COMPLETA: NO",
    },

    fimDeJogo: {
      titulo: "FIN DEL JUEGO",
      pontuacao: "Puntuación:",
      jogarNovamente: "JUGAR DE NUEVO",
      menuPrincipal: "MENÚ PRINCIPAL",
    },

    recordes: {
      vazio: "Aún no hay récords. ¡Completa una carrera!",
    },

    girar: {
      titulo: "GIRA EL DISPOSITIVO",
      texto: "Retro Turbo Racer se juega con el teléfono en horizontal.",
    },

    powerup: {
      nitro: "NITRO +{energia}",
      escudo: "¡ESCUDO!",
      lentidao: "CÁMARA LENTA",
      dobro: "PUNTOS x2",
    },

    quase: {
      nivel: {
        RENTE: "RASPÓN",
        PERTO: "CERCA",
        QUASE: "POR POCO",
      },
      aviso: "¡{nome}!",
    },

    combo: {
      subiu: "¡COMBO x{n}!",
      perdido: "COMBO PERDIDO",
      caiu: "COMBO BAJA A x{n}",
    },

    resumo: {
      combo: "Mejor combo: x{melhor} · Esquivas: {desvios} (+{pontos} pts)",
      powerups: "Power-ups recogidos: {coletados}{salvou}",
      escudoSalvou: " · El escudo te salvó {n}x",
      quase: "Casi choques: {total} (+{pontos} pts) · Mejor racha: x{sequencia}",
    },

    cenario: {
      cargaLarga: "CARGA ANCHA",
      outdoors: ["TURBO", "NITRO", "RETRO", "FUEL"],
      portico: ["TURBO", "RETRO"],
    },

    erro: {
      carregarArquivo: "No se pudo cargar un archivo del juego",
      generico: "Error en el juego",
      preparar: "No se pudo preparar el juego",
      iniciarPartida: "No se pudo iniciar la partida",
      recarregar: "Recargar",
      fechar: "Cerrar",
      dica: "Si el error continúa, recarga ignorando la caché (Ctrl+F5) y comprueba que se copiaron todos los archivos de la carpeta.",
    },

    formato: {
      ordinal: "{n}.º",
    },
  },
});
