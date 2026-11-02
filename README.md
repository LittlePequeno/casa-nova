# Casa Nova

Lista de presentes de casa nova. Site estático (GitHub Pages) + Supabase pras reservas + Google Apps Script pros emails. Custo zero.

## Estrutura

```
index.html             página principal
confirmar.html         página que abre pelo botão do email
style.css              visual
app.js                 lógica (lista, reserva, cancelamento)
config.js              <- só edita isso: textos, itens (foto, frase), Pix, endereço
img/casal.jpg          foto de vocês
supabase/schema.sql    banco (1ª vez)
supabase/02_emails.sql banco: email, status e links de confirmação
apps-script/Codigo.gs  rotina diária de emails (roda na sua conta Google)
```

## Fluxo da reserva

1. Convidado clica em "Eu dou esse", coloca nome e email (o navegador lembra pra próxima) e pode marcar "Já comprei".
2. Reserva pendente há 5 dias: sai um email do seu Gmail perguntando se comprou, com botão pra cada item.
3. O botão abre `confirmar.html`, onde a pessoa escolhe "Já comprei" ou "Desisti". Só o clique na página age, então antivírus de email não confirma nada sozinho.
4. Sem resposta em 3 dias: vocês recebem um aviso com nome e email.
5. Mais 1 dia sem resposta: o item volta pra lista e vocês recebem o resumo.

## Segurança

- O site só lê a coluna `item_id`. Nomes, emails e tokens ficam no banco, visíveis só no painel do Supabase.
- Reservar, cancelar e responder passam por funções no banco.
- A Secret key do Supabase fica só nas propriedades do Apps Script. Nunca no site nem no GitHub.
- O script só manda email pra itens que existem no `config.js` do site, no máximo 30 por dia.

## Atualizar o site

```
git add .
git commit -m "atualiza"
git push
```
