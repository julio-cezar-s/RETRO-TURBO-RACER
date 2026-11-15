#!/usr/bin/env python3
"""
Verifica o TURBO NO INDICADOR CIRCULAR (3.8.0) no Chromium de verdade (Playwright), em celulares na
horizontal, tablets, notebooks e monitores ultrawide, com a partida rodando.

Confere, com toques reais (CDP) nos celulares e cliques/teclado nos computadores:
  - o botão quadrado laranja não existe: o #turboBtn é transparente, sem borda e sem texto;
  - a área de toque cobre o indicador (elementFromPoint no centro e nas bordas), tem 64 px ou mais
    (44 px é o mínimo de acessibilidade) e está inteira dentro do canvas;
  - tocar/clicar liga o turbo; soltar desliga; o disco do indicador passa de azul a laranja e volta;
  - tocar no círculo nunca aciona a direção; um dedo dirige e outro segura o turbo ao mesmo tempo;
  - as metades esquerda/direita continuam dirigindo; Espaço, pausa (P) seguem funcionando;
  - a energia diminui com o turbo ligado e o texto de porcentagem acompanha;
  - nenhum erro de JavaScript.
Salva capturas em --saida (padrão /tmp/capturas-turbo).

Uso:  pip install playwright && playwright install chromium
      python3 tests/ferramentas/verificar-turbo-no-navegador.py
"""
import argparse, pathlib
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parents[2] / "index.html").as_uri()

# nome, largura, altura, toque, dpr
TELAS = [
    ("Galaxy A37 horizontal", 891, 411, True, 2.625),
    ("Galaxy A37 com barra do navegador", 891, 360, True, 2.625),
    ("Celular 16:9 pequeno", 640, 360, True, 2),
    ("Celular muito pequeno", 568, 320, True, 2),
    ("iPhone horizontal", 844, 390, True, 3),
    ("Celular 21:9", 960, 411, True, 2.625),
    ("Tablet 4:3", 1024, 768, True, 2),
    ("Referência 1363x602", 1363, 602, False, 1),
    ("Notebook 1366x768", 1366, 768, False, 1),
    ("Notebook 16:10 1440x900", 1440, 900, False, 2),
    ("Full HD 1920x1080", 1920, 1080, False, 1),
    ("Ultrawide 21:9 2560x1080", 2560, 1080, False, 1),
    ("Super ultrawide 5120x1440", 5120, 1440, False, 1),
]

JS_GEOMETRIA = """() => {
  const c = document.getElementById('gameCanvas').getBoundingClientRect();
  const b = document.getElementById('turboBtn');
  const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
  const u = c.height / GAME_HEIGHT;
  const gx = c.x + (VISTA.largura - 52) * u, gy = c.y + (GAME_HEIGHT - 52) * u;     // centro do indicador
  const noCentro = document.elementFromPoint(gx, gy);
  const nasBordas = [[-30, 0], [30, 0], [0, -30], [0, 30]].map(([dx, dy]) => document.elementFromPoint(gx + dx * u, gy + dy * u) === b);
  return { canvas: {x: c.x, y: c.y, w: c.width, h: c.height}, botao: {x: r.x, y: r.y, w: r.width, h: r.height},
           u, gx, gy, noCentro: noCentro && noCentro.id, nasBordas,
           fundo: cs.backgroundColor, borda: cs.borderTopWidth, raio: cs.borderTopLeftRadius, texto: b.textContent, cor: cs.color,
           aria: b.getAttribute('aria-label'), visibilidade: cs.visibility, display: cs.display,
           botoesQuadradosLaranja: [...document.querySelectorAll('button')].filter(x => { const s = getComputedStyle(x);
              return x.offsetWidth > 0 && /rgb\\(2[0-5]\\d, ?1[0-9]\\d, ?\\d{1,2}\\)/.test(s.borderTopColor) && x.id === 'turboBtn'; }).length };
}"""

# Cor do disco do indicador (ponto sem a chama nem o arco): lado esquerdo do disco
JS_COR = """() => {
  const c = document.getElementById('gameCanvas'); const k = c.getContext('2d');
  const s = c.width / VISTA.largura;
  const lx = (VISTA.largura - 52) - 24, ly = GAME_HEIGHT - 52 - 6;
  const d = k.getImageData(Math.round(lx * s), Math.round(ly * s), 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], ativo: gameState.isTurboActive, energia: gameState.turboEnergy,
           esq: input.left, dir: input.right, over: gameState.isGameOver, texto: document.getElementById('turboPercentage').textContent };
}"""

