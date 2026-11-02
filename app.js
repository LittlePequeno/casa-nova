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
  async headers() {
    const h = { apikey: C.supabaseAnonKey, "Content-Type": "application/json" };
    // chave legada (JWT) também vai no Authorization; a publishable nova só no apikey
    if (C.supabaseAnonKey.startsWith("eyJ")) h.Authorization = `Bearer ${C.supabaseAnonKey}`;
    return h;
  },
  async reservados() {
    const r = await fetch(`${C.supabaseUrl}/rest/v1/reservas?select=item_id`, { headers: await this.headers() });
    if (!r.ok) throw new Error("Não deu pra carregar as reservas.");
    return new Set((await r.json()).map(x => x.item_id));
  },
  async rpc(fn, body) {
    const r = await fetch(`${C.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: await this.headers(), body: JSON.stringify(body) });
    if (!r.ok) throw new Error("Falha na comunicação. Tenta de novo.");
    return r.json();
  },
  reservar(item, nome, token) { return this.rpc("reservar", { p_item: item, p_nome: nome, p_token: token }); },
  cancelar(item, token) { return this.rpc("cancelar", { p_item: item, p_token: token }); },
} : {
  async reservados() { return new Set(Object.keys(ls.get("demoReservas", {}))); },
  async reservar(item, nome) {
    const d = ls.get("demoReservas", {}); if (d[item]) return false;
    d[item] = nome; ls.set("demoReservas", d); return true;
  },
  async cancelar(item) { const d = ls.get("demoReservas", {}); delete d[item]; ls.set("demoReservas", d); return true; },
};

// ---------- estado e render ----------
let reservados = new Set();
let aberto = null;
const fmt = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function erro(msg) { $("erro").textContent = msg || ""; $("erro").hidden = !msg; }

function render() {
  const root = $("rooms"); root.replaceChildren();
  for (const c of C.comodos) {
    const livres = c.itens.filter(i => !reservados.has(i.id)).length;
    const sec = el("section", "room");
    const h = el("div", "room-h"); h.append(el("h2", null, c.nome), el("span", null, `${livres} de ${c.itens.length} disponíveis`));
    const list = el("div", "items");
    for (const i of c.itens) list.append(card(i));
    sec.append(h, list); root.append(sec);
  }
}

function card(i) {
  const res = reservados.has(i.id);
  const art = el("article", "item" + (res ? " reserved" : ""));
  const left = el("div");
  left.append(el("h3", null, i.nome), el("div", "meta", i.url ? `Compra na ${i.loja}` : "Contribuição via Pix"));
  art.append(left, el("div", "price", fmt(i.preco)));

  if (res) {
    const a = el("div", "actions");
    a.append(el("span", "pill", "Reservado"));
    if (meusTokens[i.id]) {
      const b = el("button", "btn", "Cancelar minha reserva"); b.type = "button";
      b.onclick = () => acao(b, async () => {
        await api.cancelar(i.id, meusTokens[i.id]);
        delete meusTokens[i.id]; ls.set("meusTokens", meusTokens);
      });
      a.append(b);
    }
    art.append(a);
  } else if (aberto === i.id) {
    const f = el("form", "form");
    const inp = el("input"); inp.id = `nome-${i.id}`; inp.placeholder = "Seu nome"; inp.required = true; inp.maxLength = 80; inp.autocomplete = "name";
    const ok = el("button", "btn primary", "Confirmar");
    const cancel = el("button", "btn", "Cancelar"); cancel.type = "button";
    cancel.onclick = () => { aberto = null; render(); };
    f.onsubmit = e => {
      e.preventDefault();
      const nome = inp.value.trim(); if (!nome) return;
      acao(ok, async () => {
        const token = novoToken();
        const deu = await api.reservar(i.id, nome, token);
        if (!deu) throw new Error("Alguém reservou esse item agora há pouco.");
        meusTokens[i.id] = token; ls.set("meusTokens", meusTokens); aberto = null;
      });
    };
    f.append(inp, ok, cancel); art.append(f);
    setTimeout(() => inp.focus());
  } else {
    const a = el("div", "actions");
    const b = el("button", "btn primary", "Vou dar esse"); b.type = "button";
    b.onclick = () => { aberto = i.id; erro(); render(); };
    a.append(b);
    if (i.url) { const l = el("a", "btn", "Ver na loja ↗"); l.href = i.url; l.target = "_blank"; l.rel = "noopener"; a.append(l); }
    art.append(a);
  }
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
$("casal").textContent = C.casal;
$("mensagem").textContent = C.mensagem;
$("pixkey").textContent = C.pix;
$("endereco").textContent = C.endereco;
$("copy").onclick = async e => {
  try { await navigator.clipboard.writeText(C.pix); e.target.textContent = "Copiada"; }
  catch { getSelection().selectAllChildren($("pixkey")); e.target.textContent = "Selecionada, copie"; }
  setTimeout(() => (e.target.textContent = "Copiar chave"), 2000);
};
atualizar();
setInterval(() => { if (!aberto) atualizar(); }, 20000); // pega reservas feitas por outras pessoas
