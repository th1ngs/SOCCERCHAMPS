// Dados fixos: clubes, nomes, posições, formações e narração.
import type {
  FormationKey, FormationSlot, Position, SectorWeights, Tactic, TacticKey, TicketPrice, TicketPriceInfo, Trait, TraitKey,
  Training, TrainingKey,
} from './types';
import { pick } from './util';

export type { Position, FormationKey, TacticKey, TrainingKey, TraitKey, TicketPrice } from './types';

// Clubes fictícios (fonte: ./clubs). Ordem = prestígio: os 16 primeiros começam na Série A.
export { CLUBS } from './clubs';

export const FIRST: string[] = ('Gabriel Lucas Mateus Pedro João Rafael Gustavo Felipe Bruno Thiago Diego Vinícius Rodrigo Leonardo Caio Daniel ' +
  'André Eduardo Marcelo Ricardo Fernando Henrique Igor Kaique Luan Murilo Nathan Otávio Paulo Renan Samuel Talles Vitor ' +
  'Wesley Yuri Arthur Davi Enzo Heitor Miguel Bernardo Luiz Carlos Alex Everton Roger Fábio Marcos Júlio Wellington Jefferson ' +
  'Anderson Cléber Douglas Elias Hugo Ítalo Jonas Kauan Lorenzo Nicolas Pablo Ramon Sérgio Tiago William Alan Breno Cauã ' +
  'Danilo Emerson Fabrício Gilberto Iago Jean Kléber Lucca Maicon Nilton Oscar Pietro Rian Saulo Vagner Yago Wanderson ' +
  'Joaquim Benício Raul Gilson Cristian Adriano Rômulo Ezequiel Matías Santiago Facundo').split(' ');
export const LAST: string[] = ('Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gomes Costa Ribeiro Martins Carvalho Almeida ' +
  'Lopes Soares Fernandes Vieira Barbosa Rocha Dias Nascimento Andrade Moreira Nunes Marques Machado Mendes Freitas Cardoso ' +
  'Ramos Gonçalves Santana Teixeira Araújo Pinto Moura Cavalcanti Batista Correia Campos Duarte Farias Monteiro Reis ' +
  'Tavares Xavier Queiroz Brandão Bezerra Cunha Pires Rezende Siqueira Toledo Assis Prado Guimarães Leite Macedo Sales ' +
  'Paiva Aguiar Bastos Fonseca Coelho Peixoto Lacerda Medeiros').split(' ');
export const NICK: string[] = ('Pedrinho Juninho Dudu Tinga Paulinho Careca Gaúcho Cearense Mineiro Magrão Bigode Tanque Foguete Formiga ' +
  'Canhoto Chiquinho Toninho Marquinhos Didi Nenê Baiano Pernambuco Zé Rafa Guga Kaká Léo Gui Biel Vini Dedé Neto Serginho ' +
  'Fernandinho Luizinho Carlinhos Betinho Nando Tuta Índio').split(' ');

// Posições e seu papel em cada setor do campo.
export const POS: Position[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
export const POS_NAME: Record<Position, string> = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };
export const SECTOR: Record<Position, SectorWeights> = {
  GOL: {},
  ZAG: { d: 1 },
  LAT: { d: 0.7, m: 0.2, a: 0.1 },
  VOL: { d: 0.45, m: 0.55 },
  MEI: { m: 0.7, a: 0.3 },
  ATA: { a: 1, m: 0.1 },
};

// Rendimento de um jogador fora da posição de origem.
const NEAR: Record<string, number> = { 'ZAG-LAT': 0.88, 'ZAG-VOL': 0.86, 'LAT-MEI': 0.84, 'LAT-VOL': 0.85, 'VOL-MEI': 0.92, 'MEI-ATA': 0.88, 'VOL-ATA': 0.72 };
export const fit = (natural: Position, slot: Position): number => {
  if (natural === slot) return 1;
  if (natural === 'GOL' || slot === 'GOL') return 0.35;
  return NEAR[natural + '-' + slot] || NEAR[slot + '-' + natural] || 0.68;
};

