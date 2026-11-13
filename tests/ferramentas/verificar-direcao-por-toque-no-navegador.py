#!/usr/bin/env python3
"""Verifica a direção por toque (3.5.0) no Chromium de verdade, com toques reais (CDP).

Opcional: não faz parte do `npm test`. Precisa de playwright + chromium.
  python3 tests/ferramentas/verificar-direcao-por-toque-no-navegador.py [--saida PASTA]

Em várias resoluções de celular e notebook com tela de toque confere:
  - dedo na metade esquerda/direita vira para o lado certo e soltar para na hora;
  - arrastar de uma metade para a outra troca a direção sem levantar o dedo;
  - multitouch (dois dedos, um em cada lado, e dedo no turbo + dedo dirigindo);
  - levantar o dedo fora do canvas (fora da janela) não deixa a direção presa;
  - pausar, perder o foco e bater cancelam a direção;
  - o jogo não rola nem dá zoom (touch-action, overscroll, rolagem da página);
  - não existem botões de seta; turbo, pausa e tela cheia continuam.
"""
import argparse, pathlib, sys
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parents[2]
URL = (RAIZ / "index.html").as_uri()

TELAS = [  # nome, largura, altura, dpr
    ("Celular pequeno", 568, 320, 2), ("iPhone SE horizontal", 667, 375, 2), ("Celular 16:9", 740, 360, 2),
    ("iPhone 14 horizontal", 844, 390, 3), ("A37 horizontal", 891, 411, 2.625), ("A37 com barra do navegador", 891, 360, 2.625),
    ("Celular grande", 932, 430, 3), ("Tablet 1024x768", 1024, 768, 2), ("Notebook touch 1366x768", 1366, 768, 1),
    ("Notebook touch 1920x1080", 1920, 1080, 1),
]

