/**
 * GranaGo — sua planilha Google como banco de dados (Google Apps Script)
 *
 * O app envia tudo o que mudou e recebe de volta a versão mesclada (planilha + app). Assim:
 *  - o que você lança no celular ou no PC aparece aqui;
 *  - o que você edita, adiciona ou apaga aqui volta para o app na próxima sincronização.
 * Em conflito vale a alteração mais recente (coluna "Atualizado em", preenchida sozinha quando você edita).
 *
 * Como instalar (uma vez só):
 *  1. Na planilha: Extensões → Apps Script → apague tudo e cole este arquivo → Salvar.
 *  2. Implantar → Nova implantação → ⚙️ App da Web
 *     Executar como: Eu · Quem pode acessar: Qualquer pessoa → Implantar → autorize.
 *  3. Copie a URL do app da Web (termina em /exec) e cole no GranaGo: Ajustes → Planilha Google.
 * Para atualizar o código mantendo a mesma URL: Implantar → Gerenciar implantações → lápis →
 * Versão: Nova versão → Implantar.
 *
 * A URL funciona como chave de acesso: não compartilhe. Para mais segurança, preencha SENHA abaixo
 * e informe a mesma senha no app.
 */
const SENHA = '';
const SYS = '_granago';           // aba oculta: ids conhecidos, exclusões, faturas pagas
const HEADER_COLOR = '#16a34a';
const KEEP_DEAD_DAYS = 400;       // por quanto tempo lembrar de itens excluídos

// [campo, cabeçalho, tipo]. As colunas técnicas (id) ficam no fim e ocultas.
const TABLES = {
  tx: { sheet: 'Lançamentos', tech: 5, cols: [
    ['date', 'Data', 'date'], ['type', 'Tipo', 'text'], ['desc', 'Descrição', 'text'], ['amount', 'Valor', 'money'],
    ['catName', 'Categoria', 'text'], ['method', 'Forma de pagamento', 'text'], ['cardName', 'Cartão', 'text'],
    ['bankName', 'Banco', 'text'], ['inst', 'Parcelas', 'int'], ['note', 'Observação', 'text'], ['u', 'Atualizado em', 'datetime'],
    ['id', 'id', 'text'], ['cat', 'cat_id', 'text'], ['cardId', 'card_id', 'text'], ['bankId', 'bank_id', 'text'], ['ts', 'criado_ms', 'num']] },
  banks: { sheet: 'Bancos', tech: 1, cols: [
    ['name', 'Banco', 'text'], ['k', 'Modelo', 'text'], ['c1', 'Cor 1', 'text'], ['c2', 'Cor 2', 'text'], ['fg', 'Cor do texto', 'text'],
    ['style', 'Estilo', 'text'], ['ab', 'Sigla', 'text'], ['u', 'Atualizado em', 'datetime'], ['id', 'id', 'text']] },
  cards: { sheet: 'Cartões', tech: 2, cols: [
    ['name', 'Cartão', 'text'], ['bankName', 'Banco', 'text'], ['brand', 'Bandeira', 'text'], ['final', 'Final', 'text'],
    ['limit', 'Limite', 'money'], ['closeDay', 'Fecha dia', 'int'], ['dueDay', 'Vence dia', 'int'], ['u', 'Atualizado em', 'datetime'],
    ['id', 'id', 'text'], ['bankId', 'bank_id', 'text']] },
  cats: { sheet: 'Categorias', tech: 1, cols: [
    ['type', 'Tipo', 'text'], ['name', 'Categoria', 'text'], ['icon', 'Emoji', 'text'], ['color', 'Cor', 'text'],
    ['kw', 'Palavras-chave', 'text'], ['u', 'Atualizado em', 'datetime'], ['id', 'id', 'text']] },
};
const ORDER = ['tx', 'banks', 'cards', 'cats'];
const FMT = { text: '@', date: 'dd/MM/yyyy', datetime: 'dd/MM/yyyy HH:mm:ss', money: '"R$" #,##0.00', int: '0', num: '0' };

