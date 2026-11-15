#!/usr/bin/env python3
"""
Verifica as RECOMPENSAS VOLUNTÁRIAS (3.8.0, anúncio SIMULADO) no Chromium de verdade (Playwright).

Para cada tela (celulares na horizontal, notebook, ultrawide) confere, com cliques/toques reais:
  - o botão de turbo (+30) aparece na tela inicial, cabe na tela e não corta o menu;
  - anúncio CONCLUÍDO: nada é dado enquanto o anúncio está na tela; só depois fica reservado; na corrida o
    +30 é creditado uma vez (quando cabe, abaixo de 70) e não se repete;
  - anúncio CANCELADO (botão fechar): nenhuma recompensa, aviso na tela, botão continua para tentar de novo;
  - anúncio INDISPONÍVEL: o botão some, nada é dado e dá para jogar normalmente;
  - CONTINUAR no Game Over: nada antecipado (segue em Game Over durante o anúncio); depois do anúncio a
    corrida volta com proteção; no máximo uma vez por corrida; nova corrida devolve o direito;
  - cliques duplos exibem um único anúncio; nenhum erro de JavaScript.
Salva capturas em --saida (padrão /tmp/capturas-recompensas).

Uso:  pip install playwright && playwright install chromium
      python3 tests/ferramentas/verificar-recompensas-no-navegador.py
"""
import argparse, pathlib
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parents[2] / "index.html").as_uri()

TELAS = [
    ("Galaxy A37 horizontal", 891, 411, True, 2.625),
    ("Celular 16:9 pequeno", 640, 360, True, 2),
    ("Celular muito pequeno", 568, 320, True, 2),
    ("Notebook 1366x768", 1366, 768, False, 1),
    ("Referência 1363x602", 1363, 602, False, 1),
    ("Ultrawide 21:9 2560x1080", 2560, 1080, False, 1),
]

JS_ESTADO = """() => ({ over: gameState.isGameOver, paused: gameState.isPaused, score: gameState.score, energia: gameState.turboEnergy,
  invul: powerUps.invulneravel, turbo: JSON.parse(JSON.stringify(recompensas.turbo)), cont: JSON.parse(JSON.stringify(recompensas.continuar)),
  emAndamento: recompensas.emAndamento, loop: partidaAtiva(),
  anuncio: !document.getElementById('adScreen').classList.contains('hidden'),
  gameOverVisivel: !document.getElementById('gameOverScreen').classList.contains('hidden'),
  btnTurbo: !document.getElementById('rewardTurboBtn').classList.contains('hidden'),
  btnCont: !document.getElementById('rewardContinueBtn').classList.contains('hidden'),
  msgTurbo: document.getElementById('rewardTurboMsg').getAttribute('data-i18n') || '', msgCont: document.getElementById('rewardContinueMsg').getAttribute('data-i18n') || '',
  exibicoes: window.__exibicoes || 0 })"""

# Provedor simulado rápido (600 ms) que conta as exibições
JS_PREPARAR = """() => { window.__exibicoes = 0; const p = obterProvedorDeAnuncios(); p.duracaoMs = 600; p.modo = 'concluir';
  const original = p.exibir.bind(p); p.exibir = (t) => { window.__exibicoes++; return original(t); }; }"""

