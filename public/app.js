/* HOLO — frontend. Vanilla JS, sem build. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BRL = n => 'R$ ' + Number(n).toLocaleString('pt-BR');
const TYPE = { Fire: ['#ff6a3d', '#7a1200'], Water: ['#3db4ff', '#003a7a'], Grass: ['#5ee27a', '#0b4a1e'], Lightning: ['#ffe14d', '#7a5a00'], Psychic: ['#c86bff', '#3a0b6b'], Fighting: ['#ff9a4d', '#6b2e00'], Darkness: ['#6b7cff', '#0b0f3a'], Dragon: ['#ffb84d', '#3a2a00'], Colorless: ['#d8dbe0', '#3a3d44'] };
const state = { cards: [], cart: JSON.parse(localStorage.getItem('holo.cart') || '[]'), type: 'all', sort: 'featured', q: '', mode: 'buyer', live: false, chat: [] };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- holo tilt ---------- */
function holoCard(card, { size = '' } = {}) {
  const [c1, c2] = TYPE[card.type] || TYPE.Colorless;
  const el = document.createElement('div');
  el.className = 'card' + (size ? ' ' + size : '');
  el.innerHTML = `${card.img ? `<img src="${card.img}" alt="${card.name}" loading="lazy" draggable="false">` : ''}<div class="art" style="--c1:${c1};--c2:${c2}"${card.img ? ' hidden' : ''}>${card.name[0]}<small>${card.set}</small></div><div class="shine"></div><div class="glare"></div>`;
  const img = $('img', el); if (img) img.onerror = () => { img.remove(); $('.art', el).hidden = false; };
  if (!reduced) attachTilt(el);
  return el;
}
function attachTilt(el) {
  const set = (px, py, o) => { const cx = px - 50, cy = py - 50; el.style.setProperty('--px', px + '%'); el.style.setProperty('--py', py + '%'); el.style.setProperty('--rx', (-cx / 3.5) + 'deg'); el.style.setProperty('--ry', (cy / 3.5) + 'deg'); el.style.setProperty('--bx', (37 + px * .26) + '%'); el.style.setProperty('--by', (37 + py * .26) + '%'); el.style.setProperty('--pc', Math.min(1, Math.hypot(cx, cy) / 50)); el.style.setProperty('--o', o); };
  el.addEventListener('pointermove', e => { el.classList.remove('reset'); el._hover = true; const r = el.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100, 1); });
  el.addEventListener('pointerleave', () => { el._hover = false; el.classList.add('reset'); set(50, 50, 0); });
  el._set = set;
}
// idle float: a carta do herói respira e cintila mesmo sem mouse
function idleFloat(el) {
  if (reduced) return; let t = 0;
  (function loop() { if (!el.isConnected) return; if (!el._hover) { t += .012; el.classList.add('reset'); el._set(50 + Math.sin(t) * 22, 50 + Math.cos(t * .8) * 16, .55); } requestAnimationFrame(loop); })();
}

/* ---------- helpers ---------- */
const spark = (pts, w = 120, h = 36) => { const mn = Math.min(...pts), mx = Math.max(...pts); const p = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - 3 - ((v - mn) / ((mx - mn) || 1)) * (h - 6)}`); return `<defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#21e985" stop-opacity=".35"/><stop offset="1" stop-color="#21e985" stop-opacity="0"/></linearGradient></defs><polygon class="area" points="0,${h} ${p.join(' ')} ${w},${h}"/><polyline points="${p.join(' ')}"/>`; };
const verdict = c => { const avg = c.history.reduce((a, b) => a + b, 0) / c.history.length; const pct = (c.price - avg) / avg; const low = c.price <= Math.min(...c.history) * 1.02; if (pct > .15) return { k: 'fail', t: 'CARO', n: `${Math.round(pct * 100)}% acima da média de 90 dias` }; if (pct < -.05 || low) return { k: 'ok', t: 'BOA HORA', n: low ? 'menor preço em 90 dias' : `${Math.abs(Math.round(pct * 100))}% abaixo da média` }; return { k: 'warn', t: 'JUSTO', n: 'dentro da média de 90 dias' }; };
const scarcity = c => c.grade.pop === 0 ? null : c.grade.pop < 500 ? 'LOW POP' : null;
function toast(msg, undo) { const t = $('#toast'); t.innerHTML = `<span>${msg}</span>${undo ? '<button>Desfazer</button>' : ''}`; t.hidden = false; clearTimeout(t._h); if (undo) $('button', t).onclick = () => { undo(); t.hidden = true; }; t._h = setTimeout(() => t.hidden = true, undo ? 8000 : 3200); }
const reveal = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.style.animationPlayState = 'running'; reveal.unobserve(e.target); } }), { rootMargin: '0px 0px -8%' });

