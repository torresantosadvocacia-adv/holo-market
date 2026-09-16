# HOLO — marketplace de cartas Pokémon com IA

Projeto acadêmico: e-commerce com chat de suporte consumindo a **API do Gemini** por um backend Node/Express.

## Rodar
```bash
cd holo-market
npm install
cp .env.example .env   # cole sua chave do Google AI Studio em GEMINI_API_KEY
npm start              # http://localhost:3000
```
Sem chave, o site roda em **modo demo** (chat local por palavras-chave). Com chave, o chat, a triagem por foto e a geração de anúncios usam o Gemini (gemini-3.8-flash, com fallback automático para 3.5/2.5).

## Pré-requisitos atendidos
1. **Frontend funcional** — `public/index.html` + `app.js`: campo de texto, botão de envio (evento submit) e `<div id="chat-log">` onde a resposta é injetada.
2. **Backend** — `server.js` (Express) faz a requisição ao Gemini via `fetch`, a chave nunca vai ao navegador.
3. **Variáveis de ambiente** — `.env` na raiz, carregado por `dotenv`.
4. **Controle de versão seguro** — `.gitignore` ignora `.env` e `node_modules`.

## Funcionalidades
- Catálogo com cartas holográficas (tilt 3D + brilho que segue o mouse), filtros, busca e ordenação.
- **Assistente HOLO (Gemini)** que responde e **age na loja**: adiciona/remove do carrinho, abre cartas, filtra, verifica certificados. Nunca finaliza a compra sozinho.
- **Verificador de certificado** (PSA/CGC/BGS/HOLO Vault) com registro, população e detecção de cert revogado. **Cert Match**: compara registro × anúncio (MATCH/MISMATCH).
- **Triagem anti-falsificação por foto** com Gemini Vision (tipografia, holo, bordas, centralização).
- **Veredito de preço** (Boa hora / Justo / Caro) a partir do histórico de 90 dias + selo LOW POP por escassez.
- **Modo vendedor**: anuncie uma carta; a IA escreve a descrição e sugere preço.
- Carrinho com desfazer, frete grátis acima de R$ 500 e checkout simulado.

## Suas fotos das cartas

Solte as imagens em `public/img/cartas/` com o nome do código (`c01.jpg`) ou do nome da carta (`charizard.jpg`).
A lista completa está em `public/img/cartas/LEIA-ME.txt`. Sem reiniciar: recarregue a página.

## Publicar no Render com seu domínio

1. Crie um repositório vazio no GitHub e envie o projeto (o `.env` fica de fora pelo `.gitignore`):
   `git init && git add . && git commit -m "HOLO" && git branch -M main && git remote add origin <url-do-repo> && git push -u origin main`
2. Em render.com → **New → Blueprint** → escolha o repositório. O `render.yaml` cria o serviço.
3. Em **Environment**, cole `GEMINI_API_KEY`. Sem ela o chat fica em modo demo.
4. Em **Settings → Custom Domains → Add**, digite seu domínio. O Render mostra o DNS a criar no seu registrador:
   `www` → registro **CNAME** apontando para `holo-market.onrender.com`; domínio raiz → registro **A** para o IP que o Render exibir.
   O certificado HTTPS é emitido automaticamente em alguns minutos.

Observação: no plano gratuito o disco não persiste. Anúncios criados pelo site somem a cada reinício;
fotos e cartas do catálogo persistem porque vão no repositório.
