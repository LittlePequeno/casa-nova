const C = window.CONFIG;
const ONLINE = Boolean(C.supabaseUrl && C.supabaseAnonKey);

// ---------- armazenamento local (tokens de quem reservou neste navegador) ----------
const ls = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let meusTokens = ls.get("meusTokens", {}); // { item_id: token }

const novoToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");

// ---------- camada de dados: Supabase (REST) ou modo teste ----------
const api = ONLINE ? {
  headers() {
    const h = { apikey: C.supabaseAnonKey, "Content-Type": "application/json" };
    // chave legada (JWT) também vai no Authorization; a publishable nova só no apikey
    if (C.supabaseAnonKey.startsWith("eyJ")) h.Authorization = `Bearer ${C.supabaseAnonKey}`;
    return h;
  },
  async reservados() {
    const r = await fetch(`${C.supabaseUrl}/rest/v1/reservas?select=item_id`, { headers: this.headers() });
    if (!r.ok) throw new Error("Não deu pra carregar as reservas. Recarrega a página.");
    return new Set((await r.json()).map(x => x.item_id));
  },
  async rpc(fn, body) {
    const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Falha na comunicação. Tenta de novo.");
    return r.json();
  },
  reservar(item, r) {
    return this.rpc("reservar", { p_item: item.id, p_item_nome: item.nome, p_nome: r.nome, p_email: r.email, p_token: r.token, p_comprado: r.comprado });
  },
  cancelar(item, token) { return this.rpc("cancelar", { p_item: item, p_token: token }); },
} : {
  async reservados() { return new Set(Object.keys(ls.get("demoReservas", {}))); },
  async reservar({ id: item }, { nome }) {
    const d = ls.get("demoReservas", {}); if (d[item]) return false;
    d[item] = nome; ls.set("demoReservas", d); return true;
  },
  async cancelar(item) { const d = ls.get("demoReservas", {}); delete d[item]; ls.set("demoReservas", d); return true; },
};

// ---------- estado e render ----------
let reservados = new Set();
let aberto = null;
let filtro = "Tudo";
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function erro(msg) { $("erro").textContent = msg || ""; $("erro").hidden = !msg; }

function render() {
  // filtros por cômodo
  const comodos = ["Tudo", ...new Set(C.itens.map(i => i.comodo))];
  $("filters").replaceChildren(...comodos.map(c => {
    const b = el("button", null, c); b.type = "button"; b.setAttribute("aria-pressed", c === filtro);
    b.onclick = () => { filtro = c; render(); };
    return b;
  }));

  // grade
  $("grid").replaceChildren(...C.itens.filter(i => filtro === "Tudo" || i.comodo === filtro).map(card));

  // progresso
  const total = C.itens.length;
  const feitos = C.itens.filter(i => reservados.has(i.id)).length;
  const pct = total ? Math.round(feitos / total * 100) : 0;
  $("pct").textContent = pct + "%";
  $("fill").style.width = pct + "%";
  $("count").textContent = `${feitos} de ${total} presentes`;
  $("joke").textContent = (C.piadas.filter(p => pct >= p[0]).pop() || [0, ""])[1];
}