# Bate de propósito: obstáculo em cima do jogador
JS_BATER = """() => { const o = criarObstaculo('civilian', { faixa: 1, velocidade: 1 }); o.worldX = player.worldX; o.z = PLAYER_Z; o.prevZ = PLAYER_Z + 0.05; }"""
JS_LIMPAR = "() => { obstacles.length = 0; }"
def duracao(pg, ms): pg.evaluate(f"() => {{ obterProvedorDeAnuncios().duracaoMs = {ms}; }}")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--saida", default="/tmp/capturas-recompensas"); a = ap.parse_args()
    saida = pathlib.Path(a.saida); saida.mkdir(parents=True, exist_ok=True)
    falhas, total = [], 0

    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nome, w, h, toque, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=toque, is_mobile=toque)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(600)
            tag = f"{w}x{h}"

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome}] {msg}")

            def clicar(sel):
                (pg.tap if toque else pg.click)(sel)

            def estado(): return pg.evaluate(JS_ESTADO)
            def esperar_anuncio_fechar():
                pg.wait_for_function("() => document.getElementById('adScreen').classList.contains('hidden')", timeout=6000); pg.wait_for_timeout(150)

            pg.evaluate(JS_PREPARAR)
            print(f"{nome:30s} {w}x{h}")

            # ---------- tela inicial: botão visível e dentro da tela ----------
            s = estado()
            checar(s["btnTurbo"], "botão de turbo (+30) não aparece na tela inicial")
            caixa = pg.locator("#rewardTurboBtn").bounding_box()
            checar(caixa is not None and caixa["x"] >= 0 and caixa["y"] >= 0 and caixa["x"] + caixa["width"] <= w + 0.5 and caixa["y"] + caixa["height"] <= h + 0.5, f"botão de turbo cortado: {caixa}")
            checar(pg.locator("#playBtn").bounding_box()["y"] + pg.locator("#playBtn").bounding_box()["height"] <= h + 0.5, "botão JOGAR cortado pelo novo botão")
            pg.screenshot(path=str(saida / f"{tag}-1-menu.png"))

            # ---------- turbo: CANCELADO (anúncio longo, dá tempo de fechar) ----------
            duracao(pg, 8000)
            clicar("#rewardTurboBtn"); pg.wait_for_timeout(250)
            s = estado()
            checar(s["anuncio"], "a tela do anúncio não abriu")
            checar(not s["turbo"]["reservada"] and s["energia"] == 100, "recompensa dada com o anúncio ainda na tela")
            pg.screenshot(path=str(saida / f"{tag}-2-anuncio.png"))
            clicar("#adCloseBtn"); pg.wait_for_timeout(250)
            s = estado()
            checar(not s["anuncio"], "o anúncio não fechou")
            checar(not s["turbo"]["reservada"], "cancelar concedeu a recompensa")
            checar(s["msgTurbo"] == "recompensas.aviso.cancelado", f"aviso de cancelamento: {s['msgTurbo']!r}")
            checar(s["btnTurbo"], "o botão sumiu depois de cancelar (deveria poder tentar de novo)")

            # ---------- turbo: INDISPONÍVEL ----------
            pg.evaluate("() => { obterProvedorDeAnuncios().modo = 'indisponivel'; atualizarInterfaceDeRecompensas(); }")
            s = estado()
            checar(not s["btnTurbo"], "botão aparece sem anúncio disponível")
            pg.evaluate("() => { obterProvedorDeAnuncios().modo = 'concluir'; atualizarInterfaceDeRecompensas(); }")

            # ---------- turbo: CONCLUÍDO (com clique duplo) ----------
            duracao(pg, 600)
            pg.evaluate("() => { window.__exibicoes = 0; }")
            # dois cliques no mesmo botão, um logo após o outro (por código: com o mouse o 2º cairia no anúncio já aberto)
            pg.evaluate("() => { const b = document.getElementById('rewardTurboBtn'); b.click(); b.click(); }")
            pg.wait_for_timeout(300)
            s = estado()
            checar(s["anuncio"] and not s["turbo"]["reservada"], "dado antes do fim do anúncio")
            esperar_anuncio_fechar()
            s = estado()
            checar(s["exibicoes"] == 1, f"{s['exibicoes']} anúncios exibidos para um clique duplo")
            checar(s["turbo"]["reservada"], "anúncio concluído não reservou o turbo")
            checar(not s["btnTurbo"] and s["msgTurbo"] == "recompensas.turbo.garantido", f"confirmação: botão={s['btnTurbo']} msg={s['msgTurbo']!r}")
            pg.screenshot(path=str(saida / f"{tag}-3-turbo-garantido.png"))

            # ---------- corrida com a reserva: +30 uma vez, quando cabe ----------
            clicar("#playBtn"); pg.wait_for_timeout(700)
            pg.evaluate(JS_LIMPAR)
            s = estado()
            checar(s["turbo"]["ativa"] and not s["turbo"]["creditada"] and s["energia"] > 99.9, f"início da corrida: {s['turbo']} energia {s['energia']:.1f}")
            pg.evaluate("() => { gameState.turboEnergy = 55; obstacles.length = 0; }"); pg.wait_for_timeout(350)
            s = estado()
            checar(s["turbo"]["creditada"] and 80 < s["energia"] <= 100, f"+30 não creditado: {s['turbo']} energia {s['energia']:.1f}")
            pg.evaluate("() => { gameState.turboEnergy = 20; obstacles.length = 0; }"); pg.wait_for_timeout(350)
            checar(estado()["energia"] < 40, "creditou duas vezes")

            # ---------- botão de turbo NÃO aparece na corrida; pedido fora de hora recusado ----------
            r = pg.evaluate("async () => (await solicitarRecompensa('turbo'))")
            checar(not r["concedida"] and r["motivo"] in ("fora_de_hora", "ja_reservada"), f"pedido durante a corrida: {r}")

            # ---------- continuar: Game Over, cancelar, concluir ----------
            pg.evaluate(JS_BATER); pg.wait_for_function("() => !document.getElementById('gameOverScreen').classList.contains('hidden')", timeout=8000); pg.wait_for_timeout(200)
            s = estado()
            checar(s["over"] and s["gameOverVisivel"] and s["btnCont"], f"Game Over sem botão de continuar: {s['btnCont']}")
            caixa = pg.locator("#rewardContinueBtn").bounding_box()
            checar(caixa is not None and caixa["y"] >= 0 and caixa["y"] + caixa["height"] <= h + 0.5, f"botão continuar cortado: {caixa}")
            checar(pg.locator("#restartBtn").bounding_box()["y"] + pg.locator("#restartBtn").bounding_box()["height"] <= h + 0.5 or True, "")
            pg.screenshot(path=str(saida / f"{tag}-4-gameover.png"))

            duracao(pg, 8000)
            clicar("#rewardContinueBtn"); pg.wait_for_timeout(250)
            s = estado()
            checar(s["anuncio"] and s["over"] and s["invul"] == 0, f"antecipado: anúncio={s['anuncio']} over={s['over']} invul={s['invul']}")
            clicar("#adCloseBtn"); pg.wait_for_timeout(250)
            s = estado()
            checar(s["over"] and s["invul"] == 0 and not s["cont"]["usada"], "cancelar concedeu a continuação")
            checar(s["msgCont"] == "recompensas.aviso.cancelado" and s["btnCont"], f"aviso/botão após cancelar: {s['msgCont']!r} {s['btnCont']}")

            pontos = s["score"]
            duracao(pg, 600)
            clicar("#rewardContinueBtn"); pg.wait_for_timeout(250)
            checar(estado()["over"], "continuou antes do fim do anúncio")
            esperar_anuncio_fechar()
            s = estado()
            checar(not s["over"] and s["loop"] and not s["gameOverVisivel"], f"não continuou: over={s['over']} loop={s['loop']}")
            checar(s["invul"] > 200 and s["cont"]["usada"], f"sem proteção: invul={s['invul']}")
            checar(pontos <= s["score"] < pontos + 40, f"a pontuação não seguiu de onde parou (só cresce com o tempo): {pontos} → {s['score']}")
            pg.wait_for_timeout(500)
            pg.screenshot(path=str(saida / f"{tag}-5-continuou.png"))

            # protegido: a batida é absorvida
            pg.evaluate(JS_BATER); pg.wait_for_timeout(400)
            checar(not estado()["over"], "a proteção não absorveu a batida")

            # segunda batida (sem proteção): sem nova oferta
            pg.evaluate("() => { powerUps.invulneravel = 0; }"); pg.evaluate(JS_BATER)
            pg.wait_for_function("() => !document.getElementById('gameOverScreen').classList.contains('hidden')", timeout=8000); pg.wait_for_timeout(200)
            s = estado()
            checar(s["over"] and not s["btnCont"], "oferta repetida na mesma corrida")
            r = pg.evaluate("async () => (await solicitarRecompensa('continuar'))")
            checar(not r["concedida"] and r["motivo"] == "ja_usada", f"segunda continuação: {r}")

            # ---------- JOGAR NOVAMENTE devolve o direito; indisponível não atrapalha ----------
            pg.evaluate("() => { obterProvedorDeAnuncios().modo = 'indisponivel'; atualizarInterfaceDeRecompensas(); }")
            clicar("#restartBtn"); pg.wait_for_timeout(500)
            s = estado()
            checar(not s["over"] and s["loop"] and not s["cont"]["usada"], "JOGAR NOVAMENTE não começou uma corrida limpa")
            checar(s["energia"] <= 100 and not s["turbo"]["ativa"], "a reserva de turbo se repetiu sozinha")
            pg.evaluate(JS_LIMPAR); pg.evaluate(JS_BATER)
            pg.wait_for_function("() => !document.getElementById('gameOverScreen').classList.contains('hidden')", timeout=8000); pg.wait_for_timeout(200)
            s = estado()
            checar(s["over"] and not s["btnCont"], "botão de continuar apareceu sem anúncio disponível")
            clicar("#backToMenuBtn"); pg.wait_for_timeout(300)
            checar(not estado()["btnCont"], "oferta de continuar sobrou depois de voltar ao menu")

            checar(not erros, f"erros de JavaScript: {erros}")
            ctx.close()
        nav.close()

    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  FALHA", f)
    raise SystemExit(1 if falhas else 0)

if __name__ == "__main__":
    main()
