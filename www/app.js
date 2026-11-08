/* GranaGo — controle financeiro pessoal
 * Dados salvos no aparelho (localStorage). IA: Google Gemini (opcional) + interpretador local.
 */
'use strict';
const VERSION = '1.0.0';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlShort = v => Math.abs(v) >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : brl(v);
const round2 = v => Math.round((+v || 0) * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mKey = iso => iso.slice(0, 7);
const addM = (key, n) => { let [y, m] = key.split('-').map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(m)}`; };
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mLabel = (key, short) => { const [y, m] = key.split('-').map(Number); const n = MONTHS[m - 1]; return short ? n.slice(0, 3) + (y !== new Date().getFullYear() ? '/' + String(y).slice(2) : '') : `${n} ${y}`; };
const parseMoney = s => { if (typeof s === 'number') return s; s = String(s || '').replace(/[^\d,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return round2(parseFloat(s) || 0); };
const fmtInput = v => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const dayLabel = iso => { const t = todayISO(); if (iso === t) return 'Hoje'; const y = new Date(); y.setDate(y.getDate() - 1); if (iso === `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`) return 'Ontem'; const [Y, M, D] = iso.split('-').map(Number); return new Date(Y, M - 1, D).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }); };
const toast = (msg, ms = 2200) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms); };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ===================== Identidade visual dos bancos ===================== */
const BANKS = [
  { k: 'nubank', n: 'Nubank', c1: '#820AD1', c2: '#4A0481', fg: '#fff', ab: 'Nu' },
  { k: 'itau', n: 'Itaú', c1: '#EC7000', c2: '#B34F00', fg: '#fff', ab: 'Itaú' },
  { k: 'bradesco', n: 'Bradesco', c1: '#CC092F', c2: '#7A0019', fg: '#fff', ab: 'B' },
  { k: 'santander', n: 'Santander', c1: '#EC0000', c2: '#9A0000', fg: '#fff', ab: 'S' },
  { k: 'bb', n: 'Banco do Brasil', c1: '#0038A8', c2: '#002366', fg: '#FCFC30', ab: 'BB' },
  { k: 'caixa', n: 'Caixa', c1: '#005CA9', c2: '#F39200', fg: '#fff', ab: 'CX' },
  { k: 'inter', n: 'Inter', c1: '#FF7A00', c2: '#E35200', fg: '#fff', ab: 'in' },
  { k: 'c6', n: 'C6 Bank', c1: '#2B2B2B', c2: '#0A0A0A', fg: '#fff', ab: 'C6' },
  { k: 'picpay', n: 'PicPay', c1: '#21C25E', c2: '#0E8A3E', fg: '#fff', ab: 'Pic' },
  { k: 'mp', n: 'Mercado Pago', c1: '#00B1EA', c2: '#0077B6', fg: '#fff', ab: 'MP' },
  { k: 'xp', n: 'XP', c1: '#1C1C1C', c2: '#000000', fg: '#F2C94C', ab: 'XP' },
  { k: 'btg', n: 'BTG Pactual', c1: '#0B2A4A', c2: '#051526', fg: '#fff', ab: 'BTG' },
  { k: 'next', n: 'Next', c1: '#00E676', c2: '#00A152', fg: '#000', ab: 'nx' },
  { k: 'neon', n: 'Neon', c1: '#00D1FF', c2: '#0072FF', fg: '#fff', ab: 'N' },
  { k: 'sicredi', n: 'Sicredi', c1: '#3FA110', c2: '#256B05', fg: '#fff', ab: 'Si' },
  { k: 'sicoob', n: 'Sicoob', c1: '#003641', c2: '#00AE9D', fg: '#fff', ab: 'Sc' },
  { k: 'pagbank', n: 'PagBank', c1: '#1BB99A', c2: '#0E7C67', fg: '#fff', ab: 'Pg' },
  { k: 'will', n: 'Will Bank', c1: '#FFD400', c2: '#F2A900', fg: '#000', ab: 'W' },
  { k: 'original', n: 'Original', c1: '#00A857', c2: '#00663A', fg: '#fff', ab: 'O' },
  { k: 'outro', n: 'Outro', c1: '#3A3F4B', c2: '#14161B', fg: '#fff', ab: '$' },
];
const STYLES = [['grad', 'Degradê'], ['solid', 'Sólido'], ['metal', 'Metálico'], ['dots', 'Pontilhado'], ['wave', 'Onda']];
const bankBg = b => b.style === 'solid' ? b.c1 : b.style === 'metal' ? `linear-gradient(135deg,${b.c1} 0%,${b.c2} 45%,${b.c1} 70%,${b.c2} 100%)` : `linear-gradient(135deg,${b.c1},${b.c2})`;

/* ===================== Categorias padrão ===================== */
const DEF_CATS = [
  ['despesa', 'Alimentação', '🍔', '#F97316', 'restaurante lanche ifood almoço almoco jantar pizza hamburguer padaria cafe café rappi delivery marmita'],
  ['despesa', 'Mercado', '🛒', '#22C55E', 'mercado supermercado atacadão atacadao assai carrefour feira hortifruti açougue acougue'],
  ['despesa', 'Transporte', '🚗', '#3B82F6', 'uber 99 taxi táxi onibus ônibus metro metrô trem passagem estacionamento pedagio pedágio'],
  ['despesa', 'Combustível', '⛽', '#EAB308', 'gasolina etanol alcool álcool combustivel combustível posto diesel abastecer'],
  ['despesa', 'Moradia', '🏠', '#A855F7', 'aluguel condominio condomínio iptu reforma moveis móveis casa'],
  ['despesa', 'Contas', '💡', '#06B6D4', 'luz energia agua água internet telefone celular gas gás conta'],
  ['despesa', 'Saúde', '💊', '#EF4444', 'farmacia farmácia remedio remédio medico médico consulta exame dentista academia plano'],
  ['despesa', 'Educação', '📚', '#6366F1', 'curso faculdade escola livro material mensalidade udemy alura'],
  ['despesa', 'Lazer', '🎮', '#EC4899', 'cinema show bar balada jogo game passeio parque festa cerveja'],
  ['despesa', 'Compras', '🛍️', '#F43F5E', 'roupa tenis tênis shopping loja amazon shopee mercado livre magalu presente eletronico'],
  ['despesa', 'Assinaturas', '📺', '#8B5CF6', 'netflix spotify prime disney hbo max youtube assinatura icloud google one'],
  ['despesa', 'Viagem', '✈️', '#0EA5E9', 'hotel airbnb voo passagem aerea viagem'],
  ['despesa', 'Pets', '🐾', '#D97706', 'pet ração racao veterinario veterinário petshop'],
  ['despesa', 'Beleza', '💇', '#DB2777', 'cabelo barbearia salao salão manicure cosmetico perfume'],
  ['despesa', 'Outros', '📦', '#64748B', ''],
  ['receita', 'Salário', '💼', '#22C55E', 'salario salário pagamento holerite adiantamento vale'],
  ['receita', 'Freelance', '💻', '#14B8A6', 'freela freelance projeto servico serviço bico'],
  ['receita', 'Investimentos', '📈', '#84CC16', 'rendimento dividendos juros cdb tesouro acoes ações'],
  ['receita', 'Vendas', '🏷️', '#F59E0B', 'venda vendi'],
  ['receita', 'Reembolso', '↩️', '#0EA5E9', 'reembolso estorno devolucao devolução'],
  ['receita', 'Outras receitas', '💰', '#10B981', 'presente pix recebido'],
].map(([type, name, icon, color, kw]) => ({ id: uid(), type, name, icon, color, kw }));

const METHODS = { pix: '⚡ Pix', credito: '💳 Crédito', debito: '🏦 Débito', dinheiro: '💵 Dinheiro', boleto: '🧾 Boleto', outro: '• Outro' };

/* ===================== Estado ===================== */
const KEY = 'granago:v1';
let S = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tx) return migrate(s); } catch (e) { }
  return migrate({});
}
function migrate(s) {
  s.tx ||= []; s.banks ||= []; s.cards ||= []; s.paid ||= {};
  s.cats ||= DEF_CATS;
  s.settings ||= {}; s.settings.mode ||= 'compra'; s.settings.key ??= '';
  return s;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Não consegui salvar no aparelho'); } }
let curM = mKey(todayISO());
const cat = id => S.cats.find(c => c.id === id) || { name: 'Sem categoria', icon: '❔', color: '#64748B' };
const card = id => S.cards.find(c => c.id === id);
let pvBank = null; // banco em edição (prévia do diálogo)
const bank = id => id === '__pv' ? pvBank : S.banks.find(b => b.id === id);

/* ===================== Faturas / parcelas ===================== */
// Mês da fatura (mês do VENCIMENTO) de uma compra feita em `iso` no cartão `c`
function invoiceKey(c, iso) {
  const [y, m, d] = iso.split('-').map(Number);
  let close = `${y}-${pad(m)}`;
  if (d >= (+c.closeDay || 1)) close = addM(close, 1); // comprou no dia do fechamento ou depois → próxima fatura
  return (+c.dueDay || 10) > (+c.closeDay || 1) ? close : addM(close, 1);
}
function dueDate(c, key) { const [y, m] = key.split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${key}-${pad(Math.min(+c.dueDay || 10, last))}`; }
function closeDate(c, key) { const k = (+c.dueDay || 10) > (+c.closeDay || 1) ? key : addM(key, -1); const [y, m] = k.split('-').map(Number); const last = new Date(y, m, 0).getDate(); return `${k}-${pad(Math.min(+c.closeDay || 1, last))}`; }
// Expande cada lançamento em "entradas" mensais (parcelas)
function entries() {
  const out = [];
  for (const t of S.tx) {
    const n = Math.max(1, +t.inst || 1);
    const c = t.method === 'credito' && card(t.cardId);
    const base = round2(t.amount / n);
    for (let i = 0; i < n; i++) {
      const amt = i === n - 1 ? round2(t.amount - base * (n - 1)) : base;
      const inv = c ? addM(invoiceKey(c, t.date), i) : null;
      const month = c && S.settings.mode === 'fatura' ? inv : addM(mKey(t.date), i);
      out.push({ t, i, n, amt, month, inv });
    }
  }
  return out;
}
const isPaid = (cid, key) => (S.paid[cid] || []).includes(key);
function cardStats(c, E = entries()) {
  const mine = E.filter(e => e.t.cardId === c.id && e.t.method === 'credito' && e.t.type === 'despesa');
  const used = mine.filter(e => !isPaid(c.id, e.inv)).reduce((s, e) => s + e.amt, 0);
  const cur = invoiceKey(c, todayISO());
  const curTotal = mine.filter(e => e.inv === cur).reduce((s, e) => s + e.amt, 0);
  return { used: round2(used), avail: round2((+c.limit || 0) - used), cur, curTotal: round2(curTotal), mine };
}

