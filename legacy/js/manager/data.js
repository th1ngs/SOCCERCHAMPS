// Dados fixos: clubes, nomes, posições, formações e narração.
(function (M) {
  // Clubes fictícios. rep = reputação (0-100), cap = capacidade do estádio.
  M.CLUBS = [
    { id: 'guanabara', name: 'Guanabara FC', short: 'GUA', city: 'Rio de Janeiro', uf: 'RJ', colors: ['#c8102e', '#111111'], pattern: 'h', rep: 88, cap: 72000 },
    { id: 'bandeirantes', name: 'Bandeirantes EC', short: 'BAN', city: 'São Paulo', uf: 'SP', colors: ['#f2f2f2', '#111111'], pattern: 'sash', rep: 87, cap: 62000 },
    { id: 'paulistano', name: 'Paulistano FC', short: 'PAU', city: 'São Paulo', uf: 'SP', colors: ['#0b8a3e', '#ffffff'], pattern: 'solid', rep: 85, cap: 45000 },
    { id: 'alvorada', name: 'Alvorada Atlético', short: 'ALV', city: 'Belo Horizonte', uf: 'MG', colors: ['#111111', '#f2f2f2'], pattern: 'v', rep: 84, cap: 60000 },
    { id: 'farroupilha', name: 'Farroupilha FC', short: 'FAR', city: 'Porto Alegre', uf: 'RS', colors: ['#1e5aa8', '#111111'], pattern: 'v', rep: 83, cap: 55000 },
    { id: 'carioca', name: 'Carioca AC', short: 'CAR', city: 'Rio de Janeiro', uf: 'RJ', colors: ['#7a1030', '#1d6b3a'], pattern: 'v', rep: 80, cap: 46000 },
    { id: 'tubaroes', name: 'Tubarões FC', short: 'TUB', city: 'Santos', uf: 'SP', colors: ['#f2f2f2', '#111111'], pattern: 'solid', rep: 78, cap: 18000 },
    { id: 'pinhais', name: 'Pinhais EC', short: 'PIN', city: 'Curitiba', uf: 'PR', colors: ['#b3001b', '#111111'], pattern: 'half', rep: 77, cap: 42000 },
    { id: 'mare', name: 'Maré Alta SC', short: 'MAR', city: 'Salvador', uf: 'BA', colors: ['#d61f26', '#1c3f94'], pattern: 'h', rep: 76, cap: 50000 },
    { id: 'sertao', name: 'Unidos do Sertão', short: 'SER', city: 'Recife', uf: 'PE', colors: ['#d61f26', '#111111'], pattern: 'h', rep: 75, cap: 45000 },
    { id: 'canarinho', name: 'Canarinho EC', short: 'CAN', city: 'Fortaleza', uf: 'CE', colors: ['#f4c20d', '#1c3f94'], pattern: 'solid', rep: 74, cap: 60000 },
    { id: 'cerrado', name: 'Real Cerrado', short: 'CER', city: 'Goiânia', uf: 'GO', colors: ['#0e7a3a', '#ffffff'], pattern: 'v', rep: 72, cap: 40000 },
    { id: 'litoral', name: 'Atlético Litoral', short: 'LIT', city: 'Florianópolis', uf: 'SC', colors: ['#1f8f3a', '#ffffff'], pattern: 'half', rep: 70, cap: 20000 },
    { id: 'leoes', name: 'Leões da Serra', short: 'LEO', city: 'Caxias do Sul', uf: 'RS', colors: ['#7a1f1f', '#ffffff'], pattern: 'sash', rep: 70, cap: 25000 },
    { id: 'estrela', name: 'Estrela do Norte', short: 'EST', city: 'Belém', uf: 'PA', colors: ['#1a4fa0', '#ffffff'], pattern: 'h', rep: 69, cap: 45000 },
    { id: 'capixaba', name: 'Operário Capixaba', short: 'OPE', city: 'Vitória', uf: 'ES', colors: ['#111111', '#f4c20d'], pattern: 'v', rep: 66, cap: 22000 },
    { id: 'ferroviario', name: 'Ferroviário Central', short: 'FER', city: 'Campinas', uf: 'SP', colors: ['#8a1538', '#ffffff'], pattern: 'sash', rep: 62, cap: 20000 },
    { id: 'juventude', name: 'Juventude do Vale', short: 'JUV', city: 'São José dos Campos', uf: 'SP', colors: ['#1c7a3a', '#ffffff'], pattern: 'v', rep: 60, cap: 16000 },
    { id: 'araucaria', name: 'Araucária FC', short: 'ARA', city: 'Londrina', uf: 'PR', colors: ['#0f5132', '#f4c20d'], pattern: 'solid', rep: 58, cap: 30000 },
    { id: 'potiguar', name: 'Potiguar SC', short: 'POT', city: 'Natal', uf: 'RN', colors: ['#d61f26', '#ffffff'], pattern: 'h', rep: 57, cap: 30000 },
    { id: 'metropole', name: 'Metrópole FC', short: 'MET', city: 'Brasília', uf: 'DF', colors: ['#1a4fa0', '#f4c20d'], pattern: 'h', rep: 56, cap: 70000 },
    { id: 'pantanal', name: 'Pantanal EC', short: 'PAN', city: 'Cuiabá', uf: 'MT', colors: ['#f4c20d', '#0e7a3a'], pattern: 'v', rep: 55, cap: 40000 },
    { id: 'manauara', name: 'Manauara FC', short: 'MAN', city: 'Manaus', uf: 'AM', colors: ['#f28c00', '#1b3a6b'], pattern: 'half', rep: 54, cap: 40000 },
    { id: 'esperanca', name: 'Vila Esperança', short: 'VIL', city: 'Aparecida de Goiânia', uf: 'GO', colors: ['#ffffff', '#d61f26'], pattern: 'sash', rep: 53, cap: 18000 },
    { id: 'chapada', name: 'Chapada FC', short: 'CHA', city: 'Lages', uf: 'SC', colors: ['#0e7a3a', '#ffffff'], pattern: 'h', rep: 52, cap: 15000 },
    { id: 'alagoano', name: 'Alagoano FC', short: 'ALA', city: 'Maceió', uf: 'AL', colors: ['#1a4fa0', '#ffffff'], pattern: 'v', rep: 51, cap: 20000 },
    { id: 'ouropreto', name: 'Ouro Preto AC', short: 'OUR', city: 'Ouro Preto', uf: 'MG', colors: ['#c9a227', '#111111'], pattern: 'v', rep: 50, cap: 12000 },
    { id: 'paraibano', name: 'Paraibano SC', short: 'PAR', city: 'João Pessoa', uf: 'PB', colors: ['#111111', '#d61f26'], pattern: 'v', rep: 50, cap: 25000 },
    { id: 'maranhense', name: 'Maranhense EC', short: 'MRH', city: 'São Luís', uf: 'MA', colors: ['#d61f26', '#111111'], pattern: 'half', rep: 49, cap: 40000 },
    { id: 'serrano', name: 'Serrano FC', short: 'SRR', city: 'Petrópolis', uf: 'RJ', colors: ['#1a4fa0', '#d61f26'], pattern: 'h', rep: 47, cap: 15000 },
    { id: 'missoes', name: 'Missões FC', short: 'MIS', city: 'Santo Ângelo', uf: 'RS', colors: ['#0e5aa8', '#ffffff'], pattern: 'half', rep: 46, cap: 10000 },
    { id: 'tocantins', name: 'Tocantins FC', short: 'TOC', city: 'Palmas', uf: 'TO', colors: ['#f28c00', '#ffffff'], pattern: 'solid', rep: 45, cap: 12000 },
  ];

  M.FIRST = ('Gabriel Lucas Mateus Pedro João Rafael Gustavo Felipe Bruno Thiago Diego Vinícius Rodrigo Leonardo Caio Daniel ' +
    'André Eduardo Marcelo Ricardo Fernando Henrique Igor Kaique Luan Murilo Nathan Otávio Paulo Renan Samuel Talles Vitor ' +
    'Wesley Yuri Arthur Davi Enzo Heitor Miguel Bernardo Luiz Carlos Alex Everton Roger Fábio Marcos Júlio Wellington Jefferson ' +
    'Anderson Cléber Douglas Elias Hugo Ítalo Jonas Kauan Lorenzo Nicolas Pablo Ramon Sérgio Tiago William Alan Breno Cauã ' +
    'Danilo Emerson Fabrício Gilberto Iago Jean Kléber Lucca Maicon Nilton Oscar Pietro Rian Saulo Vagner Yago Wanderson ' +
    'Joaquim Benício Raul Gilson Cristian Adriano Rômulo Ezequiel Matías Santiago Facundo').split(' ');
  M.LAST = ('Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gomes Costa Ribeiro Martins Carvalho Almeida ' +
    'Lopes Soares Fernandes Vieira Barbosa Rocha Dias Nascimento Andrade Moreira Nunes Marques Machado Mendes Freitas Cardoso ' +
    'Ramos Gonçalves Santana Teixeira Araújo Pinto Moura Cavalcanti Batista Correia Campos Duarte Farias Monteiro Reis ' +
    'Tavares Xavier Queiroz Brandão Bezerra Cunha Pires Rezende Siqueira Toledo Assis Prado Guimarães Leite Macedo Sales ' +
    'Paiva Aguiar Bastos Fonseca Coelho Peixoto Lacerda Medeiros').split(' ');
  M.NICK = ('Pedrinho Juninho Dudu Tinga Paulinho Careca Gaúcho Cearense Mineiro Magrão Bigode Tanque Foguete Formiga ' +
    'Canhoto Chiquinho Toninho Marquinhos Didi Nenê Baiano Pernambuco Zé Rafa Guga Kaká Léo Gui Biel Vini Dedé Neto Serginho ' +
    'Fernandinho Luizinho Carlinhos Betinho Nando Tuta Índio').split(' ');

  // Posições e seu papel em cada setor do campo.
  M.POS = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  M.POS_NAME = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };
  M.SECTOR = {
    GOL: {},
    ZAG: { d: 1 },
    LAT: { d: 0.7, m: 0.2, a: 0.1 },
    VOL: { d: 0.45, m: 0.55 },
    MEI: { m: 0.7, a: 0.3 },
    ATA: { a: 1, m: 0.1 },
  };

  // Rendimento de um jogador fora da posição de origem.
  const NEAR = { 'ZAG-LAT': 0.88, 'ZAG-VOL': 0.86, 'LAT-MEI': 0.84, 'LAT-VOL': 0.85, 'VOL-MEI': 0.92, 'MEI-ATA': 0.88, 'VOL-ATA': 0.72 };
  M.fit = (natural, slot) => {
    if (natural === slot) return 1;
    if (natural === 'GOL' || slot === 'GOL') return 0.35;
    return NEAR[natural + '-' + slot] || NEAR[slot + '-' + natural] || 0.68;
  };

  // Formações: x = 0 (próprio gol) → 100 (gol adversário); y = 0 (esquerda) → 100 (direita).
  const S = (pos, x, y) => ({ pos, x, y });
  M.FORMATIONS = {
    '4-4-2': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 16), S('VOL', 45, 40), S('VOL', 45, 60), S('MEI', 52, 84), S('ATA', 74, 40), S('ATA', 74, 60)],
    '4-3-3': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 50), S('MEI', 52, 30), S('MEI', 52, 70), S('ATA', 74, 16), S('ATA', 80, 50), S('ATA', 74, 84)],
    '4-2-3-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 38), S('VOL', 40, 62), S('MEI', 60, 16), S('MEI', 60, 50), S('MEI', 60, 84), S('ATA', 80, 50)],
    '3-5-2': [S('GOL', 5, 50), S('ZAG', 20, 26), S('ZAG', 18, 50), S('ZAG', 20, 74), S('LAT', 45, 10), S('VOL', 40, 50), S('MEI', 54, 32), S('MEI', 54, 68), S('LAT', 45, 90), S('ATA', 75, 40), S('ATA', 75, 60)],
    '5-3-2': [S('GOL', 5, 50), S('LAT', 30, 10), S('ZAG', 20, 30), S('ZAG', 18, 50), S('ZAG', 20, 70), S('LAT', 30, 90), S('VOL', 42, 50), S('MEI', 52, 28), S('MEI', 52, 72), S('ATA', 75, 40), S('ATA', 75, 60)],
    '4-5-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 12), S('VOL', 42, 36), S('VOL', 42, 64), S('MEI', 56, 50), S('MEI', 52, 88), S('ATA', 78, 50)],
  };

  M.TACTICS = {
    def: { name: 'Defensivo', att: 0.9, def: 1.1, fatigue: 0.9 },
    bal: { name: 'Equilibrado', att: 1, def: 1, fatigue: 1 },
    att: { name: 'Ofensivo', att: 1.1, def: 0.9, fatigue: 1.1 },
    press: { name: 'Pressão alta', att: 1.06, def: 0.97, fatigue: 1.3, mid: 1.06 },
  };

  M.TRAINING = {
    low: { name: 'Leve', recover: 34, dev: 0.75, injury: 0.7 },
    mid: { name: 'Normal', recover: 28, dev: 1, injury: 1 },
    high: { name: 'Intenso', recover: 22, dev: 1.35, injury: 1.5 },
  };

  // Narração
  M.TXT = {
    kickoff: ['Rola a bola! Começa o jogo.', 'Apita o árbitro, bola rolando!'],
    half: ['Fim do primeiro tempo.', 'O árbitro apita o intervalo.'],
    second: ['Começa o segundo tempo!', 'Bola rolando para a etapa final.'],
    full: ['Fim de jogo!', 'Apita o árbitro. Acabou!'],
    goal: ['GOOOOL! {p} manda para o fundo da rede!', 'GOL! {p} não perdoa e marca para o {t}!', 'É GOL! Que finalização de {p}!', 'GOOOL do {t}! {p} bate firme e marca!', 'Golaço de {p}! A torcida do {t} vai à loucura!'],
    assist: [' Passe de {a}.', ' Assistência de {a}.', ' Belo cruzamento de {a}.', ' Lançamento perfeito de {a}.'],
    save: ['Defesaça de {g}! {p} parou no goleiro.', '{p} finaliza e {g} espalma.', '{g} voa e salva o {t}!', 'Chute de {p}, {g} segura firme.'],
    miss: ['{p} chuta por cima do gol.', 'Tirou tinta da trave! {p} quase marca.', '{p} bate cruzado, para fora.', 'Na trave! {p} fica no quase.', '{p} arrisca de longe, sem direção.'],
    block: ['A zaga bloqueia o chute de {p}.', '{p} tenta, mas a defesa trava.'],
    build: ['{t} troca passes no campo de ataque.', '{p} avança pela ponta.', '{t} pressiona a saída de bola.', '{p} tenta o drible e perde.', '{t} gira a bola procurando espaço.', 'Bola longa do {t}, a zaga afasta.'],
    foul: ['Falta de {p}.', '{p} chega atrasado e comete falta.'],
    yellow: ['Cartão amarelo para {p}.', '{p} recebe o amarelo.'],
    red: ['CARTÃO VERMELHO! {p} está expulso!', 'Segundo amarelo para {p}. Expulso!'],
    penalty: ['PÊNALTI para o {t}! {p} vai para a cobrança.'],
    penGoal: ['{p} cobra e converte!'],
    penMiss: ['{p} cobra e {g} defende o pênalti!', '{p} isola a cobrança!'],
    injury: ['{p} sente a lesão e pede atendimento.'],
    sub: ['Substituição no {t}: sai {o}, entra {p}.'],
    corner: ['Escanteio para o {t}.'],
  };
  M.say = (key, vars) => {
    let s = M.U.pick(M.TXT[key]);
    for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
})(window.SCM);
