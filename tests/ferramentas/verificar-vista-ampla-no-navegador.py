#!/usr/bin/env python3
"""
Verifica a TELA TODA (3.6.0) no Chromium de verdade (Playwright), em celulares na horizontal
(incluindo o Galaxy A37), notebooks, 16:9, 16:10 e monitores ultrawide, incluindo 1363x602.

Mede e confere, com a partida rodando:
  - o canvas ocupa toda a largura e toda a altura abaixo da barra (sem faixas vazias);
  - a escala em pixels por unidade lógica é a mesma na horizontal e na vertical (nada esticado);
  - o carro mantém a proporção (70/360 da altura do canvas);
  - o turbo (celular) está dentro do canvas, com 44 px ou mais, sem tocar no indicador nem no velocímetro;
  - toque real (CDP) na metade esquerda/direita dirige; o mesmo toque no botão de turbo não dirige;
  - nenhum erro de JavaScript.
Salva capturas em --saida (padrão /tmp/capturas-vista-ampla).

Uso:  pip install playwright && playwright install chromium
      python3 tests/ferramentas/verificar-vista-ampla-no-navegador.py
"""
import argparse, pathlib
from playwright.sync_api import sync_playwright

URL = (pathlib.Path(__file__).resolve().parents[2] / "index.html").as_uri()

# nome, largura, altura, toque, dpr
TELAS = [
    ("Referência 1363x602", 1363, 602, False, 1),
    ("Galaxy A37 horizontal", 891, 411, True, 2.625),
    ("Galaxy A37 com barra do navegador", 891, 360, True, 2.625),
    ("iPhone horizontal", 844, 390, True, 3),
    ("Celular 21:9", 960, 411, True, 2.625),
    ("Notebook 1366x768 (16:9)", 1366, 768, False, 1),
    ("Notebook 1536x864 (16:9)", 1536, 864, False, 1.25),
    ("Notebook 16:10 1440x900", 1440, 900, False, 2),
    ("Full HD 1920x1080", 1920, 1080, False, 1),
    ("Ultrawide 21:9 2560x1080", 2560, 1080, False, 1),
    ("Ultrawide 21:9 3440x1440", 3440, 1440, False, 1),
    ("Super ultrawide 5120x1440", 5120, 1440, False, 1),
]

JS = """() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}; };
  const c = document.getElementById('gameCanvas');
  return { vista: VISTA.largura, canvas: r(c), hud: r(document.getElementById('hud')), turbo: r(document.getElementById('turboBtn')),
           turboVisivel: getComputedStyle(document.getElementById('mobile-controls')).display !== 'none',
           layout: document.getElementById('game-container').dataset.layout, interno: [c.width, c.height],
           carro: player.width, carroAlt: player.height };
}"""

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--saida", default="/tmp/capturas-vista-ampla"); a = ap.parse_args()
    saida = pathlib.Path(a.saida); saida.mkdir(parents=True, exist_ok=True)
    falhas, total = [], 0

    with sync_playwright() as p:
        nav = p.chromium.launch()
        for nome, w, h, toque, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=toque, is_mobile=toque)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(500)
            (pg.tap if toque else pg.click)("#playBtn"); pg.wait_for_timeout(1200)
            m = pg.evaluate(JS); c = m["canvas"]
            pg.screenshot(path=str(saida / (f"{w}x{h}-" + "".join(ch if ch.isalnum() else "-" for ch in nome).lower() + ".png")))

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome}] {msg}")

            base = m["hud"]["y"] + m["hud"]["h"]
            u_h, u_v = c["w"] / m["vista"], c["h"] / 360
            cheio_h = c["h"] >= (h - base) - 1.01
            print(f"{nome:36s} {w}x{h} modo={m['layout']:9s} canvas={c['w']:.0f}x{c['h']:.0f} vista={m['vista']:.0f} laterais={c['x']:.1f}/{w-c['x']-c['w']:.1f}")

            if m["layout"] in ("mesa", "cheio"):
                checar(c["x"] <= 0.6 and w - (c["x"] + c["w"]) <= 0.6, f"faixas laterais: {c['x']:.1f} / {w-c['x']-c['w']:.1f}")
                checar(cheio_h or w / (h - base) < 1.6, f"altura não aproveitada: {c['h']:.0f} de {h-base:.0f}")
            checar(abs(u_h / u_v - 1) < 0.002, f"escala horizontal {u_h:.4f} × vertical {u_v:.4f}")
            checar(abs(m["carro"] * u_v / c["h"] - 70 / 360) < 1e-6, "proporção do carro")
            checar(abs(m["interno"][0] / m["interno"][1] - m["vista"] / 360) < 0.01, f"resolução interna {m['interno']}")

            if toque:
                t = m["turbo"]
                checar(m["turboVisivel"] and t["w"] >= 43.5 and t["h"] >= 43.5, f"turbo {t['w']:.0f}x{t['h']:.0f}")
                if m["layout"] == "cheio":
                    checar(t["x"] >= c["x"] - .5 and t["x"] + t["w"] <= c["x"] + c["w"] + .5 and t["y"] >= c["y"] - .5 and t["y"] + t["h"] <= c["y"] + c["h"] + .5, "turbo cortado/fora do canvas")
                    # não toca no indicador de turbo (centro a 52,52 un. da borda, raio 38) nem no velocímetro
                    ind = {"x": c["x"] + c["w"] - 90 * u_v, "y": c["y"] + c["h"] - 90 * u_v, "w": 76 * u_v, "h": 76 * u_v}
                    cruza = t["x"] < ind["x"] + ind["w"] and ind["x"] < t["x"] + t["w"] and t["y"] < ind["y"] + ind["h"] and ind["y"] < t["y"] + t["h"]
                    checar(not cruza, "turbo encosta no indicador de turbo")

                # O robô não dirige: se bateu, começa outra partida (toque só dirige com a partida rodando)
                if pg.evaluate("() => gameState.isGameOver"):
                    pg.evaluate("() => { document.getElementById('restartBtn').click(); }"); pg.wait_for_timeout(300)
                # toques reais via CDP: metade esquerda e direita dirigem; botão de turbo não
                cdp = ctx.new_cdp_session(pg)
                def toque_em(x, y, tipo):
                    cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": [{"x": x, "y": y}] if tipo != "touchEnd" else []})
                y = c["y"] + c["h"] * 0.4
                for x, esperado in ((w * 0.2, (True, False)), (w * 0.8, (False, True))):
                    toque_em(x, y, "touchStart"); pg.wait_for_timeout(60)
                    got = tuple(pg.evaluate("() => [input.left, input.right]"))
                    checar(got == esperado, f"toque em x={x:.0f}: {got}, esperado {esperado}")
                    toque_em(x, y, "touchEnd"); pg.wait_for_timeout(60)
                    checar(tuple(pg.evaluate("() => [input.left, input.right]")) == (False, False), "soltar não parou a direção")
                t = m["turbo"]
                toque_em(t["x"] + t["w"] / 2, t["y"] + t["h"] / 2, "touchStart"); pg.wait_for_timeout(60)
                checar(tuple(pg.evaluate("() => [input.left, input.right]")) == (False, False), "toque no botão de turbo dirigiu")
                toque_em(0, 0, "touchEnd")

            checar(not erros, f"erros de JavaScript: {erros}")
            ctx.close()
        nav.close()

    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  FALHA", f)
    raise SystemExit(1 if falhas else 0)

if __name__ == "__main__":
    main()