/* ===================== Navegação ===================== */
let view = 'home';
function go(v) {
  view = v;
  $$('.view').forEach(s => s.hidden = s.id !== 'v-' + v);
  $$('.tabs [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === v));
  window.scrollTo(0, 0); render();
}
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const c = e.target.closest('[data-close]'); if (c) c.closest('dialog').close();
});
$$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
$('#monthNav').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; curM = addM(curM, +b.dataset.m); render(); });

/* ===================== Render ===================== */
function render() {
  $('#monthLbl').textContent = mLabel(curM);
  const E = entries();
  const ME = E.filter(e => e.month === curM);
  if (view === 'home') renderHome(E, ME);
  if (view === 'tx') renderTx(ME);
  if (view === 'cards') renderBanks(E);
  if (view === 'charts') renderCharts(E, ME);
}
const sumType = (L, type) => round2(L.filter(e => e.t.type === type).reduce((s, e) => s + e.amt, 0));

function txRow(e) {
  const t = e.t, c = cat(t.cat), cd = card(t.cardId), bk = bank(t.bankId) || (cd && bank(cd.bankId));
  const where = t.method === 'credito' && cd ? `${bk ? bk.name + ' · ' : ''}${cd.name}` : (bk ? bk.name : '');
  const sub = [c.name, METHODS[t.method]?.replace(/^\S+\s/, ''), where, e.n > 1 ? `${e.i + 1}/${e.n}` : ''].filter(Boolean).join(' · ');
  return `<div class="it" data-tx="${t.id}">
    <div class="ico" style="background:${c.color}22;color:${c.color}">${c.icon}</div>
    <div class="tx"><b>${esc(t.desc || c.name)}</b><small>${esc(sub)}</small></div>
    <div class="val ${t.type === 'receita' ? 'in' : 'out'}">${t.type === 'receita' ? '+' : '-'}${brl(e.amt)}${e.n > 1 ? `<small>total ${brl(t.amount)}</small>` : ''}</div>
  </div>`;
}
function bindTxRows(root) { $$('[data-tx]', root).forEach(r => r.onclick = () => openTx(S.tx.find(t => t.id === r.dataset.tx))); }

function renderHome(E, ME) {
  const inc = sumType(ME, 'receita'), out = sumType(ME, 'despesa');
  $('#hBal').textContent = brl(inc - out); $('#hBal').style.color = inc - out < 0 ? 'var(--out)' : '';
  $('#hIn').textContent = brl(inc); $('#hOut').textContent = brl(out);
  // categorias
  const by = groupCats(ME, 'despesa');
  $('#hCats').innerHTML = by.length ? by.slice(0, 5).map(g => hbar(`${g.c.icon} ${esc(g.c.name)}`, g.v, by[0].v, g.c.color)).join('') : '<div class="empty">Nenhum gasto neste mês ainda.</div>';
  // cartões
  $('#hCards').innerHTML = S.cards.map(c => ccHTML(c, cardStats(c, E))).join('') + `<button class="addcc" id="hAddCard">＋<br>Adicionar cartão</button>`;
  $$('#hCards [data-card]').forEach(el => el.onclick = () => openInv(el.dataset.card));
  $('#hAddCard').onclick = () => S.banks.length ? openCard() : (toast('Cadastre o banco primeiro'), openBank());
  // últimos
  const last = [...ME].sort((a, b) => b.t.date.localeCompare(a.t.date) || (b.t.ts || 0) - (a.t.ts || 0)).slice(0, 6);
  $('#hLast').innerHTML = last.length ? last.map(txRow).join('') : '<div class="empty">Toque em ＋ ou use o campo acima para lançar.</div>';
  bindTxRows($('#hLast'));
}
function hbar(label, v, max, color, right) {
  return `<div class="hbar"><div class="l"><span>${label}</span><b>${right ?? brl(v)}</b></div><div class="tr"><i style="width:${max ? Math.max(2, v / max * 100) : 0}%;background:${color}"></i></div></div>`;
}
function groupCats(L, type) {
  const m = new Map();
  for (const e of L) if (e.t.type === type) m.set(e.t.cat, (m.get(e.t.cat) || 0) + e.amt);
  return [...m].map(([id, v]) => ({ c: cat(id), v: round2(v) })).sort((a, b) => b.v - a.v);
}

function ccHTML(c, st, mini) {
  const b = bank(c.bankId) || BANKS.at(-1);
  const pct = c.limit ? Math.min(100, st.used / c.limit * 100) : 0;
  return `<div class="cc ${mini ? 'mini' : ''} style-${b.style || 'grad'}" data-card="${c.id}" style="background:${bankBg(b)};color:${b.fg || '#fff'}">
    <div class="t"><div><div class="bank">${esc(b.name)}</div><div class="nm">${esc(c.name || 'Cartão')}</div></div><div class="chipx"></div></div>
    <div class="b">
      <div class="num">•••• ${esc(c.final || '')}</div>
      <div class="row"><div>Fatura ${mLabel(st.cur, true)}<br><b>${brl(st.curTotal)}</b></div><div class="brandtag">${esc(c.brand || '')}</div></div>
      <div class="lbar" style="background:${b.fg === '#000' ? 'rgba(0,0,0,.2)' : ''}"><i style="width:${pct}%;background:${b.fg || '#fff'}"></i></div>
      <div class="row" style="margin-top:4px"><span>Disponível ${brl(st.avail)}</span><span>de ${brlShort(+c.limit || 0)}</span></div>
    </div></div>`;
}

