// Tudo que vocês precisam editar fica aqui.

window.CONFIG = {
  // Supabase > Project Settings > API Keys. A publishable key é pública por design.
  // Deixe vazio pra rodar em modo teste (reservas só no navegador).
  supabaseUrl: "https://huudphjocixwzccaqnak.supabase.co",
  supabaseAnonKey: "sb_publishable_E6CBzHHLm95v9OLTil62Ng_DHVrMjs6",

  casal: "Raphael & Deborah",
  titulo: "A casa tá pronta. Os móveis, nem tanto.",
  mensagem: "Chegou a hora! A casa é nossa, mas ainda tá meio vazia. Bora ajudar a encher? Escolhe um presente, reserva com seu nome e manda pro nosso endereço!",
  foto: "img/casal.jpg",
  legenda: "os novos moradores",
  pix: "pix-exemplo@email.com",
  // O endereço não fica aqui: ele vai só por email, configurado no Apps Script (propriedade ENDERECO).

  // Frase da barra de progresso: a partir de qual % aparece
  piadas: [
    [0,  "Ainda dá pra ouvir eco na sala."],
    [30, "Já tem onde sentar. Progresso."],
    [60, "Quase dá pra receber visita sem pedir desculpa."],
    [90, "Casa montada. Agora só falta a gente arrumar."],
  ],

  // id: único e fixo (vai pro banco, não mude depois que alguém reservar)
  // url: link do produto na loja (null = só via Pix)
  // foto: link da imagem do produto (null = mostra a sigla)
  itens: [
    { id: "tv",   comodo: "Sala",    nome: "Smart TV 50\"",       preco: 2499, loja: "Magalu", url: "https://www.magazineluiza.com.br/busca/smart+tv+50/", foto: null, sigla: "TV",
      frase: "Pra parar de ver filme no notebook apoiado na caixa de mudança." },
    { id: "rack", comodo: "Sala",    nome: "Rack para TV",        preco: 450,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=rack+tv", foto: null, sigla: "RK",
      frase: "A TV não pode morar no chão. A gente já mora." },
    { id: "lumi", comodo: "Sala",    nome: "Luminária de chão",   preco: 220,  loja: null,     url: null, foto: null, sigla: "LM",
      frase: "Luz amarelinha pra fingir que a sala tá decorada." },
    { id: "air",  comodo: "Cozinha", nome: "Air fryer",           preco: 399,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=air+fryer", foto: null, sigla: "AF",
      frase: "Promessa de vida saudável. Vai ser usada pra batata." },
    { id: "pan",  comodo: "Cozinha", nome: "Jogo de panelas",     preco: 350,  loja: null,     url: null, foto: null, sigla: "PN",
      frase: "Hoje temos uma panela. Ela faz tudo e está cansada." },
    { id: "cafe", comodo: "Cozinha", nome: "Cafeteira",           preco: 180,  loja: "Magalu", url: "https://www.magazineluiza.com.br/busca/cafeteira/", foto: null, sigla: "CF",
      frase: "Sem café ninguém monta móvel." },
    { id: "cama", comodo: "Quarto",  nome: "Jogo de cama queen",  preco: 260,  loja: null,     url: null, foto: null, sigla: "JC",
      frase: "O lençol atual é de solteiro. A gente se vira." },
    { id: "vent", comodo: "Quarto",  nome: "Ventilador de teto",  preco: 420,  loja: "Amazon", url: "https://www.amazon.com.br/s?k=ventilador+de+teto", foto: null, sigla: "VT",
      frase: "Rio de Janeiro. Precisa explicar?" },
  ],
};