/* ---------- render: hero + stats ---------- */
function renderHero() {
  const c = state.cards.find(x => x.id === 'c01') || state.cards[0];
  const host = $('#hero-card'); host.innerHTML = ''; const card = holoCard(c); host.append(card); idleFloat(card);
  card.onclick = () => openCard(c.id);
  host.insertAdjacentHTML('beforeend', `<div class="tag"><span class="label">DESTAQUE · ${c.grade.grader} ${c.grade.score}</span><span class="name">${c.name} · ${c.set}</span><span class="mono">${BRL(c.price)}</span></div>`);
  const idx = state.cards[0].history.map((_, i) => state.cards.reduce((s, k) => s + (k.history[i] || 0), 0));
  const total = idx.at(-1), prev = idx.at(-2), d = ((total - prev) / prev * 100).toFixed(1);
  $('#stat-index').textContent = BRL(total); $('#stat-spark').innerHTML = spark(idx); $('#stat-delta').textContent = `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% hoje · valor do catálogo`; $('#stat-delta').style.color = d >= 0 ? 'var(--live)' : 'var(--err)';
  $('#stat-certs').textContent = state.cards.filter(c => c.grade.pop > 0).length + ' verificáveis';
  $('#stat-listings').textContent = state.cards.length; const n = state.cards.filter(c => c.isNew).length; $('#stat-new').textContent = n ? `${n} novo(s) hoje` : 'nenhum novo hoje';
}

/* ---------- render: grid ---------- */
function renderFilters() {
  const types = ['all', ...new Set(state.cards.map(c => c.type))];
  $('#filters').innerHTML = types.map(t => `<button class="chip${state.type === t ? ' is-on' : ''}" data-type="${t}"><span class="dot" style="--c:${(TYPE[t] || ['var(--t-3)'])[0]}"></span>${t === 'all' ? 'Todas' : t}</button>`).join('');
  $$('#filters .chip').forEach(b => b.onclick = () => { state.type = b.dataset.type; renderFilters(); renderGrid(); });
}
function visible() {
  let list = state.cards.filter(c => state.type === 'all' || c.type === state.type);
  const q = state.q.trim().toLowerCase();
  if (q.startsWith('<=')) list = list.filter(c => c.price <= Number(q.slice(2)));
  else if (q) list = list.filter(c => [c.name, c.set, c.setCode, c.grade.cert, c.type, c.rarity].join(' ').toLowerCase().includes(q));
  const s = state.sort; list = [...list].sort((a, b) => s === 'price-desc' ? b.price - a.price : s === 'price-asc' ? a.price - b.price : s === 'grade' ? (Number(b.grade.score) || 0) - (Number(a.grade.score) || 0) : s === 'pop' ? (a.grade.pop || 1e9) - (b.grade.pop || 1e9) : (b.isNew === true) - (a.isNew === true) || (b.featured === true) - (a.featured === true));
  return list;
}
function renderGrid() {
  const g = $('#grid'); const list = visible();
  g.innerHTML = list.length ? '' : `<p class="empty">Nada encontrado. Pergunte ao assistente — ele conhece o catálogo inteiro.</p>`;
  list.forEach((c, i) => {
    const el = document.createElement('article'); el.className = 'listing' + (c.featured ? ' featured' : ''); el.style.animationDelay = (i % 8) * 40 + 'ms'; el.style.animationPlayState = 'paused';
    const v = verdict(c), sc = scarcity(c);
    el.innerHTML = `<div class="badges">${c.featured ? '<span class="badge holo">HOLO PICK</span>' : ''}${sc ? `<span class="badge pop">${sc} · ${c.grade.pop}</span>` : ''}${c.isNew ? '<span class="badge new">NOVO</span>' : ''}${v.k === 'ok' ? '<span class="badge">↓ BOA HORA</span>' : ''}</div>`;
    el.append(holoCard(c));
    el.insertAdjacentHTML('beforeend', `<div class="meta"><div><p class="name">${c.name}</p><p class="set">${c.set} · ${c.setCode}</p></div><span class="grade">${c.grade.grader.split(' ')[0]} ${c.grade.score}</span></div><div class="price-row"><span class="price">${BRL(c.price)}</span><button class="btn btn-ghost sm add">Adicionar</button></div>`);
    $('.card', el).onclick = () => openCard(c.id); $('.name', el).onclick = () => openCard(c.id);
    $('.add', el).onclick = e => { e.stopPropagation(); addToCart(c.id); };
    g.append(el); reveal.observe(el);
  });
}