# O robô não dirige: antes de cada etapa tira os obstáculos da pista (ou recomeça, se já bateu)
JS_LIMPAR = """() => { if (gameState.isGameOver) { document.getElementById('restartBtn').click(); }
                      obstacles.length = 0; gameState.turboEnergy = Math.max(gameState.turboEnergy, 0); }"""

def cor_nome(c):
    return "laranja" if c["r"] > c["b"] + 25 else "azul" if c["b"] > c["r"] + 25 else "?"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--saida", default="/tmp/capturas-turbo"); a = ap.parse_args()
    saida = pathlib.Path(a.saida); saida.mkdir(parents=True, exist_ok=True)
    falhas, total = [], 0

    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nome, w, h, toque, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=toque, is_mobile=toque)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(500)
            (pg.tap if toque else pg.click)("#playBtn"); pg.wait_for_timeout(900)

            def limpar():
                pg.evaluate(JS_LIMPAR); pg.wait_for_timeout(60)

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome}] {msg}")

            g = pg.evaluate(JS_GEOMETRIA); c, b = g["canvas"], g["botao"]
            print(f"{nome:36s} {w}x{h} área de toque {b['w']:.0f}x{b['h']:.0f} px  canvas {c['w']:.0f}x{c['h']:.0f}")

            # --- o botão laranja não existe mais; a área é invisível e circular ---
            checar(g["fundo"] in ("rgba(0, 0, 0, 0)", "transparent"), f"fundo visível: {g['fundo']}")
            checar(g["borda"] == "0px", f"borda: {g['borda']}")
            checar(g["raio"] in ("50%", f"{b['w']/2}px") or g["raio"].endswith("%"), f"raio: {g['raio']}")
            checar(g["texto"] == "", f"texto no botão: {g['texto']!r}")
            checar(bool(g["aria"]), "sem aria-label")
            checar(g["display"] != "none" and g["visibilidade"] == "visible", "área do turbo oculta")

            # --- área de toque: cobre o indicador, grande, dentro do canvas ---
            checar(b["w"] >= 63.5 and b["h"] >= 63.5, f"área {b['w']:.0f}x{b['h']:.0f} < 64 px")
            checar(b["x"] >= c["x"] - .5 and b["x"] + b["w"] <= c["x"] + c["w"] + .5 and b["y"] >= c["y"] - .5 and b["y"] + b["h"] <= c["y"] + c["h"] + .5, "área de toque fora do canvas")
            checar(g["noCentro"] == "turboBtn", f"elemento no centro do indicador: {g['noCentro']}")
            checar(all(g["nasBordas"]), f"a área não cobre as bordas do indicador: {g['nasBordas']}")
            checar(abs((b["x"] + b["w"] / 2) - g["gx"]) < 0.8 + max(0, b["w"] / 2 - 52 * g["u"]), "área descentralizada em x")
            checar(abs((b["y"] + b["h"] / 2) - g["gy"]) < 0.8 + max(0, b["h"] / 2 - 52 * g["u"]), "área descentralizada em y")

            pg.screenshot(path=str(saida / f"{w}x{h}-{nome.split()[0].lower()}-azul.png"))
            pg.evaluate("() => { gameState.turboEnergy = 100; gameState.isTurboActive = false; }")
            checar(cor_nome(pg.evaluate(JS_COR)) == "azul", f"parado não está azul: {pg.evaluate(JS_COR)}")

            gx, gy = g["gx"], g["gy"]
            if toque:
                cdp = ctx.new_cdp_session(pg)
                def pontos(*ps): return [{"x": x, "y": y, "id": i} for i, (x, y) in enumerate(ps)]
                def toca(tipo, *ps): cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": pontos(*ps) if tipo != "touchEnd" else []})

                # toque no círculo: liga o turbo, fica laranja, NÃO dirige
                limpar()
                toca("touchStart", (gx, gy)); pg.wait_for_timeout(250)
                s = pg.evaluate(JS_COR)
                checar(s["ativo"], "tocar no círculo não ligou o turbo")
                checar(cor_nome(s) == "laranja", f"ativo não está laranja: {s}")
                checar(not s["esq"] and not s["dir"], f"tocar no círculo dirigiu: {s['esq']}/{s['dir']}")
                pg.screenshot(path=str(saida / f"{w}x{h}-{nome.split()[0].lower()}-laranja.png"))
                pg.wait_for_timeout(500)
                s2 = pg.evaluate(JS_COR)
                checar(s2["energia"] < s["energia"] or s2["over"], f"energia não diminuiu: {s['energia']} → {s2['energia']}")
                checar(s2["texto"] == f"{round(s2['energia'])}%" or abs(float(s2["texto"][:-1]) - s2["energia"]) <= 3, f"porcentagem {s2['texto']} × energia {s2['energia']:.1f}")

                # solta: desliga e volta ao azul
                toca("touchEnd"); pg.wait_for_timeout(250)
                s = pg.evaluate(JS_COR)
                checar(not s["ativo"], "soltar não desligou o turbo")
                checar(cor_nome(s) == "azul", f"não voltou ao azul: {s}")

                # um dedo dirige (metade direita) e outro segura o turbo
                limpar()
                pg.evaluate("() => { gameState.turboEnergy = 100; }")
                ydir = c["y"] + c["h"] * 0.35
                toca("touchStart", (w * 0.8, ydir)); pg.wait_for_timeout(100)
                checar(pg.evaluate("() => [input.left, input.right]") == [False, True], "metade direita não dirigiu")
                toca("touchStart", (w * 0.8, ydir), (gx, gy)); pg.wait_for_timeout(250)
                s = pg.evaluate(JS_COR)
                checar(s["ativo"] and s["dir"] and not s["esq"], f"turbo + direção juntos: {s}")
                checar(cor_nome(s) == "laranja", "laranja com turbo + direção")
                toca("touchStart", (w * 0.2, ydir), (gx, gy)); pg.wait_for_timeout(100)     # o dedo que dirige troca de metade
                toca("touchEnd"); pg.wait_for_timeout(200)
                s = pg.evaluate(JS_COR)
                checar(not s["ativo"] and not s["esq"] and not s["dir"], f"após soltar tudo: {s}")

                # metade esquerda continua dirigindo (o robô não dirige: se bateu, começa outra partida)
                limpar()
                toca("touchStart", (w * 0.2, ydir)); pg.wait_for_timeout(100)
                checar(pg.evaluate("() => [input.left, input.right]") == [True, False], "metade esquerda não dirigiu")
                toca("touchEnd"); pg.wait_for_timeout(100)

                # sem energia: toque no círculo não liga e também não dirige
                limpar()
                pg.evaluate("() => { gameState.turboEnergy = 0; gameState.isTurboActive = false; }")
                toca("touchStart", (gx, gy)); pg.wait_for_timeout(150)
                s = pg.evaluate(JS_COR)
                checar(not s["ativo"] and not s["esq"] and not s["dir"], f"sem energia: {s}")
                toca("touchEnd")
            else:
                limpar()
                pg.mouse.move(gx, gy); pg.mouse.down(); pg.wait_for_timeout(250)
                s = pg.evaluate(JS_COR)
                checar(s["ativo"], "clicar no círculo não ligou o turbo")
                checar(cor_nome(s) == "laranja", f"ativo não está laranja: {s}")
                pg.screenshot(path=str(saida / f"{w}x{h}-{nome.split()[0].lower()}-laranja.png"))
                pg.mouse.up(); pg.wait_for_timeout(250)
                s = pg.evaluate(JS_COR)
                checar(not s["ativo"] and cor_nome(s) == "azul", f"soltar o mouse: {s}")

                # teclado: Espaço liga/desliga; P pausa
                pg.evaluate("() => { gameState.turboEnergy = 100; }")
                limpar()
                pg.keyboard.down("Space"); pg.wait_for_timeout(250)
                checar(pg.evaluate("() => gameState.isTurboActive") and cor_nome(pg.evaluate(JS_COR)) == "laranja", "Espaço não ligou o turbo / laranja")
                pg.keyboard.up("Space"); pg.wait_for_timeout(250)
                checar(not pg.evaluate("() => gameState.isTurboActive") and cor_nome(pg.evaluate(JS_COR)) == "azul", "Espaço não desligou / azul")
                if not pg.evaluate("() => gameState.isGameOver"):
                    pg.keyboard.press("p"); pg.wait_for_timeout(150)
                    checar(pg.evaluate("() => gameState.isPaused"), "P não pausou")
                    pg.keyboard.press("p"); pg.wait_for_timeout(150)

            checar(not erros, f"erros de JavaScript: {erros}")
            ctx.close()
        nav.close()

    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  FALHA", f)
    raise SystemExit(1 if falhas else 0)

if __name__ == "__main__":
    main()