let txF = 'all';
$('#txFilter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; txF = b.dataset.f; $$('#txFilter .chip').forEach(x => x.classList.toggle('on', x === b)); render(); });
$('#txSearch').addEventListener('input', () => render());
function renderTx(ME) {
  const q = norm($('#txSearch').value);
  let L = ME.filter(e => txF === 'all' || e.t.type === txF || e.t.method === txF);
  if (q) L = L.filter(e => norm(`${e.t.desc} ${cat(e.t.cat).name} ${e.t.note || ''} ${card(e.t.cardId)?.name || ''} ${bank(e.t.bankId)?.name || ''}`).includes(q));
  L.sort((a, b) => b.t.date.localeCompare(a.t.date) || (b.t.ts || 0) - (a.t.ts || 0));
  $('#txSum').innerHTML = `<span>${L.length} lançamento(s)</span><span>Entradas <b style="color:var(--in)">${brl(sumType(L, 'receita'))}</b></span><span>Saídas <b>${brl(sumType(L, 'despesa'))}</b></span>`;
  if (!L.length) { $('#txList').innerHTML = '<div class="card empty">Nada por aqui neste mês.</div>'; return; }
  const days = new Map();
  for (const e of L) { const d = e.t.date; if (!days.has(d)) days.set(d, []); days.get(d).push(e); }
  $('#txList').innerHTML = [...days].map(([d, es]) => {
    const tot = es.reduce((s, e) => s + (e.t.type === 'receita' ? e.amt : -e.amt), 0);
    return `<div class="day"><span>${dayLabel(d)}</span><span>${brl(tot)}</span></div><div class="card list">${es.map(txRow).join('')}</div>`;
  }).join('');
  bindTxRows($('#txList'));
}

function renderBanks(E) {
  if (!S.banks.length) {
    $('#bankList').innerHTML = `<div class="card empty">Cadastre seus bancos (Nubank, Itaú, Inter…) e depois os cartões de crédito de cada um, com limite, fechamento e vencimento.<br><br><button class="btn" id="bFirst">+ Adicionar banco</button></div>`;
    $('#bFirst').onclick = () => openBank(); return;
  }
  const ME = E.filter(e => e.month === curM && e.t.type === 'despesa');
  $('#bankList').innerHTML = S.banks.map(b => {
    const cs = S.cards.filter(c => c.bankId === b.id);
    const spent = ME.filter(e => e.t.bankId === b.id || cs.some(c => c.id === e.t.cardId && e.t.method === 'credito')).reduce((s, e) => s + e.amt, 0);
    return `<div class="bank-block">
      <div class="bank-h"><div class="logo" style="background:${bankBg(b)};color:${b.fg}">${esc(b.ab || b.name.slice(0, 2))}</div>
        <div class="tx"><b>${esc(b.name)}</b><br><small>${cs.length} cartão(ões) · gastos em ${mLabel(curM, true)}: ${brl(spent)}</small></div>
        <button class="ic" data-ebank="${b.id}" aria-label="Editar banco">✏️</button></div>
      <div class="bank-b">${cs.map(c => { const st = cardStats(c, E); return ccHTML(c, st, true) + `<div class="cinfo"><div>Fecha<b>dia ${c.closeDay}</b></div><div>Vence<b>dia ${c.dueDay}</b></div><div>Usado<b>${brl(st.used)}</b></div></div>`; }).join('')}
        <button class="btn ghost full" data-acard="${b.id}">+ Cartão ${esc(b.name)}</button></div>
    </div>`;
  }).join('');
  $$('#bankList [data-card]').forEach(el => el.onclick = () => openInv(el.dataset.card));
  $$('#bankList [data-ebank]').forEach(el => el.onclick = () => openBank(bank(el.dataset.ebank)));
  $$('#bankList [data-acard]').forEach(el => el.onclick = () => openCard(null, el.dataset.acard));
}
$('#btnAddBank').onclick = () => openBank();

/* ===================== Gráficos (SVG próprio, funciona offline) ===================== */
let chT = 'despesa';
$('#chType').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; chT = b.dataset.t; $$('#chType button').forEach(x => x.classList.toggle('on', x === b)); render(); });
function donutSVG(parts, total, label) {
  const R = 70, C = 2 * Math.PI * R; let off = 0;
  const segs = parts.map(p => { const len = total ? p.v / total * C : 0; const s = `<circle r="${R}" cx="85" cy="85" fill="none" stroke="${p.color}" stroke-width="26" stroke-dasharray="${Math.max(0, len - 1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`; off += len; return s; }).join('');
  return `<svg class="donut" viewBox="0 0 170 170"><circle r="${R}" cx="85" cy="85" fill="none" stroke="#16181d" stroke-width="26"/>${segs}
    <text x="85" y="80" text-anchor="middle" fill="#8a8f99" font-size="11">${label}</text>
    <text x="85" y="100" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">${brlShort(total)}</text></svg>`;
}
function renderCharts(E, ME) {
  const g = groupCats(ME, chT), tot = g.reduce((s, x) => s + x.v, 0);
  $('#chDonut').innerHTML = g.length ? `<div class="donut-wrap">${donutSVG(g.map(x => ({ v: x.v, color: x.c.color })), tot, chT === 'despesa' ? 'gastos' : 'receitas')}
    <div class="legend">${g.map(x => `<div class="lg"><i class="dot" style="background:${x.c.color}"></i><span>${x.c.icon} ${esc(x.c.name)}</span><b>${brl(x.v)}</b><em>${Math.round(x.v / tot * 100)}%</em></div>`).join('')}</div></div>`
    : '<div class="empty">Sem dados neste mês.</div>';
  // barras 6 meses
  const ms = Array.from({ length: 6 }, (_, i) => addM(curM, i - 5));
  const data = ms.map(m => { const L = E.filter(e => e.month === m); return { m, inc: sumType(L, 'receita'), out: sumType(L, 'despesa') }; });
  const max = Math.max(1, ...data.flatMap(d => [d.inc, d.out]));
  const W = 340, H = 170, bw = 18, gap = W / 6;
  const bars = data.map((d, i) => {
    const x = i * gap + gap / 2, hi = d.inc / max * 120, ho = d.out / max * 120;
    return `<rect x="${x - bw - 2}" y="${140 - hi}" width="${bw}" height="${hi}" rx="4" fill="#22c55e"/>
      <rect x="${x + 2}" y="${140 - ho}" width="${bw}" height="${ho}" rx="4" fill="#ff5a5f"/>
      <text x="${x}" y="157" text-anchor="middle" ${d.m === curM ? 'style="fill:#fff;font-weight:700"' : ''}>${mLabel(d.m, true)}</text>`;
  }).join('');
  $('#chBars').innerHTML = `<div class="bars"><svg viewBox="0 0 ${W} ${H}"><line x1="0" x2="${W}" y1="140.5" y2="140.5" stroke="#23262d"/>${bars}</svg></div>
    <div class="blg"><span><i style="background:#22c55e"></i>Receitas</span><span><i style="background:#ff5a5f"></i>Despesas</span></div>`;
  // métodos
  const D = ME.filter(e => e.t.type === 'despesa');
  const mm = Object.keys(METHODS).map(k => ({ k, v: round2(D.filter(e => e.t.method === k).reduce((s, e) => s + e.amt, 0)) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const colors = { pix: '#22d3ee', credito: '#a855f7', debito: '#3b82f6', dinheiro: '#22c55e', boleto: '#f59e0b', outro: '#64748b' };
  $('#chMethods').innerHTML = mm.length ? mm.map(x => hbar(METHODS[x.k], x.v, mm[0].v, colors[x.k])).join('') : '<div class="empty">Sem gastos neste mês.</div>';
  // por cartão / banco
  const pc = new Map();
  for (const e of D) {
    const cd = e.t.method === 'credito' && card(e.t.cardId);
    const b = cd ? bank(cd.bankId) : bank(e.t.bankId);
    const key = cd ? `💳 ${(b?.name || '') + ' ' + cd.name}` : b ? `🏦 ${b.name}` : '• Sem banco';
    const col = (b && b.c1) || '#64748b';
    const o = pc.get(key) || { v: 0, col }; o.v += e.amt; pc.set(key, o);
  }
  const pl = [...pc].sort((a, b) => b[1].v - a[1].v);
  $('#chCards').innerHTML = pl.length ? pl.map(([k, o]) => hbar(esc(k), o.v, pl[0][1].v, o.col)).join('') : '<div class="empty">Sem gastos neste mês.</div>';
}

/* ===================== Formulário de lançamento ===================== */
let tx = null, txQueue = null;
function fillSelects() {
  $('#fCard').innerHTML = S.cards.length ? S.cards.map(c => `<option value="${c.id}">${esc((bank(c.bankId)?.name || '') + ' · ' + c.name)}</option>`).join('') : '<option value="">Nenhum cartão cadastrado</option>';
  $('#fBank').innerHTML = '<option value="">— não informar —</option>' + S.banks.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  $('#fInst').innerHTML = Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}">${i ? i + 1 + 'x' : 'À vista'}</option>`).join('');
}
function openTx(t, opts = {}) {
  fillSelects();
  tx = t ? { ...t } : { id: null, type: opts.type || 'despesa', amount: 0, desc: '', cat: null, method: 'pix', cardId: S.cards[0]?.id || '', bankId: '', inst: 1, date: todayISO(), note: '' };
  if (opts.prefill) Object.assign(tx, opts.prefill);
  $('#txDel').hidden = !t || !t.id;
  $('#fAmount').value = fmtInput(tx.amount); $('#fDesc').value = tx.desc || ''; $('#fNote').value = tx.note || '';
  $('#fDate').value = tx.date; $('#fInst').value = tx.inst || 1;
  if (tx.cardId) $('#fCard').value = tx.cardId; $('#fBank').value = tx.bankId || '';
  $('#fImg').hidden = !opts.img; if (opts.img) $('#fImg').src = opts.img;
  setType(tx.type); setMethod(tx.method);
  $('#dlgTx').showModal();
  if (!t && !opts.prefill) setTimeout(() => $('#fAmount').focus(), 120);
}
function setType(type) {
  tx.type = type; $$('#txType button').forEach(b => b.classList.toggle('on', b.dataset.t === type));
  const cs = S.cats.filter(c => c.type === type);
  if (!cs.some(c => c.id === tx.cat)) tx.cat = null;
  $('#fCats').innerHTML = cs.map(c => `<button type="button" data-c="${c.id}" class="${c.id === tx.cat ? 'on' : ''}"><i>${c.icon}</i>${esc(c.name)}</button>`).join('');
  if (type === 'receita' && tx.method === 'credito') setMethod('pix');
  $('#fMethod [data-v=credito]').hidden = type === 'receita';
}
function setMethod(m) {
  tx.method = m; $$('#fMethod .chip').forEach(b => b.classList.toggle('on', b.dataset.v === m));
  const cr = m === 'credito';
  $('#fCardWrap').hidden = !cr; $('#fInstWrap').hidden = !cr;
  $('#fBankWrap').hidden = cr || m === 'dinheiro' || !S.banks.length;
}
$('#txType').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setType(b.dataset.t); });
$('#fCats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; tx.cat = b.dataset.c; $$('#fCats button').forEach(x => x.classList.toggle('on', x === b)); });
$('#fMethod').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) setMethod(b.dataset.v); });
$('#fDesc').addEventListener('change', () => { if (!tx.cat) { const g = guessCat($('#fDesc').value, tx.type); if (g) { tx.cat = g.id; setType(tx.type); } } });
$('#txForm').addEventListener('submit', e => {
  e.preventDefault();
  const amount = parseMoney($('#fAmount').value);
  if (!amount) { toast('Informe o valor'); $('#fAmount').focus(); return; }
  if (tx.method === 'credito' && !S.cards.length) { toast('Cadastre um cartão em Cartões'); return; }
  const t = {
    ...tx, amount, desc: $('#fDesc').value.trim(), note: $('#fNote').value.trim(), date: $('#fDate').value || todayISO(),
    cardId: tx.method === 'credito' ? $('#fCard').value : '', bankId: tx.method === 'credito' ? '' : $('#fBank').value,
    inst: tx.method === 'credito' ? +$('#fInst').value || 1 : 1,
  };
  if (!t.cat) t.cat = (guessCat(t.desc, t.type) || S.cats.find(c => c.type === t.type && /outr/i.test(c.name)) || S.cats.find(c => c.type === t.type)).id;
  if (txQueue) { const q = txQueue; txQueue = null; $('#dlgTx').close(); q.done(t); return; }
  upsertTx(t); $('#dlgTx').close();
  toast(t.type === 'receita' ? 'Receita salva ✓' : 'Despesa salva ✓');
});
$('#dlgTx').addEventListener('close', () => { if (txQueue) { const q = txQueue; txQueue = null; q.cancel?.(); } });
function upsertTx(t) {
  if (!t.id) { t.id = uid(); t.ts = Date.now(); S.tx.push(t); } else { const i = S.tx.findIndex(x => x.id === t.id); if (i >= 0) S.tx[i] = t; else S.tx.push(t); }
  save(); curM = S.settings.mode === 'fatura' && t.method === 'credito' && card(t.cardId) ? invoiceKey(card(t.cardId), t.date) : mKey(t.date); render();
}
$('#txDel').onclick = () => { if (!confirm('Excluir este lançamento?')) return; S.tx = S.tx.filter(t => t.id !== tx.id); save(); $('#dlgTx').close(); render(); toast('Excluído'); };

