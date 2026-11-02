// Tudo que vocês precisam editar fica aqui.

window.CONFIG = {
  // Supabase > Project Settings > API. A anon key é pública por design (o banco é protegido pelo schema.sql).
  // Deixe vazio pra rodar em modo teste (reservas só no navegador).
  supabaseUrl: "https://huudphjocixwzccaqnak.supabase.co",
  supabaseAnonKey: "sb_publishable_E6CBzHHLm95v9OLTil62Ng_DHVrMjs6",

  casal: "Raphael & Deborah",
  mensagem: "A gente se mudou e ainda falta muita coisa. Se quiser ajudar, escolhe um item e reserva pra ninguém dar repetido, ou manda um Pix de qualquer valor.",
  pix: "pix-exemplo@email.com",
  endereco: "Rua Exemplo, 000, apto 000 · Bairro · Rio de Janeiro, RJ · CEP 00000-000",

  // id: único e fixo (é o que vai pro banco). url: null = item só via Pix.
  comodos: [
    { nome: "Sala", itens: [
      { id: "tv",   nome: "Smart TV 50\"",        preco: 2499, loja: "Magalu", url: "https://www.magazineluiza.com.br/busca/smart+tv+50/" },
      { id: "rack", nome: "Rack para TV",         preco: 450,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=rack+tv" },
      { id: "lumi", nome: "Luminária de chão",    preco: 220,  loja: null,     url: null },
    ]},
    { nome: "Cozinha", itens: [
      { id: "air",  nome: "Air fryer",            preco: 399,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=air+fryer" },
      { id: "pan",  nome: "Jogo de panelas",      preco: 350,  loja: null,     url: null },
      { id: "cafe", nome: "Cafeteira",            preco: 180,  loja: "Magalu", url: "https://www.magazineluiza.com.br/busca/cafeteira/" },
    ]},
    { nome: "Quarto", itens: [
      { id: "cama", nome: "Jogo de cama queen",   preco: 260,  loja: null,     url: null },
      { id: "vent", nome: "Ventilador de teto",   preco: 420,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=ventilador+de+teto" },
    ]},
  ],
};