/* ---------- detail modal ---------- */
function openCard(id) {
  const c = state.cards.find(x => x.id === id); if (!c) return; const v = verdict(c), sc = scarcity(c);
  const m = $('#modal'), box = $('#modal-card'); box.innerHTML = '';
  const card = holoCard(c); box.append(card); if (!reduced) { card.classList.add('reset'); card._set(58, 42, .5); }
  box.insertAdjacentHTML('beforeend', `<div class="detail">
    <p class="label">${c.set} · ${c.setCode} · ${c.year} · ${c.rarity}</p><h2>${c.name}</h2>
    <div class="row" style="flex-wrap:wrap"><span class="price">${BRL(c.price)}</span><span class="verdict-chip"><span class="pill ${v.k}">${v.t}</span>${v.n}</span></div>
    <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none">${spark(c.history)}</svg>
    <dl class="kv"><dt>Graduação</dt><dd>${c.grade.grader} <b class="mono">${c.grade.score}</b>${sc ? ` · <span class="pill pop" style="color:var(--warn)">${sc}</span>` : ''}</dd><dt>Certificado</dt><dd class="mono">${c.grade.cert}</dd><dt>População</dt><dd>${c.grade.pop ? c.grade.pop.toLocaleString('pt-BR') + ' exemplares nesta nota' : 'sem graduação (pendente HOLO Vault)'}</dd><dt>Condição</dt><dd>${c.condition}</dd><dt>Vendedor</dt><dd>@${c.seller} · envio segurado · 7 dias para devolução</dd>${c.description ? `<dt>Descrição</dt><dd>${c.description}</dd>` : ''}</dl>
    <div id="cert-match"></div>
    <div class="actions"><button class="btn btn-primary" id="m-add">Adicionar ao carrinho</button><button class="btn btn-ghost" id="m-verify">Conferir certificado</button><button class="btn btn-ghost" id="m-ask">Perguntar ao HOLO</button></div></div>`);
  $('#m-add').onclick = () => { addToCart(c.id); closeModal(); };
  $('#m-verify').onclick = () => certMatch(c, $('#cert-match'));
  $('#m-ask').onclick = () => { closeModal(); openChat(); sendChat(`Me fala sobre a ${c.name} (${c.set}). Vale a pena por ${BRL(c.price)}?`); };
  m.hidden = false; document.body.style.overflow = 'hidden';
}
function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#drawer').classList.remove('open'); } });

// Cert Match: cruza o registro com o que o anúncio afirma
async function certMatch(c, host) {
  host.innerHTML = `<div class="result scan"><p class="label">consultando registro ${c.grade.grader}…</p></div>`;
  await new Promise(r => setTimeout(r, 900));
  const r = await fetch('/api/verify/' + encodeURIComponent(c.grade.cert)).then(r => r.json());
  if (!r.found) return host.innerHTML = `<div class="result"><div class="verdict"><span class="pill fail">SEM REGISTRO</span>Cert não encontrado</div><p class="muted">${r.message}</p></div>`;
  const match = r.cardId === c.id && String(r.score) === String(c.grade.score) && r.status === 'ATIVO';
  host.innerHTML = `<div class="result"><div class="verdict"><span class="pill ${match ? 'ok' : 'fail'}">${r.status !== 'ATIVO' ? r.status : match ? 'MATCH' : 'MISMATCH'}</span>${match ? 'Registro confere com o anúncio' : 'Divergência entre registro e anúncio'}</div>
    <div class="diff"><div><p class="label">Anúncio diz</p>${c.name} · ${c.grade.grader} ${c.grade.score}</div><div><p class="label">Registro ${r.grader}</p>${r.card} · nota ${r.score} · ${r.gradedAt}</div></div>${r.note ? `<p class="hint" style="color:var(--err)">${r.note}</p>` : ''}</div>`;
}