/* ===================== Banco ===================== */
let bk = null;
function openBank(b) {
  bk = b ? { ...b } : { id: null, k: 'nubank', ...pickPreset('nubank'), style: 'grad' };
  $('#bankTitle').textContent = b ? 'Editar banco' : 'Novo banco'; $('#bankDel').hidden = !b;
  $('#bPresets').innerHTML = BANKS.map(p => `<button type="button" data-k="${p.k}" style="background:linear-gradient(135deg,${p.c1},${p.c2});color:${p.fg}" class="${p.k === bk.k ? 'on' : ''}">${esc(p.n)}</button>`).join('');
  $('#bStyles').innerHTML = STYLES.map(([k, n]) => `<button type="button" data-s="${k}" class="${k === bk.style ? 'on' : ''}">${n}</button>`).join('');
  $('#bName').value = bk.name; $('#bC1').value = bk.c1; $('#bC2').value = bk.c2;
  bankPreview(); $('#dlgBank').showModal();
}
function pickPreset(k) { const p = BANKS.find(x => x.k === k) || BANKS.at(-1); return { k: p.k, name: p.k === 'outro' ? '' : p.n, c1: p.c1, c2: p.c2, fg: p.fg, ab: p.ab }; }
function bankPreview() { pvBank = { ...bk, name: $('#bName').value || bk.name || 'Banco' }; $('#bPreview').innerHTML = ccHTML({ id: 'x', bankId: '__pv', name: 'Meu cartão', brand: 'Mastercard', limit: 5000, final: '1234' }, { used: 1250, avail: 3750, cur: mKey(todayISO()), curTotal: 1250 }, true).replace('data-card="x"', ''); }
$('#bPresets').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; Object.assign(bk, pickPreset(b.dataset.k)); $('#bName').value = bk.name; $('#bC1').value = bk.c1; $('#bC2').value = bk.c2; $$('#bPresets button').forEach(x => x.classList.toggle('on', x === b)); bankPreview(); });
$('#bStyles').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; bk.style = b.dataset.s; $$('#bStyles button').forEach(x => x.classList.toggle('on', x === b)); bankPreview(); });
['#bC1', '#bC2'].forEach((s, i) => $(s).addEventListener('input', e => { bk[i ? 'c2' : 'c1'] = e.target.value; bankPreview(); }));
$('#bName').addEventListener('input', bankPreview);
$('#bankForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#bName').value.trim(); if (!name) { toast('Dê um nome ao banco'); return; }
  const b = { ...bk, name, ab: bk.k === 'outro' ? name.slice(0, 2) : bk.ab };
  if (!b.id) { b.id = uid(); S.banks.push(b); } else S.banks[S.banks.findIndex(x => x.id === b.id)] = b;
  save(); $('#dlgBank').close(); render();
  if (!bk.id && !S.cards.some(c => c.bankId === b.id) && confirm(`Cadastrar um cartão de crédito do ${name} agora?`)) openCard(null, b.id);
});
$('#bankDel').onclick = () => {
  const n = S.cards.filter(c => c.bankId === bk.id).length;
  if (!confirm(`Excluir o banco${n ? ` e seus ${n} cartão(ões)` : ''}? Os lançamentos ficam salvos.`)) return;
  S.cards = S.cards.filter(c => c.bankId !== bk.id); S.banks = S.banks.filter(b => b.id !== bk.id); save(); $('#dlgBank').close(); render();
};

