#!/usr/bin/env python3
"""
Verifica os SONS (4.0.0) no Chromium de verdade (Playwright), com os arquivos de áudio reais e a partida rodando:
  - poça de óleo e cone (colisão real na pista e as funções de efeito) NÃO tocam a freada;
  - a sirene da polícia COMEÇA baixinha, sobe conforme a viatura se aproxima (sem saltos) e some com fade ao passar;
  - numa batida de verdade tocam a batida (0,4) e um chiado curto de freada (0,18) que é cortado em ~1 s;
  - nenhum erro de JavaScript.
O Chromium roda com --autoplay-policy=no-user-gesture-required (modo sem cabeça não tem alto-falante: o que se mede
é o que o jogo manda tocar — que arquivo, em que volume e por quanto tempo).

Uso:  pip install playwright && playwright install chromium
      python3 tests/ferramentas/verificar-sons-no-navegador.py
"""
import pathlib
from playwright.sync_api import sync_playwright

import os
URL = os.environ.get("JOGO_URL") or (pathlib.Path(__file__).resolve().parents[2] / "index.html").as_uri()   # JOGO_URL: testar a cópia www/ servida por HTTP (ambiente do app)

TELAS = [("Galaxy A37", 891, 411, True, 2.625), ("Notebook 1366x768", 1366, 768, False, 1)]

JS_ESPIAR = """() => { window.__sons = []; if (!window.__espiado) { window.__espiado = true;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { window.__sons.push({ arq: this.src.split('/').pop(), volume: this.volume, t: performance.now() }); return play.call(this); }; } }"""
JS_LIMPAR = "() => { window.__sons = []; obstacles.length = 0; powerUps.invulneravel = 0; gameState.isGameOver = false; }"
JS_COLOCAR = """(tipo) => { obstacles.length = 0; const o = criarObstaculo(tipo, { faixa: 1, velocidade: 1 }); o.worldX = player.worldX; o.z = PLAYER_Z; o.prevZ = PLAYER_Z + 0.05; }"""

