# Casa Nova

Lista de presentes de casa nova. Site estático (GitHub Pages) + Supabase pras reservas. Custo zero.

## Estrutura

```
index.html        estrutura da página
style.css         visual
app.js            lógica (render, reserva, cancelamento)
config.js         <- só edita isso: itens, Pix, endereço, chaves do Supabase
supabase/schema.sql   banco: tabela, view pública e funções
```

Sem `supabaseUrl` no `config.js` a página roda em modo teste (reserva só no navegador).

## Como funciona a reserva

- Visitante não acessa a tabela direto. Lê só a coluna `item_id` da tabela (sem nomes nem tokens).
- Reserva via função `reservar()`. `item_id` é chave primária, então dois reservando o mesmo item ao mesmo tempo: só um ganha.
- Quem reserva recebe um token salvo no navegador. Só com ele dá pra cancelar (`cancelar()`).
- Vocês veem os nomes no painel do Supabase: Table Editor > `reservas`. Pra liberar um item, apaga a linha lá.

## Subir

1. **Supabase**: cria projeto grátis em supabase.com > SQL Editor > cola e roda `supabase/schema.sql`.
2. Em Project Settings > API, copia a **Project URL** e a **anon public key** pro `config.js`.
3. **GitHub**:
   ```bash
   git init && git add . && git commit -m "casa nova"
   gh repo create casa-nova --public --source=. --push
   ```
4. No repo: Settings > Pages > Deploy from branch > `main` / root. Sai em `https://littlepequeno.github.io/casa-nova/`.

## Rodar local

```bash
python -m http.server 8000
```

## Observações

- A anon key é pública por design. A segurança está no `schema.sql` (RLS sem policies + funções).
- Projeto free do Supabase pausa após 7 dias sem uso. Com a lista circulando não pausa; se pausar, é só reativar no painel.
- Não muda o `id` de um item depois que alguém reservou, senão a reserva some da tela.
