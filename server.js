import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cards, priceHistory, registry } from './data/cards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res, fp) => { if (/\.avif$/i.test(fp)) res.setHeader('Content-Type', 'image/avif'); if (/\.webp$/i.test(fp)) res.setHeader('Content-Type', 'image/webp'); } }));

// ---------- Gemini (REST puro, sem SDK) ----------
const API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'].filter(Boolean))];
const LIVE = Boolean(API_KEY);

async function gemini({ system, contents, json = false, maxOutputTokens = 1024 }) {
  if (!LIVE) throw Object.assign(new Error('NO_KEY'), { code: 'NO_KEY' });
  let lastErr;
  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = (data.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
      if (text) return { text, model };
      lastErr = new Error(data.promptFeedback?.blockReason || 'Resposta vazia');
      continue;
    }
    lastErr = Object.assign(new Error(data.error?.message || `HTTP ${res.status}`), { status: res.status });
    if (res.status === 404 || res.status === 429) continue; // tenta o próximo modelo
    break;
  }
  throw lastErr;
}

const catalogText = () => cards.map(c => `- id=${c.id} | ${c.name} | ${c.set} ${c.setCode} (${c.year}) | tipo ${c.type} | ${c.rarity} | ${c.grade.grader} ${c.grade.score} cert ${c.grade.cert} | R$ ${c.price} | vendedor ${c.seller}`).join('\n');

const SYSTEM = () => `Você é HOLO, o assistente da loja HOLO — um marketplace brasileiro de cartas Pokémon graduadas e autenticadas.
Responda SEMPRE em português do Brasil, de forma curta (máx. 3 frases), amigável e direta. Use markdown leve (negrito) quando ajudar.
Catálogo atual:
${catalogText()}

Regras:
- Você pode AGIR na loja. Quando o usuário pedir para adicionar/remover algo ao carrinho, abrir uma carta, filtrar/buscar, ou verificar um certificado, termine a resposta com UMA linha no formato exato:
ACTIONS: [{"type":"add_to_cart","id":"c01"}]
Tipos válidos: add_to_cart{id}, remove_from_cart{id}, open_card{id}, filter{query}, verify{cert}, open_cart{}.
- Nunca invente cartas fora do catálogo. Preços são em reais (R$).
- Sobre autenticidade: explique que graduadoras (PSA, CGC, BGS, HOLO Vault) lacram a carta e emitem um número de certificado que pode ser conferido no verificador da HOLO; e que a análise por foto com IA é uma triagem, não um laudo.
- Frete: grátis acima de R$ 500; entrega em 3-7 dias úteis com seguro. Devolução em 7 dias. Pagamento: Pix, cartão até 12x.`;

// Fallback local quando não há chave: mantém a loja utilizável
function demoReply(text, cart) {
  const q = text.toLowerCase();
  const find = () => cards.find(c => q.includes(c.name.toLowerCase().split(' ')[0]));
  const c = find();
  if (/(adiciona|coloca|põe|poe|quero comprar|add)/.test(q) && c) return { reply: `Feito! Adicionei **${c.name}** (${c.grade.grader} ${c.grade.score}) por R$ ${c.price.toLocaleString('pt-BR')} ao seu carrinho.`, actions: [{ type: 'add_to_cart', id: c.id }] };
  if (/(remove|tira)/.test(q) && c) return { reply: `Removi **${c.name}** do carrinho.`, actions: [{ type: 'remove_from_cart', id: c.id }] };
  if (/carrinho/.test(q)) return { reply: cart?.length ? `Seu carrinho tem ${cart.length} item(ns). Abrindo para você.` : 'Seu carrinho está vazio. Quer que eu sugira uma carta?', actions: [{ type: 'open_cart' }] };
  if (/(cert|verific|autent|original|falsa)/.test(q)) { const m = text.match(/[A-Z]{2,4}-[0-9-]{6,}/i); return { reply: m ? `Verificando o certificado ${m[0].toUpperCase()} no registro.` : 'Toda carta da HOLO vem lacrada por uma graduadora (PSA, CGC, BGS ou HOLO Vault) com um número de certificado. Cole o número aqui ou use o Verificador; também dá para enviar uma foto para triagem por IA.', actions: m ? [{ type: 'verify', cert: m[0].toUpperCase() }] : [] }; }
  if (/(barat|até|ate|menos de|abaixo)/.test(q)) { const n = Number((q.match(/\d+/) || [0])[0]) || 500; const list = cards.filter(x => x.price <= n).sort((a, b) => b.price - a.price).slice(0, 3); return { reply: list.length ? `Até R$ ${n}: ${list.map(x => `**${x.name}** (R$ ${x.price})`).join(', ')}.` : `Não tenho nada até R$ ${n} agora; a mais acessível é o Pikachu VMAX por R$ 72.`, actions: [{ type: 'filter', query: `<=${n}` }] }; }
  if (/(frete|entrega|prazo)/.test(q)) return { reply: 'Frete grátis acima de R$ 500. Entrega em 3-7 dias úteis, com seguro e rastreio.', actions: [] };
  if (/(pagamento|pix|cart[ãa]o|parcel)/.test(q)) return { reply: 'Aceitamos Pix e cartão em até 12x. O pedido só é enviado depois da confirmação.', actions: [] };
  if (c) return { reply: `**${c.name}** (${c.set} ${c.setCode}) está por R$ ${c.price.toLocaleString('pt-BR')}, graduada ${c.grade.grader} ${c.grade.score}, cert ${c.grade.cert}. Quer que eu adicione ao carrinho?`, actions: [{ type: 'open_card', id: c.id }] };
  if (/(cara|valios|melhor|top)/.test(q)) { const t = [...cards].sort((a, b) => b.price - a.price)[0]; return { reply: `A carta mais valiosa hoje é **${t.name}** (${t.set}) por R$ ${t.price.toLocaleString('pt-BR')}.`, actions: [{ type: 'open_card', id: t.id }] }; }
  return { reply: 'Sou o assistente da HOLO (modo demo: configure GEMINI_API_KEY no .env para a IA completa). Posso buscar cartas, adicionar ao carrinho, explicar graduação ou verificar um certificado. O que você procura?', actions: [] };
}

