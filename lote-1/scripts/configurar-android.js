#!/usr/bin/env node
/* scripts/configurar-android.js — tela cheia (modo imersivo) no app Android.

   Rode DEPOIS de `cap add android` (o npm run android:adicionar já faz isso). Reescreve o
   MainActivity.java gerado pelo Capacitor — que é só `class MainActivity extends BridgeActivity {}` —
   acrescentando, e nada mais:
     - barras de status e de navegação escondidas (volta ao deslizar da borda e some de novo);
     - área do entalhe (câmera) usada pelo jogo, que já respeita env(safe-area-inset-*) no CSS.
   Orientação, ícone, tela de abertura e botão voltar NÃO são mexidos (decisões pendentes).

   É idempotente (rodar de novo não muda nada) e recusa-se a mexer num MainActivity que não reconhece.
   Uso:  node scripts/configurar-android.js [--projeto android]
*/

const fs = require("node:fs");
const path = require("node:path");

const MARCA = "// Gerado por scripts/configurar-android.js";

function gerarMainActivity(pacote) {
  return `package ${pacote};

${MARCA} (tela cheia). Pode apagar este bloco para voltar ao modelo do Capacitor.

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Usa também a área do entalhe da câmera (o CSS do jogo trata a área segura)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams atributos = getWindow().getAttributes();
            atributos.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(atributos);
        }

        ocultarBarrasDoSistema();
    }

    @Override
    public void onWindowFocusChanged(boolean temFoco) {
        super.onWindowFocusChanged(temFoco);

        // As barras voltam sozinhas ao deslizar da borda ou ao voltar de outro app: esconde de novo
        if (temFoco) ocultarBarrasDoSistema();
    }

    private void ocultarBarrasDoSistema() {
        WindowInsetsControllerCompat controle = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        controle.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controle.hide(WindowInsetsCompat.Type.systemBars());
    }
}
`;
}

function acharMainActivity(pastaJava) {
  if (!fs.existsSync(pastaJava)) return null;

  for (const entrada of fs.readdirSync(pastaJava, { withFileTypes: true })) {
    const completo = path.join(pastaJava, entrada.name);

    if (entrada.isDirectory()) {
      const achado = acharMainActivity(completo);
      if (achado) return achado;
    } else if (entrada.name === "MainActivity.java") {
      return completo;
    }
  }

  return null;
}

// Devolve { estado: "configurado" | "ja-configurado", arquivo } ou lança Error com a explicação
function configurarAndroid({ projeto = path.resolve(__dirname, "..", "android") } = {}) {
  const arquivo = acharMainActivity(path.join(projeto, "app", "src", "main", "java"));

  if (!arquivo) throw new Error(`MainActivity.java não encontrado em ${projeto}. Rode primeiro: npm run android:adicionar`);

  const atual = fs.readFileSync(arquivo, "utf8");

  if (atual.includes(MARCA)) return { estado: "ja-configurado", arquivo };

  const pacote = /^\s*package\s+([\w.]+)\s*;/m.exec(atual);

  if (!pacote || !/extends\s+BridgeActivity/.test(atual)) {
    throw new Error(`${arquivo} não parece o MainActivity padrão do Capacitor; nada foi alterado. Veja o LEIA-ME (Android).`);
  }

  fs.writeFileSync(arquivo, gerarMainActivity(pacote[1]));

  return { estado: "configurado", arquivo };
}

module.exports = { gerarMainActivity, configurarAndroid, acharMainActivity, MARCA };

if (require.main === module) {
  try {
    const i = process.argv.indexOf("--projeto");
    const r = configurarAndroid(i >= 0 ? { projeto: path.resolve(process.argv[i + 1]) } : {});

    console.log(r.estado === "configurado" ? `Tela cheia configurada em ${r.arquivo}` : `Já estava configurado: ${r.arquivo}`);
  } catch (erro) {
    console.error(erro.message);
    process.exit(1);
  }
}