/* ===================== Cartão ===================== */
let cd = null;
function openCard(c, bankId) {
  if (!S.banks.length) { openBank(); return; }
  cd = c ? { ...c } : { id: null, bankId: bankId || S.banks[0].id, name: '', brand: 'Mastercard', final: '', limit: 0, closeDay: 3, dueDay: 10 };
  $('#cardTitle').textContent = c ? 'Editar cartão' : 'Novo cartão'; $('#cardDel').hidden = !c;
  $('#cBank').innerHTML = S.banks.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  $('#cBank').value = cd.bankId; $('#cName').value = cd.name; $('#cBrand').value = cd.brand; $('#cFinal').value = cd.final || '';
  $('#cLimit').value = fmtInput(cd.limit); $('#cClose').value = cd.closeDay; $('#cDue').value = cd.dueDay;
  cardPreview(); $('#dlgCard').showModal();
}
function readCard() { return { ...cd, bankId: $('#cBank').value, name: $('#cName').value.trim(), brand: $('#cBrand').value, final: $('#cFinal').value.replace(/\D/g, '').slice(0, 4), limit: parseMoney($('#cLimit').value), closeDay: Math.min(31, Math.max(1, +$('#cClose').value || 1)), dueDay: Math.min(31, Math.max(1, +$('#cDue').value || 10)) }; }
function cardPreview() { const c = readCard(); const st = c.id ? cardStats({ ...c }) : { used: 0, avail: c.limit, cur: invoiceKey(c, todayISO()), curTotal: 0 }; $('#cPreview').innerHTML = ccHTML({ ...c, id: 'pv' }, st, true); }
$('#cardForm').addEventListener('input', cardPreview);
$('#cardForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = readCard(); if (!c.name) c.name = bank(c.bankId)?.name || 'Cartão';
  if (!c.limit) { toast('Informe o limite'); $('#cLimit').focus(); return; }
  if (!c.id) { c.id = uid(); S.cards.push(c); } else S.cards[S.cards.findIndex(x => x.id === c.id)] = c;
  save(); $('#dlgCard').close(); $('#dlgInv').open && $('#dlgInv').close(); render(); toast('Cartão salvo ✓');
});
$('#cardDel').onclick = () => { if (!confirm('Excluir este cartão? Os lançamentos ficam salvos, sem cartão.')) return; S.cards = S.cards.filter(c => c.id !== cd.id); save(); $('#dlgCard').close(); $('#dlgInv').open && $('#dlgInv').close(); render(); };

/* ===================== Faturas ===================== */
let invC = null, invK = null;
function openInv(id) { invC = card(id); if (!invC) return; invK = invoiceKey(invC, todayISO()); renderInv(); $('#dlgInv').showModal(); }
function renderInv() {
  const st = cardStats(invC), es = st.mine.filter(e => e.inv === invK);
  const total = round2(es.reduce((s, e) => s + e.amt, 0)), paid = isPaid(invC.id, invK);
  const due = dueDate(invC, invK), clo = closeDate(invC, invK), t = todayISO();
  const status = paid ? '<span class="tag ok">Paga</span>' : t > due ? '<span class="tag late">Vencida</span>' : t >= clo ? '<span class="tag open">Fechada</span>' : '<span class="tag">Aberta</span>';
  $('#invCard').innerHTML = ccHTML(invC, st, true).replace(/data-card="[^"]*"/, '');
  $('#invHead').innerHTML = `<small>Fatura de ${mLabel(invK)}</small><b>${brl(total)}</b><small>fecha ${clo.split('-').reverse().slice(0, 2).join('/')} · vence ${due.split('-').reverse().slice(0, 2).join('/')}</small> ${status}`;
  $('#invList').innerHTML = es.length ? es.sort((a, b) => b.t.date.localeCompare(a.t.date)).map(txRow).join('') : '<div class="empty">Nenhuma compra nesta fatura.</div>';
  bindTxRows($('#invList'));
  $('#invPay').textContent = paid ? 'Desmarcar pagamento' : 'Marcar como paga'; $('#invPay').disabled = !total && !paid;
}
$('#invPrev').onclick = () => { invK = addM(invK, -1); renderInv(); };
$('#invNext').onclick = () => { invK = addM(invK, 1); renderInv(); };
$('#invEdit').onclick = () => openCard(invC);
$('#invPay').onclick = () => {
  const L = S.paid[invC.id] ||= [];
  if (L.includes(invK)) S.paid[invC.id] = L.filter(k => k !== invK); else L.push(invK);
  save(); renderInv(); render(); toast(isPaid(invC.id, invK) ? 'Fatura paga — limite liberado ✓' : 'Pagamento desmarcado');
};

