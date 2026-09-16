// Configura a chave do Gemini em 20 segundos: pede a chave, testa de verdade, grava no .env e sobe o servidor.
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, a => r(a.trim())));

console.log('\n  HOLO · conexão com o Gemini\n  Pegue sua chave gratuita em: https://aistudio.google.com/apikey\n');
const key = await ask('  Cole a chave e pressione Enter: ');
rl.close();
if (!key) { console.log('  Nenhuma chave informada.'); process.exit(1); }

process.stdout.write('  Testando a chave no Gemini… ');
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
let okModel = null, lastErr = '';
for (const m of MODELS) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responda apenas: ok' }] }], generationConfig: { maxOutputTokens: 5 } }),
  });
  if (res.ok) { okModel = m; break; }
  const d = await res.json().catch(() => ({}));
  lastErr = `${res.status} ${d.error?.message || ''}`;
  if (res.status === 400 || res.status === 403) break; // chave inválida: não adianta tentar outros modelos
}
if (!okModel) { console.log('FALHOU\n  Erro: ' + lastErr + '\n  Confira se copiou a chave inteira e se a API está ativada na conta.'); process.exit(1); }
console.log('OK (' + okModel + ')');

const envPath = new URL('.env', import.meta.url);
let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
env = env.match(/^GEMINI_API_KEY=/m) ? env.replace(/^GEMINI_API_KEY=.*$/m, 'GEMINI_API_KEY=' + key) : env + '\nGEMINI_API_KEY=' + key;
env = env.match(/^GEMINI_MODEL=/m) ? env.replace(/^GEMINI_MODEL=.*$/m, 'GEMINI_MODEL=' + okModel) : env + '\nGEMINI_MODEL=' + okModel;
writeFileSync(envPath, env.trim() + '\n');
console.log('  Chave gravada em .env (arquivo ignorado pelo git).');

// Derruba qualquer servidor antigo na porta e sobe o novo
try { const { execSync } = await import('node:child_process'); execSync('lsof -ti:' + (process.env.PORT || 3000) + ' | xargs kill 2>/dev/null', { stdio: 'ignore' }); } catch {}
console.log('  Subindo o servidor com IA ativa…\n');
spawn(process.execPath, ['server.js'], { stdio: 'inherit', cwd: new URL('.', import.meta.url).pathname });