function doGet() {
  return out_({ ok: true, app: 'GranaGo', planilha: SpreadsheetApp.getActive().getName() });
}

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'json' }); }
  if (SENHA && b.pass !== SENHA) return out_({ ok: false, error: 'senha' });
  if (b.action !== 'sync') return out_({ ok: false, error: 'action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    return out_(sync_(SpreadsheetApp.getActive(), b, Date.now()));
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- sincronização ---------------- */
function sync_(ss, b, now) {
  const tz = ss.getSpreadsheetTimeZone();
  const sys = readSys_(ss);
  const dead = mergeDead_(sys.dead, b.dead || {}, now);
  const res = { ok: true, url: ss.getUrl(), name: ss.getName(), at: now, tables: {} };
  const known = {};
  ORDER.forEach(function (k) {
    const def = TABLES[k];
    const server = readTable_(ss, def, tz, now);
    const merged = merge_(server.rows, b[k] || [], sys.known[k] || [], dead, now);
    sortRows_(k, merged);
    if (server.dirty || !sameRows_(server.rows, merged, def)) writeTable_(ss, def, merged);
    res.tables[k] = merged;
    known[k] = merged.map(function (r) { return r.id; });
  });
  const meta = (b.meta && (+b.meta.u || 0) > (+sys.meta.u || 0)) ? b.meta : sys.meta;
  writeSys_(ss, { known: known, dead: dead, meta: meta });
  res.dead = dead;
  res.meta = meta;
  return res;
}

// Junta planilha + app por id; vence a alteração mais recente (u). Itens que existiam na planilha
// na última sincronização e sumiram dela foram apagados à mão → viram exclusões.
function merge_(server, client, known, dead, now) {
  const inSheet = {};
  server.forEach(function (r) { inSheet[r.id] = true; });
  known.forEach(function (id) { if (!inSheet[id] && !(id in dead)) dead[id] = now; });
  const m = {};
  server.forEach(function (r) { m[r.id] = r; });
  client.forEach(function (r) {
    if (!r || !r.id) return;
    const s = m[r.id];
    if (!s || (+r.u || 0) > (+s.u || 0)) m[r.id] = r;
  });
  return Object.keys(m).map(function (k) { return m[k]; })
    .filter(function (r) { return !(r.id in dead) || (+r.u || 0) > dead[r.id]; });
}

function mergeDead_(a, b, now) {
  const out = {}, min = now - KEEP_DEAD_DAYS * 864e5;
  [a, b].forEach(function (o) {
    Object.keys(o || {}).forEach(function (id) { const t = +o[id] || 0; if (t > min && t > (out[id] || 0)) out[id] = t; });
  });
  return out;
}

function sortRows_(k, rows) {
  if (k === 'tx') rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || (+b.ts || 0) - (+a.ts || 0); });
  else if (k === 'cats') rows.sort(function (a, b) { return String(a.type).localeCompare(String(b.type)); });
}

function sameRows_(a, b, def) {
  if (a.length !== b.length) return false;
  const m = {};
  a.forEach(function (r) { m[r.id] = r; });
  return b.every(function (r) {
    const s = m[r.id];
    return s && def.cols.every(function (c) {
      if (c[2] === 'datetime') return Math.abs((+s[c[0]] || 0) - (+r[c[0]] || 0)) < 1000;
      return norm_(s[c[0]], c[2]) === norm_(r[c[0]], c[2]);
    });
  }) && a.every(function (r, i) { return b[i] && b[i].id === r.id; }); // mesma ordem
}
function norm_(v, type) {
  if (type === 'money' || type === 'int' || type === 'num') return String(Math.round((+v || 0) * 100));
  return String(v == null ? '' : v).trim();
}

