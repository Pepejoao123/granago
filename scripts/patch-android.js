// Ajusta o projeto Android gerado pelo Capacitor:
//  - câmera (foto da nota fiscal direto do app)
//  - microfone (lançamento por áudio / reconhecimento de voz)
//  - consulta ao serviço de reconhecimento de voz do Google (Android 11+)
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
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
fs.writeFileSync(manifestPath, m);
console.log('Android ajustado: câmera, microfone e reconhecimento de voz.');
