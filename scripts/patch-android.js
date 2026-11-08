// Ajusta o projeto Android gerado pelo Capacitor:
//  - câmera (foto da nota fiscal direto do app)
//  - microfone (lançamento por áudio / reconhecimento de voz)
//  - consulta ao serviço de reconhecimento de voz do Google (Android 11+)
//  - alarmes exatos + ícone monocromático (cofrinho) para os lembretes de lançar os gastos
//  - widgets da tela inicial (saldo do mês, gastos de hoje e cartão) em 3 temas, de 2x2 para cima
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'android', 'app', 'src', 'main');
const manifestPath = path.join(root, 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  console.error('android/ não encontrado — rode "npx cap add android" antes.');
  process.exit(1);
}
let m = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  'android.permission.INTERNET',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.USE_EXACT_ALARM',
];
for (const p of perms) {
  if (!m.includes(`"${p}"`)) m = m.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
}
for (const f of ['android.hardware.camera', 'android.hardware.microphone']) {
  if (!m.includes(`"${f}"`)) m = m.replace('</manifest>', `    <uses-feature android:name="${f}" android:required="false" />\n</manifest>`);
}
if (!m.includes('android.speech.RecognitionService')) {
  m = m.replace('</manifest>', `    <queries>
        <intent><action android:name="android.speech.RecognitionService" /></intent>
    </queries>
</manifest>`);
}

const res = path.join(root, 'res');
const write = (rel, txt) => { const p = path.join(res, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); };
const A = 'xmlns:android="http://schemas.android.com/apk/res/android"';

// Ícone das notificações: cofrinho (mesmo desenho de tools/pig.svg), branco e com a fenda/olho vazados
write('drawable/ic_stat_grana.xml', `<?xml version="1.0" encoding="utf-8"?>
<vector ${A}
    android:width="24dp" android:height="24dp"
    android:viewportWidth="1024" android:viewportHeight="1024">
    <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd"
        android:pathData="M235,540a285,215 0,1 0,570 0a285,215 0,1 0,-570 0z M485,355h120a15,15 0,0 1,0 30h-120a15,15 0,0 1,0 -30z M656,470a24,24 0,1 0,48 0a24,24 0,1 0,-48 0z"/>
    <path android:fillColor="#FFFFFFFF"
        android:pathData="M498,250a62,62 0,1 0,124 0a62,62 0,1 0,-124 0z M395,395L430,265L520,352Z M783,470h19a38,38 0,0 1,38 38v44a38,38 0,0 1,-38 38h-19a38,38 0,0 1,-38 -38v-44a38,38 0,0 1,38 -38z M365,640h18a30,30 0,0 1,30 30v75a30,30 0,0 1,-30 30h-18a30,30 0,0 1,-30 -30v-75a30,30 0,0 1,30 -30z M620,640h18a30,30 0,0 1,30 30v75a30,30 0,0 1,-30 30h-18a30,30 0,0 1,-30 -30v-75a30,30 0,0 1,30 -30z"/>
</vector>
`);

