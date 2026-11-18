// js/audio/gerenciador.js - Gerenciador de Efeitos Sonoros (arquivos de áudio)

// Volumes (0 a 1). Valores de 3.9.0: batida e freada mais suaves; a sirene nasce baixinha e sobe com a
// aproximação da viatura (veja volumeDaSirenePorDistancia).
const AJUSTE_DE_SOM = {
    batida: { volume: 0.4 },                                   // era 0.7
    // A freada só toca numa batida de verdade (nunca em poça de óleo nem em cone), curta e com fade
    freada: { volume: 0.18, duracaoMs: 900, fadeMs: 450 },     // era 0.5, o arquivo inteiro (2,4 s)
    sirene: {
        volumeMinimo: 0.03,        // viatura lá longe: quase inaudível
        volumeMaximo: 0.4,         // viatura emparelhando: o volume de antes
        curva: 2,                  // 2 = sobe devagar de longe e mais rápido de perto
        subida: 0.1,               // suavização por quadro (sem saltos de volume)
        descida: 0.16,             // ao passar pela viatura, o som some em ~0,3 s
    },
};

const gerenciadorAudio = {
    sons: {
        freada: new Audio('audio/freadaCarro.mp3'),
        policia: new Audio('audio/policia.mp3'),
        batida: new Audio('audio/batidaCarro.mp3')
    },

    mudo: false,
    sonsPausados: new Set(),
    temporizadores: new Map(),      // fades em andamento (nome do som → id)

    obterPreferenciaSom() {
        try {
            const opcoes = JSON.parse(
                localStorage.getItem('retroTurboOptions') || '{}'
            );
            return opcoes.sound !== false;
        } catch (erro) {
            return true;
        }
    },

    inicializar() {
        this.sons.freada.volume = AJUSTE_DE_SOM.freada.volume;
        this.sons.policia.volume = AJUSTE_DE_SOM.sirene.volumeMinimo;
        this.sons.batida.volume = AJUSTE_DE_SOM.batida.volume;

        this.mudo = !this.obterPreferenciaSom();
    },

    ativarMudo(ativar) {
        this.mudo = ativar;

        if (ativar) {
            this.cancelarFades();
            Object.values(this.sons).forEach(som => {
                som.pause();
                som.currentTime = 0;
            });

            this.sonsPausados.clear();
        }
    },

    tocar(nomeSom, loop = false) {
        if (this.mudo || !this.obterPreferenciaSom()) return;

        const som = this.sons[nomeSom];

        if (!som) return;

        som.loop = loop;
        som.currentTime = 0;

        som.play().catch(erro => {
            console.log('Áudio aguardando interação do usuário:', erro);
        });
    },

    // Toca um som por pouco tempo e o apaga com fade (a freada da batida: o arquivo tem 2,4 s)
    tocarCurto(nomeSom, { volume, duracaoMs, fadeMs }) {
        if (this.mudo || !this.obterPreferenciaSom()) return;

        const som = this.sons[nomeSom];
        if (!som) return;

        this.cancelarFade(nomeSom);
        som.volume = volume;
        this.tocar(nomeSom);

        const passo = 50;
        const inicioDoFade = Math.max(0, duracaoMs - fadeMs);
        let decorrido = 0;

        const id = setInterval(() => {
            decorrido += passo;

            if (decorrido >= duracaoMs) {
                this.cancelarFade(nomeSom);
                som.pause();
                som.currentTime = 0;
                som.volume = volume;
            } else if (decorrido > inicioDoFade) {
                som.volume = Math.max(0, volume * (1 - (decorrido - inicioDoFade) / fadeMs));
            }
        }, passo);

        this.temporizadores.set(nomeSom, id);
    },

    cancelarFade(nomeSom) {
        if (this.temporizadores.has(nomeSom)) {
            clearInterval(this.temporizadores.get(nomeSom));
            this.temporizadores.delete(nomeSom);
        }
    },

    cancelarFades() {
        [...this.temporizadores.keys()].forEach(n => this.cancelarFade(n));
    },

    parar(nomeSom) {
        const som = this.sons[nomeSom];
        this.cancelarFade(nomeSom);

        if (som) {
            som.pause();
            som.currentTime = 0;
            this.sonsPausados.delete(som);
        }
    },

    estaTocando(nomeSom) {
        const som = this.sons[nomeSom];
        return !!som && !som.paused && !som.ended;
    },

    pararTudo() {
        this.cancelarFades();

        Object.values(this.sons).forEach(som => {
            som.pause();
            som.currentTime = 0;
        });

        this.sonsPausados.clear();
    },

    pausarTudo() {
        this.sonsPausados.clear();

        Object.values(this.sons).forEach(som => {
            if (!som.paused && !som.ended) {
                this.sonsPausados.add(som);
                som.pause();
            }
        });
    },

    retomarTudo() {
        if (this.mudo || !this.obterPreferenciaSom()) {
            this.sonsPausados.clear();
            return;
        }

        this.sonsPausados.forEach(som => {
            som.play().catch(erro => {
                console.log('Não foi possível retomar o áudio:', erro);
            });
        });

        this.sonsPausados.clear();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    gerenciadorAudio.inicializar();
});

// Sirene da viatura: só inicia se ainda não estiver tocando, SEMPRE começando baixinha
function playPoliceSiren() {
    if (gerenciadorAudio.estaTocando('policia')) return;
    if (gerenciadorAudio.sonsPausados.size > 0) return;

    gerenciadorAudio.sons.policia.volume = AJUSTE_DE_SOM.sirene.volumeMinimo;
    gerenciadorAudio.tocar('policia', true);
}

function stopPoliceSiren() {
    gerenciadorAudio.parar('policia');
    gerenciadorAudio.sons.policia.volume = AJUSTE_DE_SOM.sirene.volumeMinimo;
}

// Volume da sirene conforme a distância da viatura: z = Z_FAR (acabou de surgir) → mínimo;
// z = PLAYER_Z (emparelhando com o jogador) → máximo. Função pura, sem efeito colateral.
function volumeDaSirenePorDistancia(z) {
    const a = AJUSTE_DE_SOM.sirene;
    const proximidade = Math.max(0, Math.min(1, (Z_FAR - z) / (Z_FAR - PLAYER_Z)));

    return a.volumeMinimo + (a.volumeMaximo - a.volumeMinimo) * Math.pow(proximidade, a.curva);
}

// Chamado a cada quadro: zMaisProxima = z da viatura mais próxima à frente (ou null se não há).
// O volume acompanha a distância com suavização; sem viatura, o som se apaga e para.
function atualizarVolumeDaSirene(zMaisProxima, dt = 1) {
    const som = gerenciadorAudio.sons.policia;
    const a = AJUSTE_DE_SOM.sirene;

    if (zMaisProxima === null) {
        if (!gerenciadorAudio.estaTocando('policia')) return;

        som.volume = Math.max(0, som.volume - som.volume * Math.min(1, a.descida * dt) - 0.002);
        if (som.volume <= 0.01) stopPoliceSiren();
        return;
    }

    const alvo = volumeDaSirenePorDistancia(zMaisProxima);
    const novo = som.volume + (alvo - som.volume) * Math.min(1, a.subida * dt);

    som.volume = Math.max(0, Math.min(1, novo));
}
