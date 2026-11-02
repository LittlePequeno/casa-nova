/**
 * Casa Nova: rotina diária de confirmação das reservas.
 * Roda no Google Apps Script da sua conta e envia emails pelo seu Gmail.
 *
 * Configuração (Projeto > Configurações > Propriedades do script):
 *   SUPABASE_URL     https://huudphjocixwzccaqnak.supabase.co
 *   SUPABASE_SECRET  sua Secret key do Supabase (sb_secret_...). Nunca coloque no site.
 *   SITE_URL         https://littlepequeno.github.io/casa-nova
 *   EMAIL_CASAL      emails que recebem os avisos, separados por vírgula
 *   ENDERECO         endereço de entrega completo (só existe aqui, não vai pro site)
 *
 * Depois rode a função instalar() uma vez.
 */

const DIAS_ATE_EMAIL = 5;   // reserva pendente há X dias: manda o email pra pessoa
const DIAS_ATE_AVISO = 3;   // email sem resposta há X dias: avisa vocês
const DIAS_ATE_LIBERAR = 1; // aviso feito há X dias e ainda sem resposta: libera o item
const ASSINATURA = "Raphael & Deborah";
const MAX_EMAILS_POR_DIA = 30; // trava de segurança

// ---------- entrada ----------

/** A cada 30 minutos: manda o endereço pra quem acabou de reservar. */
function rodarRapido() {
  enviarEnderecos_();
}

/** Uma vez por dia: confirmações, avisos e liberações. */
function rodar() {
  enviarConfirmacoes_();
  avisarCasal_();
  liberarExpiradas_();
}

function instalar() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("rodar").timeBased().everyDays(1).atHour(10).inTimezone("America/Sao_Paulo").create();
  ScriptApp.newTrigger("rodarRapido").timeBased().everyMinutes(30).create();
  Logger.log("Agendado: endereços a cada 30 min, confirmações todo dia às 10h.");
}

/** Manda pra vocês um exemplo do email que os convidados recebem. */
function testarEmail() {
  const p = cfg_();
  const exemplo = [{ nome: "Fulano", item_nome: "Air fryer", link_token: "exemplo" }];
  enviarPara_(p.casal.split(",")[0].trim(), exemplo);
  Logger.log("Email de teste enviado.");
}

// ---------- etapas ----------

function enviarEnderecos_() {
  const validos = idsDoSite_();
  const linhas = sb_("get", "reservas?select=item_id,item_nome,nome,email&endereco_enviado_em=is.null&email=not.is.null")
    .filter(r => validos.has(r.item_id))
    .slice(0, MAX_EMAILS_POR_DIA);
  const porEmail = {};
  linhas.forEach(r => (porEmail[r.email] = porEmail[r.email] || []).push(r));
  Object.keys(porEmail).forEach(email => {
    const itens = porEmail[email];
    enviarEndereco_(email, itens);
    marcar_(itens, { endereco_enviado_em: new Date().toISOString() });
  });
  if (linhas.length) Logger.log(`Endereços enviados: ${linhas.length} itens.`);
}

function enviarConfirmacoes_() {
  // Só itens que existem na lista do site: ninguém usa a função de reserva pra disparar email do seu Gmail pra terceiros.
  const validos = idsDoSite_();
  const linhas = sb_("get", `reservas?select=item_id,item_nome,nome,email,link_token&status=eq.pendente&email_enviado_em=is.null&email=not.is.null&criado_em=lt.${diasAtras_(DIAS_ATE_EMAIL)}`)
    .filter(r => validos.has(r.item_id))
    .slice(0, MAX_EMAILS_POR_DIA);
  const porEmail = {};
  linhas.forEach(r => (porEmail[r.email] = porEmail[r.email] || []).push(r));
  Object.keys(porEmail).forEach(email => {
    const itens = porEmail[email];
    enviarPara_(email, itens);
    marcar_(itens, { email_enviado_em: new Date().toISOString() });
  });
  if (linhas.length) Logger.log(`Confirmações enviadas: ${linhas.length} itens.`);
}

function avisarCasal_() {
  const linhas = sb_("get", `reservas?select=item_id,item_nome,nome,email&status=eq.pendente&aviso_enviado_em=is.null&email_enviado_em=lt.${diasAtras_(DIAS_ATE_AVISO)}`);
  if (!linhas.length) return;
  const lista = linhas.map(r => `- ${r.item_nome || r.item_id}: ${r.nome} (${r.email})`).join("\n");
  GmailApp.sendEmail(cfg_().casal, `Casa Nova: ${linhas.length} reserva(s) sem resposta`,
    `Essas reservas não responderam o email de confirmação:\n\n${lista}\n\n` +
    `Se ninguém responder até amanhã, os itens voltam pra lista. Vale mandar um zap antes.`);
  marcar_(linhas, { aviso_enviado_em: new Date().toISOString() });
}

function liberarExpiradas_() {
  const linhas = sb_("get", `reservas?select=item_id,item_nome,nome,email&status=eq.pendente&aviso_enviado_em=lt.${diasAtras_(DIAS_ATE_LIBERAR)}`);
  if (!linhas.length) return;
  sb_("delete", `reservas?item_id=${emLista_(linhas)}&status=eq.pendente`);
  const lista = linhas.map(r => `- ${r.item_nome || r.item_id} (era de ${r.nome})`).join("\n");
  GmailApp.sendEmail(cfg_().casal, `Casa Nova: ${linhas.length} item(ns) liberado(s)`,
    `Esses itens voltaram pra lista por falta de resposta:\n\n${lista}`);
}