// ---------- widgets da tela inicial ----------
// Cada widget tem 2 layouts — compacto (2x2) e largo (3x2 ou maior) — em 3 temas:
// dark (escuro), glass (Liquid Glass escuro) e glasslight (Liquid Glass claro).
// O Java escolhe o layout pelo tamanho do widget e pelo tema salvo pelo app.
// As cores precisam bater com a prévia do app (.wg-prev em www/style.css) e com GranaWidgets.color().
const THEMES = {
  dark: {
    ink: '#FFFFFF', soft: '#E6FFFFFF', muted: '#99FFFFFF', label: '#5CF25C', in: '#5CF25C', out: '#FF6B6E', acc: '#5CF25C', track: '#26FFFFFF',
    bg: `<shape android:shape="rectangle"><solid android:color="#F20C0D10"/><corners android:radius="24dp"/><stroke android:width="1dp" android:color="#22FFFFFF"/></shape>`,
    btn: `<shape android:shape="rectangle"><solid android:color="#1FFFFFFF"/><corners android:radius="14dp"/></shape>`,
  },
  // Vidro escuro: fundo translúcido (mostra o papel de parede), brilho no topo e borda clara
  glass: {
    ink: '#FFFFFF', soft: '#F2FFFFFF', muted: '#B3FFFFFF', label: '#7CFF7C', in: '#7CFF7C', out: '#FF8A8E', acc: '#7CFF7C', track: '#33FFFFFF',
    bg: `<layer-list>
        <item><shape android:shape="rectangle"><solid android:color="#7314161C"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#38FFFFFF" android:centerColor="#0AFFFFFF" android:endColor="#14FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#66FFFFFF"/></shape></item>
        <item android:left="1dp" android:top="1dp" android:right="1dp" android:bottom="1dp"><shape android:shape="rectangle"><corners android:radius="25dp"/><stroke android:width="1dp" android:color="#1AFFFFFF"/></shape></item>
    </layer-list>`,
    btn: `<layer-list>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#40FFFFFF" android:endColor="#1AFFFFFF"/><corners android:radius="16dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#4DFFFFFF"/></shape></item>
    </layer-list>`,
  },
  // Vidro claro: leitoso, texto escuro
  glasslight: {
    ink: '#0F1115', soft: '#D90F1115', muted: '#990F1115', label: '#15803D', in: '#15803D', out: '#DC2626', acc: '#15803D', track: '#1F0F1115',
    bg: `<layer-list>
        <item><shape android:shape="rectangle"><solid android:color="#A6FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#80FFFFFF" android:centerColor="#1AFFFFFF" android:endColor="#33FFFFFF"/><corners android:radius="26dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="26dp"/><stroke android:width="1dp" android:color="#E6FFFFFF"/></shape></item>
    </layer-list>`,
    btn: `<layer-list>
        <item><shape android:shape="rectangle"><gradient android:angle="270" android:startColor="#CCFFFFFF" android:endColor="#80FFFFFF"/><corners android:radius="16dp"/></shape></item>
        <item><shape android:shape="rectangle"><corners android:radius="16dp"/><stroke android:width="1dp" android:color="#FFFFFFFF"/></shape></item>
    </layer-list>`,
  },
};
for (const [tn, T] of Object.entries(THEMES)) {
  write(`drawable/widget_bg_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n${T.bg.replace(/^<(shape|layer-list)/, `<$1 ${A}`)}\n`);
  write(`drawable/widget_btn_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n${T.btn.replace(/^<(shape|layer-list)/, `<$1 ${A}`)}\n`);
  for (const pc of ['acc', 'out']) {
    write(`drawable/widget_prog_${pc}_${tn}.xml`, `<?xml version="1.0" encoding="utf-8"?>
<layer-list ${A}>
    <item android:id="@android:id/background"><shape><corners android:radius="6dp"/><solid android:color="${T.track}"/></shape></item>
    <item android:id="@android:id/progress"><clip><shape><corners android:radius="6dp"/><solid android:color="${T[pc]}"/></shape></clip></item>
</layer-list>
`);
  }
}
// quadradinho arredondado do logo do banco (o Java pinta com a cor do banco)
write('drawable/widget_logo.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape ${A} android:shape="rectangle"><solid android:color="#FFFFFFFF"/><corners android:radius="9dp"/></shape>
`);

// ---- peças de layout ----
const tv = (id, text, color, size, extra = '') => `<TextView${id ? ` android:id="@+id/${id}"` : ''} android:layout_width="wrap_content" android:layout_height="wrap_content"
    android:text="${text}" android:textColor="${color}" android:textSize="${size}sp" android:maxLines="1" android:ellipsize="end"${extra}/>`;
const tvw = (id, text, color, size, gravity, extra = '') => `<TextView android:id="@+id/${id}" android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content"
    android:text="${text}" android:textColor="${color}" android:textSize="${size}sp" android:maxLines="1" android:ellipsize="end" android:gravity="${gravity}"${extra}/>`;
const B = ' android:textStyle="bold"';
const label = (T, id, text) => tv(id, text, T.label, 10, `${B} android:letterSpacing="0.08"`);
const spacer = '<FrameLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:minHeight="4dp"/>';
const bar = (tn, id, color, h, extra = '') => `<ProgressBar android:id="@+id/${id}" style="@android:style/Widget.ProgressBar.Horizontal" android:layout_width="match_parent"
    android:layout_height="${h}dp" android:max="100" android:progress="0" android:progressDrawable="@drawable/widget_prog_${color}_${tn}"${extra}/>`;
const btn = (tn, id, text, color, h, extra = '', w = 1) => `<Button android:id="@+id/${id}" android:layout_width="0dp" android:layout_weight="${w}" android:layout_height="${h}dp"
    android:background="@drawable/widget_btn_${tn}" android:text="${text}" android:textColor="${color}" android:textSize="${h < 36 ? 12 : 13}sp"
    android:textStyle="bold" android:textAllCaps="false" android:minHeight="0dp" android:minWidth="0dp" android:padding="0dp"${extra}/>`;
const square = (tn, id, text, color, s) => `<Button android:id="@+id/${id}" android:layout_width="${s}dp" android:layout_height="${s}dp"
    android:background="@drawable/widget_btn_${tn}" android:text="${text}" android:textColor="${color}" android:textSize="18sp"
    android:textStyle="bold" android:textAllCaps="false" android:minHeight="0dp" android:minWidth="0dp" android:padding="0dp" android:layout_marginStart="6dp"/>`;
const row = (inner, extra = '') => `<LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal"
    ${extra.includes('android:gravity=') ? '' : 'android:gravity="center_vertical"'}${extra}>
${inner}
</LinearLayout>`;
const col = (inner, extra = '') => `<LinearLayout android:layout_width="0dp" android:layout_weight="1" android:layout_height="wrap_content" android:orientation="vertical"${extra}>
${inner}
</LinearLayout>`;
const frame = (tn, id, pad, inner) => `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout ${A} android:id="@+id/${id}" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="${pad}dp" android:background="@drawable/widget_bg_${tn}">
${inner}
</LinearLayout>
`;
const logo = s => `<FrameLayout android:layout_width="${s}dp" android:layout_height="${s}dp">
<ImageView android:id="@+id/cd_logo_bg" android:layout_width="match_parent" android:layout_height="match_parent" android:src="@drawable/widget_logo" android:scaleType="fitXY"/>
<TextView android:id="@+id/cd_logo" android:layout_width="match_parent" android:layout_height="match_parent" android:gravity="center" android:text="$"
    android:textColor="#FFFFFF" android:textSize="${s < 30 ? 10 : 11}sp" android:textStyle="bold" android:maxLines="1"/>
</FrameLayout>`;
const ML = ' android:layout_marginStart="6dp"';
const MS = ' android:layout_marginStart="10dp"';
const MT = n => ` android:layout_marginTop="${n}dp"`;
const icon = (e, size) => tv(null, e, '#FFFFFF', size);

const LAYOUTS = {
  // ---------- Saldo do mês ----------
  month_s: (tn, T) => frame(tn, 'mo_root', 12, [
    row(icon('🐷', 16) + '\n' + col(label(T, 'mo_label', 'SALDO'), ML)),
    tv('mo_bal', 'R$ 0,00', T.ink, 19, B + MT(4)),
    row(tvw('mo_in', '↑ R$ 0', T.in, 11, 'start', B) + '\n' + tvw('mo_out', '↓ R$ 0', T.out, 11, 'end', B), MT(2)),
    bar(tn, 'mo_bar', 'out', 5, MT(6)),
    spacer,
    row(btn(tn, 'mo_add', '＋', T.acc, 32) + '\n' + btn(tn, 'mo_audio', '🎙️', T.acc, 32, ML)),
  ].join('\n')),
  month_w: (tn, T) => frame(tn, 'mo_root', 14, [
    row(icon('🐷', 22) + '\n' + col(label(T, 'mo_label', 'SALDO DO MÊS') + '\n' + tv('mo_bal', 'R$ 0,00', T.ink, 20, B), MS)),
    row(col(tv(null, 'Receitas', T.muted, 11) + '\n' + tv('mo_in', 'R$ 0,00', T.in, 14, B)) + '\n' +
        col(tv(null, 'Despesas', T.muted, 11) + '\n' + tv('mo_out', 'R$ 0,00', T.out, 14, B), MS), MT(8)),
    bar(tn, 'mo_bar', 'out', 6, MT(8)),
    spacer,
    row([btn(tn, 'mo_add', '＋ Despesa', T.acc, 36, '', 1.3), btn(tn, 'mo_audio', '🎙️ Falar', T.acc, 36, ML), btn(tn, 'mo_photo', '📷 Nota', T.acc, 36, ML)].join('\n'), MT(10)),
  ].join('\n')),
  // ---------- Gastos de hoje ----------
  today_s: (tn, T) => frame(tn, 'td_root', 12, [
    row(icon('📅', 16) + '\n' + col(label(T, null, 'HOJE'), ML) + '\n' + tv('td_count', '0', T.muted, 11, B)),
    tv('td_value', 'R$ 0,00', T.ink, 19, B + MT(4)),
    spacer,
    row([btn(tn, 'td_add', '＋', T.acc, 32), btn(tn, 'td_audio', '🎙️', T.acc, 32, ML), btn(tn, 'td_photo', '📷', T.acc, 32, ML)].join('\n')),
  ].join('\n')),
  today_w: (tn, T) => frame(tn, 'td_root', 14, [
    row(icon('📅', 22) + '\n' + col(label(T, null, 'GASTOS DE HOJE') + '\n' + tv('td_value', 'R$ 0,00', T.ink, 20, B), MS) + '\n' + tv('td_count', 'nenhum', T.muted, 12, B)),
    tv('td_last1', '', T.soft, 12, MT(6)),
    tv('td_last2', '', T.soft, 12, MT(1)),
    spacer,
    row([btn(tn, 'td_add', '＋ Gasto', T.acc, 36, '', 1.5), btn(tn, 'td_msg', '💬', T.acc, 36, ML), btn(tn, 'td_audio', '🎙️', T.acc, 36, ML), btn(tn, 'td_photo', '📷', T.acc, 36, ML)].join('\n'), MT(8)),
  ].join('\n')),
  // ---------- Cartão (fatura atual e limite) ----------
  card_s: (tn, T) => frame(tn, 'cd_root', 12, [
    row(logo(24) + '\n' + col(label(T, 'cd_name', 'CARTÃO'), ML) + '\n' + square(tn, 'cd_next', '›', T.ink, 28)),
    tv('cd_inv', 'R$ 0,00', T.ink, 19, B + MT(4)),
    tv('cd_due', '', T.muted, 11),
    spacer,
    bar(tn, 'cd_bar', 'acc', 5),
    tv('cd_avail', '', T.soft, 11, MT(4)),
  ].join('\n')),
  card_w: (tn, T) => frame(tn, 'cd_root', 14, [
    row(logo(32) + '\n' + col(label(T, 'cd_name', 'CARTÃO') + '\n' + tv('cd_inv', 'R$ 0,00', T.ink, 20, B), MS) + '\n' + square(tn, 'cd_next', '›', T.ink, 36)),
    tv('cd_due', '', T.muted, 12, MT(4)),
    spacer,
    bar(tn, 'cd_bar', 'acc', 6),
    row(tvw('cd_avail', 'Disponível', T.soft, 12, 'start') + '\n' + tvw('cd_limit', '', T.muted, 12, 'end'), MT(6)),
  ].join('\n')),
};
for (const [tn, T] of Object.entries(THEMES)) {
  for (const [name, fn] of Object.entries(LAYOUTS)) write(`layout/widget_${name}_${tn}.xml`, fn(tn, T));
}

// Tamanho padrão 4x2; pode ser redimensionado a partir de 2x2 (sem limite máximo)
const info = (kind, desc) => `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider ${A}
    android:minWidth="250dp" android:minHeight="110dp"
    android:minResizeWidth="110dp" android:minResizeHeight="110dp"
    android:targetCellWidth="4" android:targetCellHeight="2"
    android:resizeMode="horizontal|vertical" android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_${kind}_w_dark" android:previewLayout="@layout/widget_${kind}_w_dark"
    android:previewImage="@mipmap/ic_launcher" android:description="@string/${desc}"
    android:widgetCategory="home_screen"/>
`;
write('xml/widget_month_info.xml', info('month', 'widget_month_desc'));
write('xml/widget_today_info.xml', info('today', 'widget_today_desc'));
write('xml/widget_card_info.xml', info('card', 'widget_card_desc'));
write('values/granago_widgets.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_month_desc">Saldo do mês, receitas e despesas, com atalhos para lançar</string>
    <string name="widget_today_desc">Gastos de hoje e botões para lançar por mensagem, áudio ou foto</string>
    <string name="widget_card_desc">Fatura atual e limite disponível dos seus cartões</string>
</resources>
`);
const receiver = (name, label, xml) => `        <receiver android:name=".${name}" android:exported="false" android:label="${label}">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/${xml}" />
        </receiver>
`;
for (const [name, label, xml] of [
  ['MonthWidget', 'GranaGo · Saldo do mês', 'widget_month_info'],
  ['TodayWidget', 'GranaGo · Gastos de hoje', 'widget_today_info'],
  ['CardWidget', 'GranaGo · Cartão', 'widget_card_info'],
]) {
  if (!m.includes(`".${name}"`)) m = m.replace('</application>', `${receiver(name, label, xml)}    </application>`);
}
fs.writeFileSync(manifestPath, m);

// plugin nativo dos widgets + MainActivity que o registra
const appId = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'capacitor.config.json'), 'utf8')).appId;
const javaDir = path.join(root, 'java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of fs.readdirSync(path.join(__dirname, '..', 'native')).filter(f => f.endsWith('.java'))) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'native', f), 'utf8').replace(/__PACKAGE__/g, appId);
  fs.writeFileSync(path.join(javaDir, f), src);
}
console.log('Android ajustado: câmera, microfone, voz, alarmes exatos, ícone de notificação e widgets (saldo, hoje e cartão).');