/* ===================== Ajustes / categorias / backup ===================== */
const GEMINI_KEY = (window.GRANAGO_CONFIG || {}).geminiKey || '';
const aiKey = () => S.settings.key || GEMINI_KEY;
$('#btnSettings').onclick = () => {
  $$('#sMode button').forEach(b => b.classList.toggle('on', b.dataset.v === S.settings.mode));
  $('#sKey').value = S.settings.key || '';
  $('#sKeyInfo').innerHTML = GEMINI_KEY ? '✓ Este build já inclui a chave da IA (secret GEMINI_API_KEY).' : aiKey() ? '✓ IA ativa com a sua chave.' : 'Sem chave: mensagem e voz usam o interpretador local; a leitura de foto precisa da IA. Crie uma chave grátis em aistudio.google.com.';
  renderCatList(); $('#sVer').textContent = `GranaGo v${VERSION} · ${S.tx.length} lançamentos`; $('#dlgSet').showModal();
};
$('#sMode').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.settings.mode = b.dataset.v; $$('#sMode button').forEach(x => x.classList.toggle('on', x === b)); save(); render(); });
$('#sKey').addEventListener('change', e => { S.settings.key = e.target.value.trim(); save(); toast(S.settings.key ? 'Chave salva' : 'Chave removida'); });
function renderCatList() {
  $('#sCats').innerHTML = ['despesa', 'receita'].map(tp => `<div class="day"><span>${tp === 'despesa' ? 'Despesas' : 'Receitas'}</span></div>` +
    S.cats.filter(c => c.type === tp).map(c => `<div class="it" data-cat="${c.id}"><div class="ico" style="background:${c.color}22">${c.icon}</div><div class="tx"><b>${esc(c.name)}</b><small>${esc(c.kw || '—')}</small></div><span>›</span></div>`).join('')).join('');
  $$('#sCats [data-cat]').forEach(el => el.onclick = () => openCat(S.cats.find(c => c.id === el.dataset.cat)));
}
let ct = null;
function openCat(c) {
  ct = c ? { ...c } : { id: null, type: 'despesa', name: '', icon: '🏷️', color: '#22c55e', kw: '' };
  $('#catTitle').textContent = c ? 'Editar categoria' : 'Nova categoria'; $('#catDel').hidden = !c;
  $$('#catType button').forEach(b => b.classList.toggle('on', b.dataset.t === ct.type));
  $('#catIcon').value = ct.icon; $('#catColor').value = ct.color; $('#catName').value = ct.name; $('#catKw').value = ct.kw;
  $('#dlgCat').showModal();
}
$('#sAddCat').onclick = () => openCat();
$('#catType').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; ct.type = b.dataset.t; $$('#catType button').forEach(x => x.classList.toggle('on', x === b)); });
$('#catForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = { ...ct, name: $('#catName').value.trim(), icon: $('#catIcon').value.trim() || '🏷️', color: $('#catColor').value, kw: $('#catKw').value.trim() };
  if (!c.name) { toast('Dê um nome'); return; }
  if (!c.id) { c.id = uid(); S.cats.push(c); } else S.cats[S.cats.findIndex(x => x.id === c.id)] = c;
  save(); $('#dlgCat').close(); renderCatList(); render();
});
$('#catDel').onclick = () => {
  const n = S.tx.filter(t => t.cat === ct.id).length;
  if (!confirm(n ? `${n} lançamento(s) usam esta categoria e irão para "Outros". Excluir?` : 'Excluir categoria?')) return;
  const other = S.cats.find(c => c.type === ct.type && c.id !== ct.id && /outr/i.test(c.name)) || S.cats.find(c => c.type === ct.type && c.id !== ct.id);
  S.tx.forEach(t => { if (t.cat === ct.id) t.cat = other?.id; });
  S.cats = S.cats.filter(c => c.id !== ct.id); save(); $('#dlgCat').close(); renderCatList(); render();
};
$('#sExport').onclick = async () => {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const name = `granago-backup-${todayISO()}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup GranaGo' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
$('#sImport').onclick = () => $('#fileImport').click();
$('#fileImport').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (!d.tx) throw 0; if (!confirm(`Substituir os dados atuais por este backup (${d.tx.length} lançamentos)?`)) return; S = migrate(d); save(); render(); toast('Backup restaurado ✓'); $('#dlgSet').close(); }
  catch (_) { toast('Arquivo de backup inválido'); }
};
$('#sReset').onclick = () => { if (!confirm('Apagar TODOS os lançamentos, bancos e cartões?')) return; if (!confirm('Tem certeza? Não dá para desfazer.')) return; localStorage.removeItem(KEY); S = load(); save(); $('#dlgSet').close(); render(); };

/* ===================== Interpretador local (sem internet / sem chave) ===================== */
const NUMW = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, mil: 1000 };
function guessCat(text, type) {
  const n = ' ' + norm(text).replace(/[^\w ]/g, ' ') + ' ';
  let best = null, score = 0;
  for (const c of S.cats.filter(c => c.type === type)) {
    for (const w of norm(c.kw + ' ' + c.name).split(/[\s,;]+/).filter(w => w.length > 1)) {
      if (n.includes(' ' + w + ' ') || (w.length > 4 && n.includes(w))) { const s = w.length; if (s > score) { score = s; best = c; } }
    }
  }
  return best;
}
function findCard(n) {
  // por nome do cartão, banco ou final
  let hit = S.cards.find(c => c.final && n.includes(c.final));
  hit ||= S.cards.find(c => c.name && n.includes(norm(c.name)) && norm(c.name).length > 2);
  hit ||= S.cards.find(c => { const b = bank(c.bankId); return b && n.includes(norm(b.name)); });
  return hit;
}
function localParse(text) {
  // separa vários gastos ("uber 20 no pix e mercado 150 no débito"); trechos sem número ficam com o vizinho
  const hasNum = x => /\d/.test(x) || norm(x).split(/\s+/).some(w => NUMW[w]);
  const parts = [];
  for (const piece of text.split(/\n|;|,(?!\d)|\s+e\s+|\s+mais\s+/i).map(x => x.trim()).filter(Boolean)) {
    const last = parts[parts.length - 1];
    if (last !== undefined && (!hasNum(piece) || !hasNum(last) || /^\d+\s*(centavos?)?$/i.test(piece))) parts[parts.length - 1] = last + ' e ' + piece; else parts.push(piece);
  }
  const out = [];
  for (const p of parts) {
    const n = norm(p);
    let m, val = 0;
    // ignora números de parcelas/datas ("3x", "12/10")
    const nums = [...n.matchAll(/(?<![\d/])(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d/]|\s*x\b|\s*vezes|\s*parcela)\s*(mil|k)?/g)];
    const finals = S.cards.map(c => c.final).filter(Boolean);
    for (let k = nums.length - 1; k >= 0; k--) if (finals.includes(nums[k][1]) || /final\s*$/.test(n.slice(0, nums[k].index))) nums.splice(k, 1);
    if (nums.length) { m = nums.find(x => /r\$|reais|conto|pila/.test(n.slice(Math.max(0, x.index - 4), x.index + x[0].length + 8))) || nums[0]; val = parseMoney(m[1]) * (m[2] ? 1000 : 1); }
    else { const w = n.split(/\s+/).map(x => NUMW[x]).filter(Boolean); if (w.length) val = w.reduce((s, x) => x === 1000 ? (s || 1) * 1000 : s + x, 0); }
    if (/centavos/.test(n) && val && !/reais/.test(n)) val = val / 100;
    if (!val) continue;
    const type = /\b(recebi|ganhei|entrou|caiu|salario|receita|vendi|reembolso|rendeu|rendimento)\b/.test(n) ? 'receita' : 'despesa';
    let method = /\bpix\b/.test(n) ? 'pix' : /debito/.test(n) ? 'debito' : /credito|cartao|parcel|\d+\s*x\b|vezes/.test(n) ? 'credito' : /dinheiro|especie|cash/.test(n) ? 'dinheiro' : /boleto/.test(n) ? 'boleto' : '';
    const cardHit = findCard(n);
    if (!method && cardHit) method = 'credito';
    if (type === 'receita' && method === 'credito') method = 'pix';
    method ||= 'pix';
    const bankHit = S.banks.find(b => n.includes(norm(b.name)));
    const inst = +(n.match(/(\d{1,2})\s*(?:x\b|vezes|parcelas)/) || [])[1] || 1;
    let date = todayISO();
    const dt = new Date();
    if (/\banteontem\b/.test(n)) { dt.setDate(dt.getDate() - 2); date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
    else if (/\bontem\b/.test(n)) { dt.setDate(dt.getDate() - 1); date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
    const dm = n.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (dm) { let y = dm[3] ? +dm[3] : dt.getFullYear(); if (y < 100) y += 2000; date = `${y}-${pad(+dm[2])}-${pad(+dm[1])}`; }
    const c = guessCat(p, type);
    // descrição: texto sem valor, verbos e meios de pagamento
    let desc = p.replace(/r\$\s*/ig, '').replace(/\d+[.,]?\d*\s*(reais|real|conto|pila|mil|k)?/ig, '')
      .replace(/\b(gastei|paguei|comprei|recebi|ganhei|foi|deu|no|na|do|da|de|em|com|o|a|um|uma|pix|via|cart[aã]o|cr[eé]dito|d[eé]bito|dinheiro|parcelad[oa]|vezes|x|hoje|ontem|anteontem|reais)\b/ig, ' ');
    for (const b of S.banks) desc = desc.replace(new RegExp(b.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
    for (const cc of S.cards) if (cc.name) desc = desc.replace(new RegExp('\\b' + cc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'ig'), ' ');
    desc = desc.split(/\s+/).filter(w => !NUMW[norm(w)] && !/^(e|centavos?)$/i.test(w)).join(' ').trim(); desc = desc ? desc[0].toUpperCase() + desc.slice(1) : (c ? c.name : '');
    out.push({ type, amount: round2(val), desc, cat: c?.id || null, method, cardId: method === 'credito' ? (cardHit?.id || S.cards[0]?.id || '') : '', bankId: method !== 'credito' && method !== 'dinheiro' ? (bankHit?.id || cardHit?.bankId || '') : '', inst: method === 'credito' ? inst : 1, date, note: '' });
  }
  return out;
}

/* ===================== IA (Google Gemini) ===================== */
const AI_RETRY = new Set([408, 429, 500, 502, 503, 504, 529]);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function aiFetch(url, opts) {
  let res;
  try { res = await fetch(url, opts); } catch (e) { return { ok: false, status: 0, retry: true, msg: 'Sem conexão com a IA — verifique a internet.' }; }
  const j = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, j };
  const why = { 400: 'pedido recusado', 401: 'chave inválida', 403: 'chave sem permissão', 404: 'modelo indisponível', 429: 'limite de uso atingido' }[res.status];
  return { ok: false, status: res.status, retry: AI_RETRY.has(res.status), msg: `${why ? why[0].toUpperCase() + why.slice(1) + ': ' : ''}${j.error?.message || 'erro'} (HTTP ${res.status})` };
}
async function aiTry(models, call, onStatus) {
  let last;
  for (let m = 0; m < models.length; m++) {
    for (let t = 0; t < 3; t++) {
      if (m || t) onStatus?.(m ? `Modelo ocupado, tentando ${models[m]}…` : `IA ocupada, tentando de novo (${t + 1}/3)…`);
      const r = await call(models[m]);
      if (r.ok) return r.j;
      last = r;
      if (r.status === 404 && m) break;
      if (!r.retry) throw new Error(r.msg);
      if (t < 2) await wait(1500 * 2 ** t + Math.random() * 500);
    }
  }
  throw new Error(last && [429, 503, 529].includes(last.status) ? 'A IA está sobrecarregada. Tente de novo em instantes.' : last.msg);
}
function aiPrompt(kind, text) {
  const cats = t => S.cats.filter(c => c.type === t).map(c => `"${c.name}"${c.kw ? ` (${c.kw.split(/\s+/).slice(0, 8).join(', ')})` : ''}`).join('; ');
  const cards = S.cards.map(c => `{"id":"${c.id}","cartao":"${c.name}","banco":"${bank(c.bankId)?.name || ''}","final":"${c.final || ''}"}`).join(', ') || 'nenhum';
  const banks = S.banks.map(b => `{"id":"${b.id}","banco":"${b.name}"}`).join(', ') || 'nenhum';
  const src = { texto: `a mensagem do usuário: "${text}"`, audio: 'o ÁUDIO anexo (transcreva e interprete o que a pessoa falou)', imagem: `a IMAGEM anexa (nota fiscal, cupom, recibo, comprovante de Pix/transferência ou fatura). Use o VALOR TOTAL pago, o nome do estabelecimento e a data impressa. Procure a forma de pagamento impressa (crédito/débito/Pix/dinheiro, bandeira, últimos 4 dígitos).${text ? ` Observação do usuário (tem prioridade): "${text}"` : ''}` }[kind];
  return `Você é o assistente financeiro do app GranaGo (Brasil). Hoje é ${todayISO()}.
Extraia os lançamentos financeiros de ${src}
Categorias de DESPESA: ${cats('despesa')}
Categorias de RECEITA: ${cats('receita')}
Cartões de crédito cadastrados: [${cards}]
Bancos/contas cadastrados: [${banks}]
Regras:
- "tipo": "despesa" ou "receita" (recebi, ganhei, salário, caiu na conta = receita).
- "valor": número em reais (ex.: 42.9). Valores por extenso ("cinquenta e dois e noventa") viram número.
- "categoria": EXATAMENTE um dos nomes de categoria acima, do tipo correto.
- "metodo": "pix", "credito", "debito", "dinheiro", "boleto" ou "outro". Se citar um cartão cadastrado ou "cartão"/"crédito"/"parcelado", é "credito".
- "cartao_id": id do cartão cadastrado usado (pelo nome, banco ou final). null se não for crédito.
- "banco_id": id do banco usado em pix/débito/boleto, se citado. null se não souber.
- "parcelas": número de parcelas (1 se à vista).
- "data": "AAAA-MM-DD" (ontem, anteontem, dia 5 etc. relativos a hoje; padrão: hoje).
- "descricao": curta e clara (ex.: "iFood", "Mercado Assaí", "Uber").
- Se houver vários gastos, retorne um item para cada. Numa nota fiscal, retorne UM item com o total (não liste os produtos).
Responda SOMENTE com JSON válido:
{"lancamentos":[{"tipo":"despesa","valor":42.9,"descricao":"iFood","categoria":"Alimentação","metodo":"credito","cartao_id":"id ou null","banco_id":null,"parcelas":1,"data":"${todayISO()}"}],"transcricao":"o que foi entendido/falado","observacao":"frase curta se algo ficou incerto"}
Se não houver lançamento, retorne {"lancamentos":[],"observacao":"motivo"}.`;
}
async function aiCall(prompt, media, onStatus) {
  const key = aiKey(); if (!key) throw new Error('NOKEY');
  const parts = [{ text: prompt }];
  if (media) parts.push({ inline_data: { mime_type: media.mime, data: media.b64 } });
  const j = await aiTry(['gemini-flash-lite-latest', 'gemini-flash-latest'], model => aiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }),
  }), onStatus);
  const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error('A IA não retornou resposta.');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  return JSON.parse(text.slice(a, b + 1));
}
function fromAI(o) {
  const type = o.tipo === 'receita' ? 'receita' : 'despesa';
  const c = S.cats.find(x => x.type === type && norm(x.name) === norm(o.categoria)) || guessCat(`${o.descricao} ${o.categoria}`, type);
  let method = METHODS[o.metodo] ? o.metodo : 'pix'; if (type === 'receita' && method === 'credito') method = 'pix';
  const cid = card(o.cartao_id) ? o.cartao_id : method === 'credito' ? (findCard(norm(o.descricao))?.id || S.cards[0]?.id || '') : '';
  return { type, amount: round2(+o.valor || parseMoney(o.valor)), desc: o.descricao || '', cat: c?.id || null, method, cardId: method === 'credito' ? cid : '', bankId: method !== 'credito' && bank(o.banco_id) ? o.banco_id : '', inst: method === 'credito' ? Math.max(1, +o.parcelas || 1) : 1, date: /^\d{4}-\d{2}-\d{2}$/.test(o.data || '') ? o.data : todayISO(), note: '' };
}

// Ponto único: interpreta texto, áudio ou imagem e abre o formulário/revisão
async function interpret({ text = '', audio = null, image = null }, setStatus) {
  const spin = m => setStatus(`<span class="spinner"></span>${esc(m)}`);
  let items = [], note = '';
  const kind = image ? 'imagem' : audio ? 'audio' : 'texto';
  try {
    spin(image ? 'Lendo a nota…' : audio ? 'Ouvindo o áudio…' : 'Interpretando…');
    const r = await aiCall(aiPrompt(kind, text), image || audio, spin);
    items = (r.lancamentos || []).map(fromAI).filter(i => i.amount > 0);
    note = r.observacao || (r.transcricao && kind === 'audio' ? `“${r.transcricao}”` : '');
    if (!items.length && kind === 'texto') items = localParse(text);
  } catch (e) {
    if (kind === 'texto') { items = localParse(text); if (e.message !== 'NOKEY') note = 'IA indisponível — usei o interpretador local. ' + e.message; }
    else { setStatus(`<span class="err">${e.message === 'NOKEY' ? (image ? 'A leitura de foto precisa da chave da IA (Ajustes).' : 'Para áudio gravado é preciso a chave da IA (Ajustes) ou o reconhecimento de voz do aparelho.') : esc('Não consegui interpretar: ' + e.message)}</span>`); return false; }
  }
  if (!items.length) { setStatus(`<span class="err">${esc(note || 'Não achei valor. Ex.: "uber 23,50 no pix".')}</span>`); return false; }
  setStatus(`<b>✓ ${items.length} lançamento(s) entendido(s)</b>${note ? ' — ' + esc(note) : ''}`);
  const img = image && image.dataUrl;
  if (items.length === 1) { $('#dlgAI').open && $('#dlgAI').close(); openTx(null, { prefill: items[0], img }); }
  else openReview(items, note);
  return true;
}

/* ===================== Revisão de vários ===================== */
let rvItems = [];
function openReview(items, note) {
  rvItems = items.map(i => ({ ...i, _on: true }));
  $('#rvNote').textContent = note || 'Toque em um item para ajustar.';
  renderReview(); $('#dlgAI').open && $('#dlgAI').close(); $('#dlgReview').showModal();
}
function renderReview() {
  $('#rvList').innerHTML = rvItems.map((t, i) => { const c = cat(t.cat), cdd = card(t.cardId);
    return `<div class="rv"><input type="checkbox" data-i="${i}" ${t._on ? 'checked' : ''}><div class="it" style="flex:1;border:0;padding:0" data-e="${i}">
      <div class="ico" style="background:${c.color}22">${c.icon}</div>
      <div class="tx"><b>${esc(t.desc || c.name)}</b><small>${esc([c.name, METHODS[t.method], cdd?.name, t.inst > 1 ? t.inst + 'x' : '', dayLabel(t.date)].filter(Boolean).join(' · '))}</small></div>
      <div class="val ${t.type === 'receita' ? 'in' : 'out'}">${t.type === 'receita' ? '+' : '-'}${brl(t.amount)}</div></div></div>`; }).join('');
  $$('#rvList input').forEach(x => x.onchange = () => rvItems[+x.dataset.i]._on = x.checked);
  $$('#rvList [data-e]').forEach(x => x.onclick = () => {
    const i = +x.dataset.e; $('#dlgReview').close();
    openTx(null, { prefill: rvItems[i] });
    txQueue = { done: t => { rvItems[i] = { ...t, id: null, _on: true }; setTimeout(() => { renderReview(); $('#dlgReview').showModal(); }, 50); }, cancel: () => setTimeout(() => $('#dlgReview').showModal(), 50) };
  });
}
$('#rvSave').onclick = () => {
  const L = rvItems.filter(t => t._on); if (!L.length) { toast('Nada selecionado'); return; }
  for (const t of L) { const { _on, ...x } = t; x.cat ||= (S.cats.find(c => c.type === x.type && /outr/i.test(c.name)) || {}).id; x.id = null; upsertTx(x); }
  $('#dlgReview').close(); toast(`${L.length} lançamento(s) salvo(s) ✓`);
};

/* ===================== Imagem (câmera / galeria) ===================== */
async function prepImage(file) {
  if (file.type === 'application/pdf') { const b64 = await blobB64(file); return { mime: 'application/pdf', b64, dataUrl: '' }; }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const max = 1600, sc = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = img.width * sc; cv.height = img.height * sc;
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const dataUrl = cv.toDataURL('image/jpeg', 0.85);
    return { mime: 'image/jpeg', b64: dataUrl.split(',')[1], dataUrl };
  } catch (e) { const b64 = await blobB64(file); return { mime: file.type || 'image/jpeg', b64, dataUrl: `data:${file.type};base64,${b64}` }; }
  finally { setTimeout(() => URL.revokeObjectURL(url), 30000); }
}
const blobB64 = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(b); });
let imgTarget = 'ai';
async function onImage(file) {
  if (!file) return;
  openAI('foto');
  const st = h => $('#aiStatus').innerHTML = h;
  st('<span class="spinner"></span>Preparando imagem…');
  try {
    const im = await prepImage(file);
    if (im.dataUrl) { $('#aiImg').src = im.dataUrl; $('#aiImg').hidden = false; }
    await interpret({ image: im, text: $('#aiText').value.trim() }, st);
  } catch (e) { st(`<span class="err">${esc('Erro ao abrir a imagem: ' + e.message)}</span>`); }
}
$('#fileCam').onchange = e => { const f = e.target.files[0]; e.target.value = ''; onImage(f); };
$('#fileGal').onchange = e => { const f = e.target.files[0]; e.target.value = ''; onImage(f); };

/* ===================== Voz / áudio ===================== */
const SR = (() => { try { const C = window.Capacitor; return C?.isNativePlatform?.() && (C.Plugins?.SpeechRecognition || C.registerPlugin?.('SpeechRecognition')); } catch (e) { return null; } })();
const WebSR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null; // gravação ativa
async function startVoice(targetInput, statusFn, btn) {
  if (rec) { await rec.stop(); return; }
  const setBtn = on => { btn && btn.classList.toggle('rec', on); if (btn) btn.innerHTML = on ? '⏹️ Parar' : '🎙️ Falar'; $('#aiWave').hidden = !on || targetInput !== $('#aiText'); };
  const base = targetInput.value ? targetInput.value.trim() + '\n' : '';
  const finish = async txt => { rec = null; setBtn(false); clearInterval(tmr); txt = (txt || '').trim(); if (!txt) { statusFn('<span class="err">Não entendi. Tente falar de novo, mais perto do microfone.</span>'); return; } targetInput.value = base + txt; statusFn(`Ouvi: “${esc(txt)}”`); await interpret({ text: targetInput.value }, statusFn); };
  let t0 = Date.now(), tmr = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#aiRecT').textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`; }, 300);
  // 1) Android nativo: reconhecimento de voz do Google (funciona sem chave de IA)
  if (SR) {
    try {
      const av = await SR.available(); if (!av.available) throw new Error('indisp');
      const p = await SR.requestPermissions(); if (p.speechRecognition && p.speechRecognition !== 'granted') throw new Error('Permita o microfone para o GranaGo.');
      let last = '', done = false;
      const hs = [await SR.addListener('partialResults', d => { last = (d.matches || [])[0] || last; targetInput.value = base + last; })];
      try { hs.push(await SR.addListener('listeningState', d => { if (d.status === 'stopped' && rec) rec.stop(); })); } catch (e) { }
      setBtn(true); statusFn('🎙️ Pode falar… toque em Parar quando terminar.');
      rec = { stop: async () => { if (done) return; done = true; try { await SR.stop(); } catch (e) { } hs.forEach(h => h.remove?.()); finish(last); } };
      SR.start({ language: 'pt-BR', maxResults: 1, partialResults: true, popup: false }).catch(e => { if (rec && !last) { statusFn(`<span class="err">${esc(e.message || 'Falha no reconhecimento de voz')}</span>`); } });
      return;
    } catch (e) { if (e.message !== 'indisp') { clearInterval(tmr); statusFn(`<span class="err">${esc(e.message)}</span>`); return; } }
  }
  // 2) Navegador (Chrome/Edge no PC ou celular)
  if (WebSR && !(window.Capacitor?.isNativePlatform?.())) {
    const r = new WebSR(); r.lang = 'pt-BR'; r.interimResults = true; r.continuous = true;
    let fin = '', tmp = '';
    r.onresult = ev => { tmp = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) fin += x[0].transcript + ' '; else tmp += x[0].transcript; } targetInput.value = base + fin + tmp; };
    r.onerror = ev => { if (ev.error === 'not-allowed') statusFn('<span class="err">Permita o microfone no navegador.</span>'); };
    r.onend = () => { if (rec) finish(fin + tmp); };
    rec = { stop: async () => r.stop() }; r.start(); setBtn(true); statusFn('🎙️ Pode falar… toque em Parar quando terminar.');
    return;
  }
  // 3) Grava o áudio e manda para a IA (precisa da chave)
  if (!aiKey()) { clearInterval(tmr); statusFn('<span class="err">Reconhecimento de voz indisponível neste aparelho. Configure a chave da IA em Ajustes para enviar áudio.</span>'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const chunks = [];
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); rec = null; setBtn(false); clearInterval(tmr);
      const blob = new Blob(chunks, { type: (mr.mimeType || 'audio/webm').split(';')[0] });
      if (blob.size < 2000) { statusFn('<span class="err">Áudio muito curto.</span>'); return; }
      await interpret({ audio: { mime: blob.type, b64: await blobB64(blob) } }, statusFn);
    };
    rec = { stop: async () => mr.state !== 'inactive' && mr.stop() }; mr.start(); setBtn(true); statusFn('🔴 Gravando… toque em Parar quando terminar.');
    setTimeout(() => rec && rec.stop(), 60000);
  } catch (e) { clearInterval(tmr); statusFn('<span class="err">Não consegui acessar o microfone. Verifique a permissão.</span>'); }
}