// ---------- emails do convidado ----------

function enviarEndereco_(email, itens) {
  const p = cfg_();
  const primeiroNome = String(itens[0].nome).split(" ")[0];
  const nomes = itens.map(i => i.item_nome || i.item_id);
  const listaTxt = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

  const texto =
    `Oi, ${primeiroNome}!\n\n` +
    `Valeu por reservar ${listaTxt}! Segue o endereço pra entrega:\n\n${p.endereco}\n\n` +
    `É só usar esse endereço no checkout da loja.\n\n${ASSINATURA}`;

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2b2420;max-width:520px">` +
    `<p>Oi, ${esc_(primeiroNome)}!</p>` +
    `<p>Valeu por reservar <b>${esc_(listaTxt)}</b>! Segue o endereço pra entrega:</p>` +
    `<p style="background:#f6efe4;border-left:4px solid #3f5e3a;padding:12px 16px;border-radius:8px">${esc_(p.endereco).replace(/\n/g, "<br>")}</p>` +
    `<p>É só usar esse endereço no checkout da loja.</p>` +
    `<p>${ASSINATURA}</p></div>`;

  GmailApp.sendEmail(email, "Chá de casa nova Raphael & Deborah: endereço de entrega", texto, { htmlBody: html, name: ASSINATURA });
}

function enviarPara_(email, itens) {
  const p = cfg_();
  const primeiroNome = String(itens[0].nome).split(" ")[0];
  const nomes = itens.map(i => i.item_nome || i.item_id);
  const listaTxt = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  const link = i => `${p.site}/confirmar.html?t=${encodeURIComponent(i.link_token)}`;

  const texto =
    `Oi, ${primeiroNome}!\n\n` +
    `Eu e Deborah adoramos que você reservou ${listaTxt}! Vai nos ajudar à beça!\n\n` +
    `Só pra gente se organizar: você realmente efetuou a compra? Dessa forma mantemos tudo atualizado e marcado certinho lá no site!\n\n` +
    itens.map(i => `${i.item_nome || i.item_id}: ${link(i)}`).join("\n") +
    `\n\nSe não der notícia em alguns dias, o item volta pra lista.\n\n${ASSINATURA}`;

  const botoes = itens.map(i =>
    `<p style="margin:0 0 10px"><a href="${link(i)}" style="display:inline-block;background:#3f5e3a;color:#fffaf2;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:99px">Responder sobre ${esc_(i.item_nome || i.item_id)}</a></p>`
  ).join("");

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2b2420;max-width:520px">` +
    `<p>Oi, ${esc_(primeiroNome)}!</p>` +
    `<p>Eu e Deborah adoramos que você reservou <b>${esc_(listaTxt)}</b>! Vai nos ajudar à beça!</p>` +
    `<p>Só pra gente se organizar: você realmente efetuou a compra? Dessa forma mantemos tudo atualizado e marcado certinho lá no site!</p>` +
    botoes +
    `<p style="color:#6f6158;font-size:14px">Se não der notícia em alguns dias, o item volta pra lista.</p>` +
    `<p>${ASSINATURA}</p></div>`;

  GmailApp.sendEmail(email, "Chá de casa nova Raphael & Deborah: confirmação do presente", texto, { htmlBody: html, name: ASSINATURA });
}

// ---------- utilitários ----------

function cfg_() {
  const props = PropertiesService.getScriptProperties();
  const c = {
    url: props.getProperty("SUPABASE_URL"),
    key: props.getProperty("SUPABASE_SECRET"),
    site: (props.getProperty("SITE_URL") || "").replace(/\/$/, ""),
    casal: props.getProperty("EMAIL_CASAL"),
    endereco: props.getProperty("ENDERECO"),
  };
  Object.keys(c).forEach(k => { if (!c[k]) throw new Error(`Falta a propriedade do script: ${k}`); });
  return c;
}

function sb_(method, path, body) {
  const c = cfg_();
  const headers = { apikey: c.key, Prefer: "return=representation" };
  if (c.key.startsWith("eyJ")) headers.Authorization = `Bearer ${c.key}`;
  const res = UrlFetchApp.fetch(`${c.url}/rest/v1/${path}`, {
    method, headers, contentType: "application/json",
    payload: body ? JSON.stringify(body) : undefined, muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code >= 300) throw new Error(`Supabase ${code}: ${res.getContentText()}`);
  const txt = res.getContentText();
  return txt ? JSON.parse(txt) : [];
}

function idsDoSite_() {
  const res = UrlFetchApp.fetch(`${cfg_().site}/config.js`, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error("Não consegui ler o config.js do site.");
  const ids = new Set();
  res.getContentText().replace(/\bid:\s*"([^"]+)"/g, (_, id) => ids.add(id));
  return ids;
}

function marcar_(linhas, campos) {
  sb_("patch", `reservas?item_id=${emLista_(linhas)}`, campos);
}

function emLista_(linhas) {
  return encodeURIComponent(`in.(${linhas.map(r => `"${r.item_id}"`).join(",")})`);
}

function diasAtras_(n) {
  return encodeURIComponent(new Date(Date.now() - n * 86400000).toISOString());
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