function parseActions(text) {
  const m = text.match(/ACTIONS:\s*(\[[\s\S]*\])\s*$/);
  if (!m) return { reply: text.trim(), actions: [] };
  let actions = [];
  try { actions = JSON.parse(m[1]); } catch { /* ignora ação malformada */ }
  return { reply: text.slice(0, m.index).trim(), actions: Array.isArray(actions) ? actions : [] };
}

// ---------- Rotas ----------
app.get('/api/status', (_, res) => res.json({ live: LIVE, models: MODELS }));

// Fotos próprias: qualquer arquivo em public/img/cartas nomeado pelo id (c01.jpg) ou pelo nome (charizard.png)
// substitui a imagem remota daquela carta. Basta soltar o arquivo na pasta; não precisa reiniciar.
const DIR_FOTOS = path.join(__dirname, 'public', 'img', 'cartas');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function fotoLocal(card) {
  let arquivos = []; try { arquivos = fs.readdirSync(DIR_FOTOS); } catch { return null; }
  const alvos = new Set([card.id.toLowerCase(), slug(card.name), slug(`${card.name} ${card.set}`), slug(card.setCode)]);
  const hit = arquivos.find(f => /\.(jpe?g|png|webp|gif|avif)$/i.test(f) && alvos.has(slug(f.replace(/\.[^.]+$/, ''))));
  return hit ? `/img/cartas/${encodeURIComponent(hit)}` : null;
}
app.get('/api/cards', (_, res) => res.json(cards.map(c => ({ ...c, img: fotoLocal(c) || c.img, history: priceHistory(c) }))));

app.get('/api/verify/:cert', (req, res) => {
  const key = req.params.cert.replace(/\s/g, '').toUpperCase();
  const hit = registry.get(key);
  if (!hit) return res.status(404).json({ found: false, cert: key, message: 'Certificado não encontrado em nenhuma graduadora parceira. Desconfie: pode ser etiqueta falsa ou número digitado errado.' });
  res.json({ found: true, ...hit });
});

app.post('/api/chat', async (req, res) => {
  const { messages = [], cart = [] } = req.body || {};
  const last = messages.at(-1)?.text || '';
  if (!LIVE) return res.json({ ...demoReply(last, cart), mode: 'demo' });
  try {
    const contents = messages.slice(-12).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
    if (cart.length) contents.push({ role: 'user', parts: [{ text: `(contexto: carrinho atual = ${cart.join(', ')})` }] });
    const { text, model } = await gemini({ system: SYSTEM(), contents });
    res.json({ ...parseActions(text), mode: 'live', model });
  } catch (e) {
    console.error('chat error:', e.message);
    res.json({ ...demoReply(last, cart), mode: 'demo', error: e.message });
  }
});