// Formações: x = 0 (próprio gol) → 100 (gol adversário); y = 0 (esquerda) → 100 (direita).
const S = (pos: Position, x: number, y: number): FormationSlot => ({ pos, x, y });
export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  '4-4-2': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 16), S('VOL', 45, 40), S('VOL', 45, 60), S('MEI', 52, 84), S('ATA', 74, 40), S('ATA', 74, 60)],
  '4-3-3': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 50), S('MEI', 52, 30), S('MEI', 52, 70), S('ATA', 74, 16), S('ATA', 80, 50), S('ATA', 74, 84)],
  '4-2-3-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 38), S('VOL', 40, 62), S('MEI', 60, 16), S('MEI', 60, 50), S('MEI', 60, 84), S('ATA', 80, 50)],
  '3-5-2': [S('GOL', 5, 50), S('ZAG', 20, 26), S('ZAG', 18, 50), S('ZAG', 20, 74), S('LAT', 45, 10), S('VOL', 40, 50), S('MEI', 54, 32), S('MEI', 54, 68), S('LAT', 45, 90), S('ATA', 75, 40), S('ATA', 75, 60)],
  '5-3-2': [S('GOL', 5, 50), S('LAT', 30, 10), S('ZAG', 20, 30), S('ZAG', 18, 50), S('ZAG', 20, 70), S('LAT', 30, 90), S('VOL', 42, 50), S('MEI', 52, 28), S('MEI', 52, 72), S('ATA', 75, 40), S('ATA', 75, 60)],
  '4-5-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 12), S('VOL', 42, 36), S('VOL', 42, 64), S('MEI', 56, 50), S('MEI', 52, 88), S('ATA', 78, 50)],
};
export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[];

export const TACTICS: Record<TacticKey, Tactic> = {
  def: { name: 'Defensivo', att: 0.9, def: 1.1, fatigue: 0.9 },
  bal: { name: 'Equilibrado', att: 1, def: 1, fatigue: 1 },
  att: { name: 'Ofensivo', att: 1.1, def: 0.9, fatigue: 1.1 },
  press: { name: 'Pressão alta', att: 1.06, def: 0.97, fatigue: 1.3, mid: 1.06 },
};

export const TRAINING: Record<TrainingKey, Training> = {
  low: { name: 'Leve', recover: 34, dev: 0.75, injury: 0.7 },
  mid: { name: 'Normal', recover: 28, dev: 1, injury: 1 },
  high: { name: 'Intenso', recover: 22, dev: 1.35, injury: 1.5 },
};

// Narração
export const TXT = {
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
  injury: ['{p} sofre {i} e pede atendimento.', '{p} cai no gramado: parece {i}.'],
  sub: ['Substituição no {t}: sai {o}, entra {p}.'],
  corner: ['Escanteio para o {t}.'],
  derby: ['É CLÁSSICO! {h} e {a} fazem o jogo mais esperado da temporada.', 'Dia de clássico: {h} x {a}. A cidade parou para ver!', 'Rivalidade em campo: {h} contra {a}, estádio lotado e pulsando!'],
  header: ['GOL DE CABEÇA! {p} sobe mais que todo mundo no escanteio e marca para o {t}!', 'Escanteio, cabeçada certeira de {p} e GOL do {t}!'],
  headSave: ['{p} cabeceia firme e {g} faz grande defesa!', 'Cabeçada de {p}, {g} espalma.'],
  headMiss: ['{p} sobe no escanteio e cabeceia por cima.', 'Cabeçada de {p} passa raspando a trave.'],
} satisfies Record<string, string[]>;
export type TxtKey = keyof typeof TXT;

