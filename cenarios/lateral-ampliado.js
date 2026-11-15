/* js/cenarios/lateral-ampliado.js
   CENÁRIO EXTRA para a vista mais larga que 640 (telas ultrawide, celulares compridos,
   notebooks com janela baixa): árvores, casas, galpões e silos mais afastados da pista,
   para a área lateral que passou a aparecer não ficar só com o gramado.

   Só entra quando VISTA.largura > GAME_WIDTH (na vista de 640 não gera nada, então o
   cenário fica igual ao de antes). Usa as mesmas funções de desenho e a mesma
   perspectiva do resto do cenário; as posições são ancoradas na distância percorrida
   (estáveis ao rolar). Nada aqui é colisão: é só visual.
*/

// Onde o cenário original termina (árvores de fundo até 17, construções até 9,4 unidades)
const LATERAL_AMPLIADO = {
  inicio: 17,               // x (em unidades de faixa) onde as árvores extras começam
  espacoArvores: 2.4,       // distância entre árvores extras ao longo da pista
  chanceArvore: 0.65,       // chance de existir uma árvore em cada posição/lado
  espacoConstrucoes: 31,    // distância entre construções extras
  chanceConstrucao: 0.55,
  construcaoDe: 11,         // construções extras ficam entre estes dois x
  construcaoAte: 30,
};

// Até onde (em unidades de faixa) a tela alcança na profundidade máxima: limita o sorteio
function alcanceLateralDaVista() {
  return (VISTA.largura / 2) * Z_FAR / CAMERA_SCALE;
}

function coletarCenarioLateralAmpliado(lista) {
  if (VISTA.largura <= GAME_WIDTH + 0.5) return;

  const L = LATERAL_AMPLIADO;
  const alcance = Math.max(L.inicio + 1, Math.min(alcanceLateralDaVista(), 90));

  // Árvores de fundo, mais afastadas que as do cenário original
  percorrerPosicoes(L.espacoArvores, (k, z) => {
    for (let lado = -1; lado <= 1; lado += 2) {
      const sem = k * 4.43 + lado * 29;

      if (hash01(sem) > L.chanceArvore) continue;

      lista.push({
        tipo: "arvore",
        z,
        x: lado * (L.inicio + hash01(sem + 2) * (alcance - L.inicio)),
        variante: Math.floor(hash01(sem + 3) * 3),
        tamanho: 0.95 + hash01(sem + 4) * 0.6,
        sem,
      });
    }
  });

  // Algumas construções distantes (as funções de desenho aceitam qualquer x)
  percorrerPosicoes(L.espacoConstrucoes, (k, z) => {
    for (let lado = -1; lado <= 1; lado += 2) {
      const sem = k * 2.71 + lado * 83;

      if (hash01(sem) > L.chanceConstrucao) continue;

      const t = hash01(sem + 1);
      const x = lado * (L.construcaoDe + hash01(sem + 2) * (Math.min(L.construcaoAte, alcance) - L.construcaoDe));

      if (t < 0.4) {
        lista.push({ tipo: "galpao", z, x, paleta: Math.floor(hash01(sem + 3) * 3), sem });
      } else if (t < 0.75) {
        lista.push({ tipo: "casa", z, x, cor: hash01(sem + 3), sem });
      } else {
        lista.push({ tipo: "silo", z, x, sem });
      }
    }
  });
}