/* ===================== Assistente (dialog) + barra rápida ===================== */
function openAI(mode) {
  $('#aiTitle').textContent = mode === 'audio' ? 'Fale o que gastou' : mode === 'foto' ? 'Foto da nota' : 'Conte o que gastou';
  $('#aiImg').hidden = true; $('#aiStatus').innerHTML = aiKey() ? 'Ex.: “paguei 89,90 na farmácia no cartão do Inter em 2x”.' : 'Dica: com a chave da IA (Ajustes) eu também leio fotos de notas.';
  if (!$('#dlgAI').open) { $('#aiText').value = ''; $('#dlgAI').showModal(); }
  if (mode === 'audio') startVoice($('#aiText'), h => $('#aiStatus').innerHTML = h, $('#aiMic'));
  if (mode === 'msg') setTimeout(() => $('#aiText').focus(), 150);
}
$('#dlgAI').addEventListener('close', () => { if (rec) rec.stop(); });
$('#aiMic').onclick = () => startVoice($('#aiText'), h => $('#aiStatus').innerHTML = h, $('#aiMic'));
$('#aiCam').onclick = () => $('#fileCam').click();
$('#aiGal').onclick = () => $('#fileGal').click();
$('#aiGo').onclick = async () => { const t = $('#aiText').value.trim(); if (!t) { toast('Escreva ou fale o gasto'); return; } $('#aiGo').disabled = true; await interpret({ text: t }, h => $('#aiStatus').innerHTML = h); $('#aiGo').disabled = false; };

