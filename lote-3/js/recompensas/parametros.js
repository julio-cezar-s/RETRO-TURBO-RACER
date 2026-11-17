/* js/recompensas/parametros.js
   Sistema de RECOMPENSAS VOLUNTÁRIAS (3.8.0): o jogador escolhe assistir a um anúncio e, SÓ depois
   de o anúncio ser concluído, ganha a recompensa. Nesta versão o anúncio é SIMULADO (sem AdMob);
   o contrato de js/recompensas/anuncios.js deixa a troca por anúncios reais para depois.
   Aqui ficam só os números; nada daqui mexe na física, na pontuação nem nos power-ups.
*/

const RECOMPENSAS = {
  turbo: {
    // Energia somada, como o power-up nitro faz (mesma conta: o turbo nunca passa de 100)
    energia: 30,

    // A energia só é creditada quando cabe inteira (energia ≤ 100 − 30): como o turbo começa cheio
    // e o teto é 100, creditar no início da corrida seria desperdiçar os +30.
    creditarAbaixoDe: 100 - 30,
  },

  continuar: {
    // Proteção temporária ao continuar: usa a janela de invulnerabilidade que o escudo já usa
    // (powerups/efeitos.js: batidas são absorvidas). 300 quadros = 5 s a 60 quadros/s.
    protecao: 300,
  },

  simulado: {
    duracaoMs: 3000,   // duração do anúncio simulado
  },
};