/* ---------------- leitura / escrita das abas ---------------- */
function readTable_(ss, def, tz, now) {
  const sh = ss.getSheetByName(def.sheet);
  const res = { rows: [], dirty: false };
  if (!sh || sh.getLastRow() < 2) return res;
  const width = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  const idx = def.cols.map(function (c) { return head.indexOf(c[1]); });
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
  const seen = {};
  vals.forEach(function (row) {
    const o = {};
    let filled = false;
    def.cols.forEach(function (c, i) {
      const v = idx[i] < 0 ? '' : row[idx[i]];
      o[c[0]] = fromCell_(v, c[2], tz);
      if (c[0] !== 'u' && c[0] !== 'id' && v !== '' && v !== null) filled = true;
    });
    if (!filled) return; // linha vazia (ou só com "Atualizado em")
    if (!o.id || seen[o.id]) { o.id = 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 12); o.u = now; res.dirty = true; } // linha nova digitada na planilha
    if (!o.u) { o.u = now; res.dirty = true; }
    if ('date' in o && !o.date) { o.date = Utilities.formatDate(new Date(now), tz, 'yyyy-MM-dd'); res.dirty = true; }
    seen[o.id] = true;
    res.rows.push(o);
  });
  return res;
}

function writeTable_(ss, def, rows) {
  const sh = ss.getSheetByName(def.sheet) || ss.insertSheet(def.sheet);
  const W = def.cols.length;
  sh.getRange(1, 1, 1, W).setValues([def.cols.map(function (c) { return c[1]; })])
    .setFontWeight('bold').setBackground(HEADER_COLOR).setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, W).clearContent();
  if (rows.length) {
    def.cols.forEach(function (c, i) { sh.getRange(2, i + 1, rows.length, 1).setNumberFormat(FMT[c[2]]); });
    sh.getRange(2, 1, rows.length, W).setValues(rows.map(function (r) {
      return def.cols.map(function (c) { return toCell_(r[c[0]], c[2]); });
    }));
  }
  if (def.tech) sh.hideColumns(W - def.tech + 1, def.tech);
}

function fromCell_(v, type, tz) {
  if (v === '' || v === null || v === undefined) return type === 'money' || type === 'int' || type === 'num' ? 0 : '';
  if (type === 'date') {
    if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : '';
  }
  if (type === 'datetime') {
    if (v instanceof Date) return v.getTime();
    return +v > 1e11 ? +v : 0;
  }
  if (type === 'money' || type === 'int' || type === 'num') {
    if (typeof v === 'number') return type === 'int' ? Math.round(v) : v;
    let s = String(v).replace(/[^\d,.-]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s) || 0;
    return type === 'int' ? Math.round(n) : n;
  }
  return String(v).trim();
}

function toCell_(v, type) {
  if (type === 'date') {
    const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : '';
  }
  if (type === 'datetime') return +v ? new Date(+v) : '';
  if (type === 'money' || type === 'int' || type === 'num') return +v || 0;
  const s = v == null ? '' : String(v);
  return /^[=+]/.test(s) ? "'" + s : s;
}

/* ---------------- aba técnica (oculta) ---------------- */
function readSys_(ss) {
  const sh = ss.getSheetByName(SYS);
  const o = { known: {}, dead: {}, meta: { u: 0 } };
  if (!sh) return o;
  const v = sh.getRange(1, 1, 3, 2).getValues();
  v.forEach(function (r) {
    try { if (r[0] && r[1]) o[r[0]] = JSON.parse(r[1]); } catch (e) {}
  });
  return o;
}

function writeSys_(ss, o) {
  let sh = ss.getSheetByName(SYS);
  if (!sh) { sh = ss.insertSheet(SYS); sh.hideSheet(); }
  sh.getRange(1, 1, 3, 2).setNumberFormat('@').setValues([
    ['known', JSON.stringify(o.known)],
    ['dead', JSON.stringify(o.dead)],
    ['meta', JSON.stringify(o.meta)],
  ]);
}

/* ---------------- edições feitas à mão ---------------- */
// Ao editar uma linha, marca "Atualizado em" para que a sua edição vença a versão do app.
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    const def = ORDER.map(function (k) { return TABLES[k]; }).filter(function (d) { return d.sheet === sh.getName(); })[0];
    if (!def) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const uc = head.indexOf('Atualizado em') + 1;
    if (!uc) return;
    if (e.range.getNumColumns() === 1 && e.range.getColumn() === uc) return;
    const r0 = Math.max(2, e.range.getRow()), r1 = e.range.getLastRow();
    if (r1 < r0) return;
    const now = new Date(), rows = [];
    for (let r = r0; r <= r1; r++) rows.push([now]);
    sh.getRange(r0, uc, rows.length, 1).setValues(rows);
  } catch (err) {}
}