$('#fab').onclick = () => $('#dlgNew').showModal();
$('#dlgNew').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b) return; const m = b.dataset.mode; $('#dlgNew').close();
  if (m === 'despesa' || m === 'receita') openTx(null, { type: m });
  else if (m === 'cam') $('#fileCam').click();
  else if (m === 'gal') $('#fileGal').click();
  else openAI(m);
});
const qs = h => $('#qStatus').innerHTML = h;
$('#qSend').onclick = async () => { const t = $('#qText').value.trim(); if (!t) { $('#qText').focus(); return; } if (await interpret({ text: t }, qs)) $('#qText').value = ''; };
$('#qText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#qSend').click(); } });
$('#qText').addEventListener('input', e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; });
$('#qMic').onclick = () => openAI('audio');
$('#qCam').onclick = () => $('#fileCam').click();

/* ===================== Início ===================== */
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('sw.js').catch(() => { });
// Botão "voltar" (Android/navegador) fecha a folha aberta em vez de sair do app
let ignorePop = 0;
const _showModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () { if (this.open) return; _showModal.call(this); history.pushState({ dlg: this.id }, ''); };
$$('dialog').forEach(d => d.addEventListener('close', () => { if (d._byPop) { d._byPop = false; return; } if (history.state && history.state.dlg) { ignorePop++; history.back(); } }));
window.addEventListener('popstate', () => { if (ignorePop) { ignorePop--; return; } const d = $$('dialog').filter(x => x.open).pop(); if (d) { d._byPop = true; d.close(); } });
render();