ESTADO = "() => ({e: input.left, d: input.right, turbo: gameState.isTurboActive, pausado: gameState.isPaused, over: gameState.isGameOver})"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--saida", default="/tmp/capturas-toque"); a = ap.parse_args()
    falhas, total = [], 0

    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nome, w, h, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=True, is_mobile=True)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(400)
            cdp = ctx.new_cdp_session(pg)

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome} {w}x{h}] {msg}")

            def pontos(*dedos):
                return [{"x": x, "y": y, "id": i} for i, x, y in dedos]

            def toque(tipo, *dedos):
                cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": pontos(*dedos)})
                pg.wait_for_timeout(40)

            def dirs():
                s = pg.evaluate(ESTADO); return (s["e"], s["d"])

            pg.tap("#playBtn"); pg.wait_for_timeout(1000)
            pg.evaluate("() => document.fullscreenElement ? document.exitFullscreen() : null"); pg.wait_for_timeout(300)
            # a partida roda sozinha: mantém a pista sem obstáculos para o carro não bater no meio do teste
            pg.evaluate("() => { window.__limpa = setInterval(() => { obstacles.length = 0; }, 8); }")

            W = pg.evaluate("() => innerWidth"); H = pg.evaluate("() => innerHeight")
            y = H * 0.55; esq = W * 0.25; dir = W * 0.75; meio = W / 2
            checar(pg.evaluate("() => !gameState.isPaused && !gameState.isGameOver"), "a partida precisa estar rodando")

            # 1) metades
            toque("touchStart", (1, esq, y)); checar(dirs() == (True, False), f"esquerda: {dirs()}")
            toque("touchEnd"); checar(dirs() == (False, False), f"soltar esquerda: {dirs()}")
            toque("touchStart", (1, dir, y)); checar(dirs() == (False, True), f"direita: {dirs()}")
            toque("touchEnd"); checar(dirs() == (False, False), f"soltar direita: {dirs()}")
            toque("touchStart", (1, meio - 2, y)); checar(dirs() == (True, False), "um pixel antes do meio = esquerda")
            toque("touchEnd")
            toque("touchStart", (1, meio + 2, y)); checar(dirs() == (False, True), "um pixel depois do meio = direita")
            toque("touchEnd")

            # 2) arrastar entre as metades, sem levantar o dedo
            toque("touchStart", (1, esq, y))
            toque("touchMove", (1, dir, y)); checar(dirs() == (False, True), f"arrastar para a direita: {dirs()}")
            toque("touchMove", (1, esq, y)); checar(dirs() == (True, False), f"arrastar para a esquerda: {dirs()}")
            toque("touchEnd"); checar(dirs() == (False, False), "soltar depois de arrastar")

            # 3) multitouch
            toque("touchStart", (1, esq, y), (2, dir, y)); checar(dirs() == (True, True), f"dois lados: {dirs()}")
            toque("touchEnd", (2, dir, y)); checar(dirs() == (True, False), f"soltou o da direita: {dirs()}")
            toque("touchEnd"); checar(dirs() == (False, False), "soltou os dois")
            toque("touchStart", (1, esq, y), (2, esq + 40, y + 10)); toque("touchEnd", (2, esq + 40, y + 10))
            checar(dirs() == (True, False), "dois dedos no mesmo lado: soltar um mantém"); toque("touchEnd")

            # 4) turbo junto com a direção
            caixa = pg.evaluate("() => { const b = document.getElementById('turboBtn').getBoundingClientRect(); return [b.x + b.width/2, b.y + b.height/2]; }")
            pg.evaluate("() => { gameState.turboEnergy = 100; }")
            toque("touchStart", (1, esq, y), (2, caixa[0], caixa[1]))
            s = pg.evaluate(ESTADO)
            checar(s["e"] and not s["d"], f"dedo no turbo não dirige: {s}")
            checar(s["turbo"], f"o turbo ligou com o outro dedo dirigindo: {s}")
            toque("touchEnd", (2, caixa[0], caixa[1])); s = pg.evaluate(ESTADO)
            checar(not s["turbo"] and s["e"], f"soltar o turbo mantém a direção: {s}")
            toque("touchEnd"); checar(dirs() == (False, False), "soltou tudo")

            # 5) levantar o dedo fora do canvas e fora da janela
            toque("touchStart", (1, dir, y)); toque("touchMove", (1, W + 400, y)); toque("touchMove", (1, -200, -50))
            toque("touchEnd"); checar(dirs() == (False, False), f"dedo solto fora da janela: {dirs()}")
            cv = pg.evaluate("() => { const b = document.getElementById('gameCanvas').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }")
            fora = cv[0] / 2 if cv[0] > 8 else None
            if fora:
                toque("touchStart", (1, fora, y)); checar(dirs()[0], "toque na lateral, fora do canvas, também dirige")
                toque("touchEnd"); checar(dirs() == (False, False), "soltar na lateral")

            # 6) sem rolagem nem zoom
            r = pg.evaluate("""() => ({ta: getComputedStyle(document.getElementById('game-container')).touchAction,
                oc: getComputedStyle(document.documentElement).overscrollBehaviorY, sx: scrollX, sy: scrollY,
                rolax: document.documentElement.scrollWidth > innerWidth, rolay: document.documentElement.scrollHeight > innerHeight,
                vp: document.querySelector('meta[name=viewport]').content})""")
            checar(r["ta"] == "none", f"touch-action do jogo: {r['ta']}")
            checar(r["oc"] == "none", f"overscroll-behavior: {r['oc']}")
            checar("user-scalable=no" in r["vp"], "viewport sem zoom")
            toque("touchStart", (1, dir, y))
            for k in range(8): toque("touchMove", (1, dir - k * 5, y + 120 - k * 30))        # arrasto vertical longo
            checar(pg.evaluate("() => [scrollX, scrollY]") == [0, 0], "arrastar não rola a página")
            toque("touchEnd")
            checar(pg.evaluate("() => visualViewport.scale") == 1, "sem zoom")

            # 7) botões de seta não existem; os demais sim
            checar(pg.evaluate("() => !document.getElementById('leftBtn') && !document.getElementById('rightBtn')"), "sem botões de seta")
            checar(pg.evaluate("() => !!document.getElementById('turboBtn') && !!document.getElementById('pauseBtn')"), "turbo e pausa existem")

            # 8) pausa cancela; dedo apertado não volta a dirigir; retomar exige toque novo
            toque("touchStart", (1, esq, y), (2, dir, y)); checar(dirs() == (True, True), "dois lados antes de pausar")
            pg.tap("#pauseBtn") if False else pg.evaluate("() => document.getElementById('pauseBtn').click()")
            pg.wait_for_timeout(120)
            s = pg.evaluate(ESTADO); checar(s["pausado"] and not s["e"] and not s["d"], f"pausar cancela: {s}")
            toque("touchMove", (1, esq + 10, y), (2, dir - 10, y)); checar(dirs() == (False, False), "dedos antigos não dirigem na pausa")
            toque("touchEnd")
            pg.evaluate("() => document.getElementById('resumeBtn').click()"); pg.wait_for_timeout(120)
            checar(dirs() == (False, False), "ao retomar ninguém dirige")
            toque("touchStart", (1, dir, y)); checar(dirs() == (False, True), "toque novo volta a dirigir"); toque("touchEnd")

            # 9) perder o foco cancela
            toque("touchStart", (1, esq, y)); pg.evaluate("() => window.dispatchEvent(new Event('blur'))")
            checar(dirs() == (False, False), f"blur cancela: {dirs()}"); toque("touchEnd")

            # 10) bater (fim de jogo) cancela
            toque("touchStart", (1, dir, y))
            pg.evaluate("() => { clearInterval(window.__limpa); iniciarBatida(criarObstaculo('civilian', { faixa: 1 })); }")
            pg.wait_for_timeout(100)
            s = pg.evaluate(ESTADO); checar(s["over"] and not s["e"] and not s["d"], f"fim de jogo cancela: {s}")
            toque("touchStart", (2, esq, y)); checar(dirs() == (False, False), "depois do fim de jogo não dirige")
            toque("touchEnd")

            pg.screenshot(path=str(pathlib.Path(a.saida) / f"{w}x{h}.png")) if pathlib.Path(a.saida).mkdir(parents=True, exist_ok=True) is None else None
            checar(not erros, f"erros de JavaScript: {erros}")
            print(f"{nome:28s} {w}x{h}: ok" if not [f for f in falhas if f.startswith(f"[{nome} ")] else f"{nome:28s} {w}x{h}: FALHOU")
            ctx.close()
        nav.close()

    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  -", f)
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