app.post('/api/authenticate', async (req, res) => {
  const { image, mimeType = 'image/jpeg', hint = '' } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Envie a imagem em base64.' });
  const system = `Você é um perito em autenticação de cartas Pokémon TCG. Analise a foto e procure sinais de falsificação: fonte/tipografia, saturação e registro de cores, padrão holográfico, textura, bordas e centralização, qualidade da impressão, símbolo de raridade, texto de copyright e HP/ataques. Responda SOMENTE JSON: {"score": 0-100 (confiança de que é autêntica), "verdict": "autentica"|"suspeita"|"falsa"|"inconclusiva", "card": "nome identificado ou null", "signals": [{"label": "...", "status": "ok"|"warn"|"fail", "note": "curta"}] (5 a 7 itens), "summary": "2 frases em pt-BR"}. Se a imagem não for uma carta, verdict=inconclusiva.`;
  if (!LIVE) return res.json({ mode: 'demo', score: 0, verdict: 'inconclusiva', card: null, signals: [{ label: 'IA desativada', status: 'warn', note: 'Configure GEMINI_API_KEY no .env para a análise por foto.' }], summary: 'Modo demo: a triagem por imagem usa o Gemini (visão). Adicione sua chave no .env e reinicie o servidor.' });
  try {
    const contents = [{ role: 'user', parts: [{ inlineData: { mimeType, data: image } }, { text: `Analise esta carta.${hint ? ' Dica do usuário: ' + hint : ''}` }] }];
    const { text, model } = await gemini({ system, contents, json: true });
    const parsed = JSON.parse(text.replace(/```json|```/g, ''));
    res.json({ mode: 'live', model, ...parsed });
  } catch (e) {
    console.error('auth error:', e.message);
    res.status(502).json({ error: 'Falha na análise: ' + e.message });
  }
});

app.post('/api/describe', async (req, res) => {
  const { name = '', set = '', condition = 'Near Mint', grade = '' } = req.body || {};
  const fallback = { mode: 'demo', description: `${name} (${set}) em condição ${condition}${grade ? ', graduada ' + grade : ''}. Carta conferida e enviada com proteção rígida, seguro e rastreio.`, suggestedPrice: Math.max(40, Math.round((name.length * 37 + set.length * 11) * (condition.includes('Gem') ? 3 : 1.4))), tags: [set, condition].filter(Boolean) };
  if (!LIVE) return res.json(fallback);
  try {
    const system = 'Você escreve anúncios curtos e honestos para um marketplace brasileiro de cartas Pokémon. Responda SOMENTE JSON: {"description": "2-3 frases em pt-BR, sem exagero", "suggestedPrice": número em reais (estimativa de mercado para essa carta/condição), "tags": ["3 a 5 tags curtas"]}.';
    const { text } = await gemini({ system, contents: [{ role: 'user', parts: [{ text: `Carta: ${name}. Coleção: ${set}. Condição: ${condition}. Graduação: ${grade || 'sem graduação'}.` }] }], json: true });
    res.json({ mode: 'live', ...JSON.parse(text.replace(/```json|```/g, '')) });
  } catch (e) { res.json({ ...fallback, error: e.message }); }
});

app.post('/api/listings', (req, res) => {
  const { name, set, condition, price, description, type = 'Colorless', img } = req.body || {};
  if (!name || !price) return res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
  const id = 'u' + String(cards.length + 1).padStart(2, '0');
  const card = { id, name, set: set || 'Coleção não informada', setCode: 'USR-' + id.slice(1), year: new Date().getFullYear(), img: img || null, type, rarity: 'Anúncio de usuário', price: Number(price), grade: { grader: 'Sem graduação', score: '—', cert: 'HV-PEND-' + id.toUpperCase(), pop: 0 }, seller: 'você', condition: condition || 'Near Mint', description, isNew: true };
  cards.push(card);
  res.status(201).json({ ...card, history: priceHistory(card) });
});

app.post('/api/checkout', (req, res) => {
  const { items = [] } = req.body || {};
  const total = items.reduce((s, id) => s + (cards.find(c => c.id === id)?.price || 0), 0);
  res.json({ orderId: 'HOLO-' + Math.random().toString(36).slice(2, 8).toUpperCase(), total, eta: '3-7 dias úteis', insured: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HOLO rodando em http://localhost:${PORT}  |  IA: ${LIVE ? 'Gemini (' + MODELS[0] + ')' : 'modo demo — defina GEMINI_API_KEY no .env'}`));