function card(i) {
  const res = reservados.has(i.id);
  const art = el("article", "card" + (res ? " taken" : ""));

  const thumb = el("div", "thumb");
  if (i.foto) { const img = el("img"); img.src = i.foto; img.alt = i.nome; img.loading = "lazy"; thumb.append(img); }
  else thumb.textContent = i.sigla || i.nome.slice(0, 2).toUpperCase();

  const body = el("div", "body");
  body.append(el("div", "room", i.comodo), el("h3", null, i.nome), el("p", "quip", i.frase || ""));
  const row = el("div", "row");
  row.append(el("span", "price", fmt(i.preco)));
  body.append(row);

  if (res) {
    row.append(el("span", "stamp", "esse já está reservado!"));
    if (meusTokens[i.id]) {
      const b = el("button", "btn ghost", "Cancelar minha reserva"); b.type = "button";
      b.onclick = () => acao(b, async () => {
        await api.cancelar(i.id, meusTokens[i.id]);
        delete meusTokens[i.id]; ls.set("meusTokens", meusTokens);
      });
      body.append(b);
    }
  } else if (aberto === i.id) {
    const visitante = ls.get("visitante", {});
    const f = el("form", "form");
    const nome = el("input"); nome.id = `nome-${i.id}`; nome.placeholder = "Seu nome"; nome.required = true; nome.maxLength = 80; nome.autocomplete = "name"; nome.value = visitante.nome || "";
    const email = el("input"); email.id = `email-${i.id}`; email.type = "email"; email.placeholder = "Seu email"; email.required = true; email.maxLength = 120; email.autocomplete = "email"; email.value = visitante.email || "";
    const lbl = el("label", "check");
    const chk = el("input"); chk.type = "checkbox"; chk.id = `comprei-${i.id}`;
    lbl.append(chk, document.createTextNode(" Já comprei"));
    const nota = el("p", "nota", visitante.email ? "" : "O email é só pra nossa organização: se você não marcar \"Já comprei\", em alguns dias a gente manda um oi pra confirmar. Sem spam, prometido.");
    nota.hidden = !nota.textContent;
    const ok = el("button", "btn", "Reservar");
    const cancel = el("button", "btn ghost", "Voltar"); cancel.type = "button";
    cancel.onclick = () => { aberto = null; render(); };
    f.onsubmit = e => {
      e.preventDefault();
      const r = { nome: nome.value.trim(), email: email.value.trim(), comprado: chk.checked, token: novoToken() };
      if (!r.nome || !email.checkValidity()) return;
      ls.set("visitante", { nome: r.nome, email: r.email });
      acao(ok, async () => {
        const deu = await api.reservar(i, r);
        if (!deu) throw new Error("Alguém reservou esse item agora há pouco.");
        meusTokens[i.id] = r.token; ls.set("meusTokens", meusTokens); aberto = null;
      });
    };
    const btns = el("div", "actions"); btns.append(ok, cancel);
    f.append(nome, email, lbl, nota, btns); body.append(f);
    setTimeout(() => (visitante.nome ? ok : nome).focus());
  } else {
    const a = el("div", "actions");
    const b = el("button", "btn", "Eu dou esse"); b.type = "button";
    b.onclick = () => { aberto = i.id; erro(); render(); };
    a.append(b);
    if (i.url) { const l = el("a", "btn ghost", `Ver na ${i.loja || "loja"}`); l.href = i.url; l.target = "_blank"; l.rel = "noopener"; a.append(l); }
    body.append(a);
  }

  art.append(thumb, body);
  return art;
}

async function acao(btn, fn) {
  btn.disabled = true; erro();
  try { await fn(); } catch (e) { erro(e.message); aberto = null; }
  await atualizar();
}

async function atualizar() {
  try { reservados = await api.reservados(); erro(); }
  catch (e) { erro(e.message); }
  render();
}

// ---------- init ----------
$("demo").hidden = ONLINE;
$("titulo").textContent = C.titulo;
$("mensagem").textContent = C.mensagem;
$("casal").textContent = C.casal;
$("foto").src = C.foto;
$("legenda").textContent = C.legenda;
$("pixkey").textContent = C.pix;
$("endereco").textContent = C.endereco;
$("copy").onclick = async e => {
  try { await navigator.clipboard.writeText(C.pix); e.target.textContent = "Copiada"; }
  catch { getSelection().selectAllChildren($("pixkey")); e.target.textContent = "Selecionada, copie"; }
  setTimeout(() => (e.target.textContent = "Copiar chave"), 2000);
};
atualizar();
setInterval(() => { if (!aberto) atualizar(); }, 20000); // pega reservas feitas por outras pessoas