/* ---------- cart ---------- */
function saveCart() { localStorage.setItem('holo.cart', JSON.stringify(state.cart)); const n = $('#cart-count'); n.textContent = state.cart.length; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); renderCart(); }
function addToCart(id, silent) { if (state.cart.includes(id)) { toast('Essa carta já está no carrinho.'); return; } state.cart.push(id); saveCart(); const c = state.cards.find(x => x.id === id); if (!silent) toast(`${c.name} adicionada · ${BRL(c.price)}`, () => removeFromCart(id, true)); }
function removeFromCart(id, silent) { state.cart = state.cart.filter(x => x !== id); saveCart(); if (!silent) toast('Removida do carrinho.'); }
function renderCart() {
  const items = state.cart.map(id => state.cards.find(c => c.id === id)).filter(Boolean);
  $('#cart-items').innerHTML = items.length ? items.map(c => `<div class="cart-item">${c.img ? `<img class="thumb" src="${c.img}" alt="">` : '<div class="thumb"></div>'}<div><b>${c.name}</b><br><span class="label">${c.grade.grader} ${c.grade.score} · ${c.setCode}</span></div><div style="text-align:right"><div class="mono">${BRL(c.price)}</div><button class="rm" data-id="${c.id}">remover</button></div></div>`).join('') : '<p class="empty">Carrinho vazio.<br>Peça uma sugestão ao assistente ✦</p>';
  $$('.rm', $('#cart-items')).forEach(b => b.onclick = () => removeFromCart(b.dataset.id));
  const sub = items.reduce((s, c) => s + c.price, 0), ship = sub >= 500 || !sub ? 0 : 39;
  $('#cart-ship').textContent = sub ? (ship ? BRL(ship) : 'Grátis · segurado') : '—'; $('#cart-total').textContent = BRL(sub + ship); $('#checkout').disabled = !items.length;
}
function openCart() { $('#drawer').classList.add('open'); }
$('#cart-btn').onclick = openCart; $('#drawer-close').onclick = () => $('#drawer').classList.remove('open');
$('#checkout').onclick = async () => { const b = $('#checkout'); b.disabled = true; b.textContent = 'Processando…'; const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: state.cart }) }).then(r => r.json()); state.cart = []; saveCart(); $('#drawer').classList.remove('open'); b.textContent = 'Finalizar com Pix ou cartão'; toast(`Pedido ${r.orderId} confirmado · ${BRL(r.total)} · chega em ${r.eta}, segurado.`); };