def main():
    falhas, total = [], 0
    with sync_playwright() as p:
        nav = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        for nome, w, h, toque, dpr in TELAS:
            ctx = nav.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=toque, is_mobile=toque)
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(600)
            pg.evaluate(JS_ESPIAR)
            (pg.tap if toque else pg.click)("#playBtn"); pg.wait_for_timeout(900)
            print(f"{nome} {w}x{h}")

            def checar(ok, msg):
                nonlocal total; total += 1
                if not ok: falhas.append(f"[{nome}] {msg}")

            def tocados(): return pg.evaluate("() => window.__sons")

            # ---------- óleo e cone: sem freada ----------
            for tipo in ("oil", "cone"):
                pg.evaluate(JS_LIMPAR); pg.evaluate(JS_COLOCAR, tipo); pg.wait_for_timeout(500)
                t = tocados()
                checar(not any("freada" in x["arq"] for x in t), f"{tipo}: tocou freada: {t}")
                checar(pg.evaluate("() => !gameState.isGameOver"), f"{tipo} encerrou a partida")
            pg.evaluate(JS_LIMPAR)
            pg.evaluate("() => { iniciarDerrapagem(); }"); pg.evaluate("() => { aplicarTropeco({ worldX: 0, z: PLAYER_Z }); }")
            checar(not any("freada" in x["arq"] for x in tocados()), "derrapagem/tropeço tocaram freada")

            # ---------- sirene: baixinha → sobe → some com fade ----------
            # a derrapagem acima empurrou o carro de lado: volta para o centro e recomeça limpo
            pg.evaluate("() => { player.derrapagem = 0; player.worldX = 0; player.steer = 0; }")
            pg.evaluate(JS_LIMPAR); pg.wait_for_timeout(100)
            pg.evaluate("""() => { const o = criarObstaculo('police', { faixa: 2, velocidade: 1 }); o.worldX = 1.0; o.z = Z_FAR - 0.5; o.prevZ = o.z; window.__meu = o; }""")
            # Amostrador DENTRO da página (a cada 50 ms): atrasos do Python não distorcem a medida
            pg.evaluate("""() => { window.__amostras = []; window.__relogio = setInterval(() => {
                const p = obstacles.includes(window.__meu) ? window.__meu : null;
                window.__amostras.push({ t: performance.now(), vol: gerenciadorAudio.sons.policia.volume, toc: gerenciadorAudio.estaTocando('policia'), z: p ? p.z : null, over: gameState.isGameOver });
                // só a viatura do teste fica na pista: o trânsito (e outras viaturas sorteadas) mudaria a distância da mais próxima\n                for (let i = obstacles.length - 1; i >= 0; i--) if (obstacles[i] !== window.__meu) obstacles.splice(i, 1); }, 50); }""")
            for _ in range(160):
                pg.wait_for_timeout(100)
                fim = pg.evaluate("() => { const a = window.__amostras; const u = a[a.length - 1]; return !!u && (u.over || (u.z !== null && u.z <= PLAYER_Z)); }")
                if fim: break
            pg.evaluate("() => clearInterval(window.__relogio)")
            amostras = [x for x in pg.evaluate("() => window.__amostras") if x["toc"]]
            volumes = [x["vol"] for x in amostras]
            sirene = [x for x in tocados() if "policia" in x["arq"]]
            checar(len(sirene) >= 1 and sirene[0]["volume"] <= 0.05, f"sirene não começou baixinha: {sirene[:1]}")
            checar(len(volumes) > 5, f"poucas amostras da sirene: {len(volumes)}")
            if len(volumes) > 5:
                checar(volumes[0] <= 0.08, f"volume inicial {volumes[0]:.3f}")
                subida = max(volumes[: max(1, int(len(volumes) * 0.8))])
                checar(subida > volumes[0] * 3, f"não subiu: {volumes[0]:.3f} → {subida:.3f}")
                # taxa de subida em volume por segundo em janelas de ~300 ms (o trânsito sorteado pode pôr, por um
                # instante, outra viatura mais perto antes de o teste a tirar da pista; uma janela não se deixa enganar)
                taxas = []
                for n, a in enumerate(amostras):
                    b = next((x for x in amostras[n + 1:] if x["t"] - a["t"] >= 300), None)
                    if b: taxas.append((b["vol"] - a["vol"]) / ((b["t"] - a["t"]) / 1000))
                checar(taxas and max(taxas) < 0.6, f"salto brusco de volume: {max(taxas) if taxas else None}/s")
                print(f"   sirene: {volumes[0]:.3f} → máx {max(volumes):.3f} ({len(volumes)} amostras)")
            for _ in range(7):                   # sem viatura nenhuma (nem sorteada pelo jogo) por ~1,4 s
                pg.evaluate(JS_LIMPAR); pg.wait_for_timeout(200)
            checar(not pg.evaluate("() => gerenciadorAudio.estaTocando('policia')"), "a sirene não parou depois de sumir a viatura")

            # ---------- batida de verdade: batida 0,4 + freada curta 0,18 ----------
            pg.evaluate(JS_LIMPAR)
            for _ in range(30):                      # coloca o obstáculo em cima do carro até a batida acontecer
                if pg.evaluate("() => gameState.isGameOver"): break
                pg.evaluate(JS_COLOCAR, "civilian"); pg.wait_for_timeout(100)
            pg.wait_for_timeout(60)
            t = tocados()
            batida = [x for x in t if "batida" in x["arq"]]; freada = [x for x in t if "freada" in x["arq"]]
            checar(len(batida) == 1 and abs(batida[0]["volume"] - 0.4) < 1e-6, f"batida: {batida}")
            checar(len(freada) == 1 and abs(freada[0]["volume"] - 0.18) < 1e-6, f"freada na batida: {freada}")
            checar(pg.evaluate("() => gameState.isGameOver"), "a batida não encerrou a partida")
            checar(pg.evaluate("() => gerenciadorAudio.estaTocando('freada')"), "a freada da batida nem começou")
            pg.wait_for_timeout(1600)
            checar(not pg.evaluate("() => gerenciadorAudio.estaTocando('freada')"), "a freada não foi cortada em ~1 s (o arquivo tem 2,4 s)")
            checar(abs(pg.evaluate("() => gerenciadorAudio.sons.freada.volume") - 0.18) < 1e-6, "volume da freada não foi restaurado")

            checar(not erros, f"erros de JavaScript: {erros}")
            ctx.close()
        nav.close()

    print(f"\n{total} verificações, {len(falhas)} falha(s)")
    for f in falhas: print("  FALHA", f)
    raise SystemExit(1 if falhas else 0)

if __name__ == "__main__":
    main()
