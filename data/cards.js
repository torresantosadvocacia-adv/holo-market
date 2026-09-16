// Catálogo inicial + registro de certificados (simula a base de uma graduadora)
const IMG = (set, n) => `https://images.pokemontcg.io/${set}/${n}_hires.png`;

export const cards = [
  { id: 'c01', name: 'Charizard', set: 'Base Set', setCode: 'BS-4', year: 1999, img: IMG('base1', 4), type: 'Fire', rarity: 'Rare Holo', price: 4690, grade: { grader: 'PSA', score: 9, cert: 'PSA-48213377', pop: 3120 }, seller: 'vault.rec', condition: 'Mint', featured: true },
  { id: 'c02', name: 'Blastoise', set: 'Base Set', setCode: 'BS-2', year: 1999, img: IMG('base1', 2), type: 'Water', rarity: 'Rare Holo', price: 1240, grade: { grader: 'CGC', score: 8.5, cert: 'CGC-4021998001', pop: 870 }, seller: 'hydro.tcg', condition: 'Near Mint' },
  { id: 'c03', name: 'Venusaur', set: 'Base Set', setCode: 'BS-15', year: 1999, img: IMG('base1', 15), type: 'Grass', rarity: 'Rare Holo', price: 990, grade: { grader: 'PSA', score: 8, cert: 'PSA-61190042', pop: 2210 }, seller: 'leafstorm', condition: 'Near Mint' },
  { id: 'c04', name: 'Mewtwo', set: 'Base Set', setCode: 'BS-10', year: 1999, img: IMG('base1', 10), type: 'Psychic', rarity: 'Rare Holo', price: 360, grade: { grader: 'BGS', score: 9, cert: 'BGS-0012774531', pop: 640 }, seller: 'psy.lab', condition: 'Mint' },
  { id: 'c05', name: 'Machamp', set: 'Base Set', setCode: 'BS-8', year: 1999, img: IMG('base1', 8), type: 'Fighting', rarity: 'Rare Holo', price: 110, grade: { grader: 'HOLO Vault', score: 9, cert: 'HV-2026-000817', pop: 5130 }, seller: 'dojo.cards', condition: 'Mint' },
  { id: 'c06', name: 'Lugia', set: 'Neo Genesis', setCode: 'NG-9', year: 2000, img: IMG('neo1', 9), type: 'Colorless', rarity: 'Rare Holo', price: 2860, grade: { grader: 'PSA', score: 9, cert: 'PSA-72004118', pop: 1180 }, seller: 'silver.wing', condition: 'Mint', featured: true },
  { id: 'c07', name: 'Ho-Oh', set: 'Neo Revelation', setCode: 'NR-7', year: 2001, img: IMG('neo3', 7), type: 'Fire', rarity: 'Rare Holo', price: 990, grade: { grader: 'CGC', score: 9, cert: 'CGC-4033120077', pop: 410 }, seller: 'rainbow.wing', condition: 'Mint' },
  { id: 'c08', name: 'Rayquaza ★', set: 'EX Deoxys', setCode: 'DX-107', year: 2005, img: IMG('ex8', 107), type: 'Dragon', rarity: 'Gold Star', price: 13750, grade: { grader: 'PSA', score: 8, cert: 'PSA-55018860', pop: 290 }, seller: 'skyhigh', condition: 'Near Mint', featured: true },
  { id: 'c09', name: 'Umbreon ★', set: 'POP Series 5', setCode: 'POP5-17', year: 2007, img: IMG('pop5', 17), type: 'Darkness', rarity: 'Gold Star', price: 16500, grade: { grader: 'BGS', score: 8.5, cert: 'BGS-0015590213', pop: 160 }, seller: 'moonlight', condition: 'Near Mint' },
  { id: 'c10', name: 'Umbreon VMAX', set: 'Evolving Skies', setCode: 'EVS-215', year: 2021, img: IMG('swsh7', 215), type: 'Darkness', rarity: 'Alt Art Secret', price: 11000, grade: { grader: 'PSA', score: 10, cert: 'PSA-83110492', pop: 4480 }, seller: 'moonlight', condition: 'Gem Mint', featured: true },
  { id: 'c11', name: 'Rayquaza VMAX', set: 'Evolving Skies', setCode: 'EVS-218', year: 2021, img: IMG('swsh7', 218), type: 'Dragon', rarity: 'Alt Art Secret', price: 3025, grade: { grader: 'PSA', score: 10, cert: 'PSA-83110511', pop: 6230 }, seller: 'skyhigh', condition: 'Gem Mint' },
  { id: 'c12', name: 'Charizard VMAX Shiny', set: 'Shining Fates', setCode: 'SHF-SV107', year: 2021, img: IMG('swsh45sv', 'SV107'), type: 'Fire', rarity: 'Shiny Vault', price: 740, grade: { grader: 'CGC', score: 9.5, cert: 'CGC-4090877210', pop: 2010 }, seller: 'vault.rec', condition: 'Mint' },
  { id: 'c13', name: 'Pikachu VMAX', set: 'Vivid Voltage', setCode: 'VIV-44', year: 2020, img: IMG('swsh4', 44), type: 'Lightning', rarity: 'Rare Holo VMAX', price: 72, grade: { grader: 'HOLO Vault', score: 10, cert: 'HV-2026-001204', pop: 9800 }, seller: 'volt.shop', condition: 'Gem Mint' },
  { id: 'c14', name: 'Charizard ex SIR', set: 'Obsidian Flames', setCode: 'OBF-223', year: 2023, img: IMG('sv3', 223), type: 'Darkness', rarity: 'Special Illustration', price: 580, grade: { grader: 'PSA', score: 10, cert: 'PSA-91200377', pop: 12400 }, seller: 'obsidian', condition: 'Gem Mint' },
];

// Histórico de preço determinístico (12 pontos) — simula o "market pulse"
export function priceHistory(card) {
  let seed = [...card.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pts = []; let p = card.price * (0.72 + rnd() * 0.2);
  for (let i = 0; i < 12; i++) { p = p * (1 + (rnd() - 0.45) * 0.12); pts.push(Math.round(p)); }
  pts[11] = card.price; return pts;
}

// Registro de certificados: chave = número do cert (normalizado)
export const registry = new Map(cards.map(c => [c.grade.cert.replace(/\s/g, '').toUpperCase(), {
  cert: c.grade.cert, grader: c.grade.grader, score: c.grade.score, pop: c.grade.pop,
  card: `${c.name} — ${c.set} ${c.setCode}`, cardId: c.id, year: c.year, status: 'ATIVO',
  gradedAt: `${2019 + (c.id.charCodeAt(2) % 7)}-0${1 + (c.id.charCodeAt(2) % 9)}-1${c.id.charCodeAt(2) % 9}`,
}]));
// Um cert revogado, para demonstrar o fluxo de alerta
registry.set('PSA-00000001', { cert: 'PSA-00000001', grader: 'PSA', score: 10, pop: 1, card: 'Charizard — Base Set BS-4', cardId: 'c01', year: 1999, status: 'REVOGADO', gradedAt: '2018-03-02', note: 'Etiqueta clonada detectada em 2024. Não negocie esta carta.' });