/** Sorteia uma frase de narração e substitui {chaves}. */
export const say = (key: TxtKey, vars?: Record<string, string>): string => {
  let s = pick(TXT[key]);
  for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

// ---------- Características ----------
export const TRAITS: Record<TraitKey, Trait> = {
  finalizacao: { name: 'Finalização', short: 'FIN', desc: 'Chutes mais perigosos (xG × 1,12).' },
  cabeceio: { name: 'Cabeceio', short: 'CAB', desc: 'Ameaça nas bolas aéreas: pode marcar após escanteios.' },
  drible: { name: 'Drible', short: 'DRI', desc: 'Desequilibra no ataque.' },
  passe: { name: 'Passe', short: 'PAS', desc: 'Organiza o meio-campo e dá mais assistências.' },
  velocidade: { name: 'Velocidade', short: 'VEL', desc: 'Arranque que fortalece o ataque.' },
  marcacao: { name: 'Marcação', short: 'MAR', desc: 'Fecha os espaços na defesa.' },
  desarme: { name: 'Desarme', short: 'DES', desc: 'Rouba bolas e fortalece a defesa.' },
  reflexo: { name: 'Reflexo', short: 'REF', desc: 'Goleiro: chutes adversários menos perigosos (xG × 0,9).' },
  lideranca: { name: 'Liderança', short: 'LID', desc: 'Como capitão, dobra o bônus da braçadeira.' },
  resistencia: { name: 'Resistência', short: 'RES', desc: 'Cansa menos durante a partida (× 0,8).' },
};
export const TRAIT_KEYS = Object.keys(TRAITS) as TraitKey[];

/** Pesos para sortear características conforme a posição. */
export const TRAIT_WEIGHTS: Record<Position, Partial<Record<TraitKey, number>>> = {
  GOL: { reflexo: 6, lideranca: 2, passe: 1, resistencia: 1 },
  ZAG: { marcacao: 4, desarme: 3, cabeceio: 4, lideranca: 2, resistencia: 1, velocidade: 1 },
  LAT: { velocidade: 4, resistencia: 3, passe: 2, desarme: 2, drible: 2, marcacao: 1 },
  VOL: { desarme: 4, marcacao: 3, passe: 3, resistencia: 3, lideranca: 2 },
  MEI: { passe: 5, drible: 4, finalizacao: 2, velocidade: 1, lideranca: 1, resistencia: 1 },
  ATA: { finalizacao: 5, drible: 3, velocidade: 3, cabeceio: 3, lideranca: 1 },
};
/** Chance de um jogador gerado ser Craque. */
export const STAR_CHANCE = 0.03;

// ---------- Ingressos ----------
export const TICKET_PRICES: Record<TicketPrice, TicketPriceInfo> = {
  popular: { name: 'Popular', mult: 0.7, occ: +0.12 },
  normal: { name: 'Normal', mult: 1, occ: 0 },
  premium: { name: 'Premium', mult: 1.45, occ: -0.15 },
};

// ---------- Empréstimo bancário ----------
export const LOAN_OPTIONS = [5e6, 10e6, 20e6];
/** Juros totais sobre o principal. */
export const LOAN_INTEREST = 0.12;
export const LOAN_WEEKS = 30;

// ---------- Departamento médico ----------
/** Tipo de lesão pela gravidade em semanas: Pancada (1), Estiramento (2-3), Distensão (4-6), Fratura (7+). */
export const injuryLabel = (weeks: number): string =>
  weeks <= 1 ? 'Pancada' : weeks <= 3 ? 'Estiramento' : weeks <= 6 ? 'Distensão' : 'Fratura';

const INJ_ARTICLE: Record<string, string> = { Pancada: 'uma pancada', Estiramento: 'um estiramento', 'Distensão': 'uma distensão', Fratura: 'uma fratura' };
/** "uma distensão", "um estiramento"… para narração e mensagens. */
export const injuryPhrase = (type: string): string => INJ_ARTICLE[type] || 'uma lesão';

/** "1 semana" / "5 semanas". */
export const weeksText = (n: number): string => `${n} ${n === 1 ? 'semana' : 'semanas'}`;