/* ---------- verifier ---------- */
$('#verify-form').onsubmit = async e => {
  e.preventDefault(); const cert = $('#verify-input').value.trim(); if (!cert) return; const host = $('#verify-result'); host.hidden = false;
  host.className = 'result scan'; host.innerHTML = `<p class="label">consultando graduadoras…</p>`;
  await new Promise(r => setTimeout(r, 1000));
  const r = await fetch('/api/verify/' + encodeURIComponent(cert)).then(r => r.json()); host.className = 'result';
  if (!r.found) return host.innerHTML = `<div class="verdict"><span class="pill fail">SEM REGISTRO</span>${r.cert}</div><p class="muted" style="margin:0">${r.message}</p>`;
  const bad = r.status !== 'ATIVO';
  host.innerHTML = `<div class="verdict"><span class="pill ${bad ? 'fail' : 'ok'}">${r.status}</span>${r.card}</div><dl class="kv"><dt>Graduadora</dt><dd>${r.grader} · nota <b class="mono">${r.score}</b></dd><dt>Cert</dt><dd class="mono">${r.cert}</dd><dt>População</dt><dd>${r.pop.toLocaleString('pt-BR')} nesta nota</dd><dt>Graduada em</dt><dd class="mono">${r.gradedAt}</dd></dl>${r.note ? `<p class="hint" style="color:var(--err)">${r.note}</p>` : `<div class="row" style="margin-top:12px"><button class="btn btn-ghost sm" onclick="openCard('${r.cardId}')">Ver anúncio</button></div>`}`;
};
const drop = $('#drop'), photo = $('#photo');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => analyze(e.dataTransfer.files[0])); photo.onchange = () => analyze(photo.files[0]);
async function analyze(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
  $('#drop-preview').src = dataUrl; $('#drop-preview').hidden = false; $('#drop-text').hidden = true;
  const host = $('#auth-result'); host.hidden = false; host.className = 'result scan'; host.innerHTML = `<p class="label">Gemini Vision analisando tipografia, holo e bordas…</p>`;
  const r = await fetch('/api/authenticate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl.split(',')[1], mimeType: file.type }) }).then(r => r.json()).catch(e => ({ error: e.message }));
  host.className = 'result';
  if (r.error) return host.innerHTML = `<div class="verdict"><span class="pill fail">ERRO</span>Análise falhou</div><p class="muted" style="margin:0">${r.error}</p>`;
  const k = { autentica: 'ok', suspeita: 'warn', falsa: 'fail', inconclusiva: 'warn' }[r.verdict] || 'warn';
  host.innerHTML = `<div class="verdict"><span class="pill ${k}">${(r.verdict || '').toUpperCase()}</span>${r.card || 'Carta'} · confiança ${r.score ?? 0}%</div><div class="score"><i style="--w:${r.score ?? 0}%"></i></div><p class="muted" style="margin:0">${r.summary || ''}</p><ul class="signals">${(r.signals || []).map(s => `<li class="${s.status}"><i></i><div>${s.label}<small>${s.note || ''}</small></div></li>`).join('')}</ul>${r.mode === 'demo' ? '' : `<p class="hint">Modelo: ${r.model} · triagem automática, não substitui laudo de graduadora.</p>`}`;
}

/* ---------- seller mode ---------- */
function setMode(m) { state.mode = m; $$('.mode-btn').forEach(b => b.classList.toggle('is-on', b.dataset.mode === m)); $('#vender').hidden = m !== 'seller'; if (m === 'seller') { $('#vender').scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('Modo vendedor ativo: anuncie uma carta com ajuda da IA.'); } }
$$('.mode-btn').forEach(b => b.onclick = () => setMode(b.dataset.mode)); $('#nav-sell').onclick = e => { e.preventDefault(); setMode('seller'); };
$('#ai-describe').onclick = async () => { const f = $('#sell-form'), b = $('#ai-describe'); if (!f.name.value) return f.name.focus(); b.disabled = true; b.textContent = '✦ Gerando…'; const r = await fetch('/api/describe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name.value, set: f.set.value, condition: f.condition.value, grade: f.grade.value }) }).then(r => r.json()); f.description.value = r.description || ''; if (r.suggestedPrice && !f.price.value) f.price.value = Math.round(r.suggestedPrice); b.disabled = false; b.textContent = '✦ Gerar com IA'; toast(r.mode === 'live' ? 'Descrição e preço sugeridos pelo Gemini.' : 'Descrição gerada (modo demo — adicione a chave para usar o Gemini).'); };
$('#sell-form').onsubmit = async e => { e.preventDefault(); const f = e.target; const body = { name: f.name.value, set: f.set.value, condition: f.condition.value, type: f.type.value, price: f.price.value, description: f.description.value }; const c = await fetch('/api/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()); if (c.error) return toast(c.error); state.cards.unshift(c); f.reset(); renderHero(); renderFilters(); state.type = 'all'; state.sort = 'featured'; $('#sort').value = 'featured'; renderGrid(); toast(`Anúncio publicado: ${c.name}. Aparece no mercado com selo NOVO.`); $('#mercado').scrollIntoView({ behavior: 'smooth' }); };

/* ---------- chat ---------- */
const SUGG = ['Qual a carta mais valiosa?', 'Tem algo até R$ 500?', 'Adiciona a Lugia ao carrinho', 'Como sei se um cert é real?', 'Frete e pagamento'];
function openChat() { $('#chat').hidden = false; $('#chat-fab').hidden = true; $('#chat-input').focus(); if (!state.chat.length) botSay('Oi! Sou o assistente da HOLO. Posso encontrar cartas, comparar preços, explicar graduação e **colocar itens no seu carrinho** — mas quem finaliza a compra é você.'); }
function closeChat() { $('#chat').hidden = true; $('#chat-fab').hidden = false; }
$('#chat-fab').onclick = openChat; $('#chat-close').onclick = closeChat; $('#hero-chat').onclick = openChat;
$('#chips').innerHTML = SUGG.map(s => `<button class="chip" type="button">${s}</button>`).join(''); $$('#chips .chip').forEach(b => b.onclick = () => sendChat(b.textContent));
const md = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
function botSay(text, act) { state.chat.push({ role: 'assistant', text }); const log = $('#chat-log'); log.insertAdjacentHTML('beforeend', `<div class="msg bot">${md(text)}${act ? `<span class="act">⚡ ${act}</span>` : ''}</div>`); log.scrollTop = log.scrollHeight; }
async function sendChat(text) {
  if (!text) return; const log = $('#chat-log'); state.chat.push({ role: 'user', text }); log.insertAdjacentHTML('beforeend', `<div class="msg user">${md(text)}</div>`); $('#chat-input').value = '';
  log.insertAdjacentHTML('beforeend', `<div class="msg bot typing" id="typing"><i></i><i></i><i></i></div>`); log.scrollTop = log.scrollHeight;
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: state.chat.slice(-12), cart: state.cart }) }).then(r => r.json()).catch(e => ({ reply: 'Falha de conexão com o servidor: ' + e.message, actions: [] }));
  $('#typing')?.remove();
  const done = []; for (const a of r.actions || []) { const label = runAction(a); if (label) done.push(label); }
  botSay(r.reply || '…', done.join(' · ')); $('#chat-mode').textContent = r.mode === 'live' ? `gemini · ${r.model}` : 'modo demo';
}
function runAction(a) {
  const c = a.id && state.cards.find(x => x.id === a.id);
  switch (a.type) {
    case 'add_to_cart': if (c) { addToCart(c.id, true); toast(`${c.name} adicionada pelo assistente`, () => removeFromCart(c.id, true)); return `+ ${c.name} no carrinho`; } return '';
    case 'remove_from_cart': if (c) { removeFromCart(c.id, true); return `− ${c.name}`; } return '';
    case 'open_card': if (c) { openCard(c.id); return `abrindo ${c.name}`; } return '';
    case 'open_cart': openCart(); return 'carrinho aberto';
    case 'filter': state.q = a.query || ''; $('#search').value = state.q.startsWith('<=') ? '' : state.q; renderGrid(); $('#mercado').scrollIntoView({ behavior: 'smooth' }); return `filtro: ${a.query}`;
    case 'verify': $('#verify-input').value = a.cert || ''; $('#verificar').scrollIntoView({ behavior: 'smooth' }); $('#verify-form').requestSubmit(); return `verificando ${a.cert}`;
    default: return '';
  }
}
$('#chat-form').onsubmit = e => { e.preventDefault(); sendChat($('#chat-input').value.trim()); };

/* ---------- misc wiring ---------- */
$('#search').oninput = e => { state.q = e.target.value; renderGrid(); }; $('#sort').onchange = e => { state.sort = e.target.value; renderGrid(); };

/* ---------- boot ---------- */
(async () => {
  const [cards, status] = await Promise.all([fetch('/api/cards').then(r => r.json()), fetch('/api/status').then(r => r.json())]);
  state.cards = cards; state.live = status.live;
  $('#ai-status').textContent = status.live ? `IA: Gemini ativo (${status.models[0]})` : 'IA: modo demo — adicione GEMINI_API_KEY no .env';
  renderHero(); renderFilters(); renderGrid(); renderCart();
})();
