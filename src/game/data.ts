// Dados fixos: clubes, nomes, posições, formações e narração.
import type {
  AcademyFocus, AttrInfo, AttrKey, FormationKey, FormationSlot, Position, SectorWeights, Tactic, TacticKey, TicketPrice, TicketPriceInfo, Trait, TraitKey,
  Training, TrainingKey,
} from './types';
import { NAMES_BY_NAT } from './names';
import { pick } from './util';

export type { AttrKey, Position, FormationKey, TacticKey, TrainingKey, TraitKey, TicketPrice } from './types';

// Clubes fictícios (fonte: ./clubs/<liga>.ts), com liga e divisão inicial.
export { CLUBS, CLUB_SEEDS, leagueClubs } from './clubs';

// Nomes brasileiros (compatibilidade); por nacionalidade, veja NAMES_BY_NAT.
export const { FIRST, LAST, NICK } = NAMES_BY_NAT.bra;
export { NAMES_BY_NAT } from './names';
export type { NameLists } from './names';

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
function fitRaw(natural: Position, slot: Position): number {
  if (natural === slot) return 1;
  if (natural === 'GOL' || slot === 'GOL') return 0.35;
  return NEAR[natural + '-' + slot] || NEAR[slot + '-' + natural] || 0.68;
}
// Tabela pré-calculada (fit é chamado em laços quentes da escalação e do motor).
const FIT_TABLE = {} as Record<Position, Record<Position, number>>;
for (const a of ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'] as Position[]) {
  FIT_TABLE[a] = {} as Record<Position, number>;
  for (const b of ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'] as Position[]) FIT_TABLE[a][b] = fitRaw(a, b);
}
export const fit = (natural: Position, slot: Position): number => FIT_TABLE[natural]?.[slot] ?? fitRaw(natural, slot);

// Formações: x = 0 (próprio gol) → 100 (gol adversário); y = 0 (esquerda) → 100 (direita).
const S = (pos: Position, x: number, y: number): FormationSlot => ({ pos, x, y });
export const FORMATIONS: Record<FormationKey, FormationSlot[]> = {
  '4-4-2': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 16), S('VOL', 45, 40), S('VOL', 45, 60), S('MEI', 52, 84), S('ATA', 74, 40), S('ATA', 74, 60)],
  '4-3-3': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 50), S('MEI', 52, 30), S('MEI', 52, 70), S('ATA', 74, 16), S('ATA', 80, 50), S('ATA', 74, 84)],
  '4-2-3-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 40, 38), S('VOL', 40, 62), S('MEI', 60, 16), S('MEI', 60, 50), S('MEI', 60, 84), S('ATA', 80, 50)],
  '3-5-2': [S('GOL', 5, 50), S('ZAG', 20, 26), S('ZAG', 18, 50), S('ZAG', 20, 74), S('LAT', 45, 10), S('VOL', 40, 50), S('MEI', 54, 32), S('MEI', 54, 68), S('LAT', 45, 90), S('ATA', 75, 40), S('ATA', 75, 60)],
  '5-3-2': [S('GOL', 5, 50), S('LAT', 30, 10), S('ZAG', 20, 30), S('ZAG', 18, 50), S('ZAG', 20, 70), S('LAT', 30, 90), S('VOL', 42, 50), S('MEI', 52, 28), S('MEI', 52, 72), S('ATA', 75, 40), S('ATA', 75, 60)],
  '4-5-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 52, 12), S('VOL', 42, 36), S('VOL', 42, 64), S('MEI', 56, 50), S('MEI', 52, 88), S('ATA', 78, 50)],
  '4-1-4-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 37, 50), S('MEI', 55, 13), S('MEI', 51, 37), S('MEI', 51, 63), S('MEI', 55, 87), S('ATA', 78, 50)],
  '4-3-1-2': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 39, 50), S('MEI', 49, 27), S('MEI', 49, 73), S('MEI', 62, 50), S('ATA', 77, 37), S('ATA', 77, 63)],
  '4-4-1-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('MEI', 50, 14), S('VOL', 43, 38), S('VOL', 43, 62), S('MEI', 50, 86), S('MEI', 64, 50), S('ATA', 80, 50)],
  '4-3-2-1': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 39, 50), S('MEI', 47, 25), S('MEI', 47, 75), S('MEI', 63, 34), S('MEI', 63, 66), S('ATA', 80, 50)],
  '4-2-4': [S('GOL', 5, 50), S('LAT', 26, 14), S('ZAG', 20, 38), S('ZAG', 20, 62), S('LAT', 26, 86), S('VOL', 43, 37), S('VOL', 43, 63), S('ATA', 70, 13), S('ATA', 78, 38), S('ATA', 78, 62), S('ATA', 70, 87)],
  '3-4-3': [S('GOL', 5, 50), S('ZAG', 20, 26), S('ZAG', 18, 50), S('ZAG', 20, 74), S('LAT', 46, 10), S('VOL', 42, 37), S('VOL', 42, 63), S('LAT', 46, 90), S('ATA', 73, 18), S('ATA', 80, 50), S('ATA', 73, 82)],
  '3-4-2-1': [S('GOL', 5, 50), S('ZAG', 20, 26), S('ZAG', 18, 50), S('ZAG', 20, 74), S('LAT', 46, 10), S('VOL', 42, 37), S('VOL', 42, 63), S('LAT', 46, 90), S('MEI', 63, 32), S('MEI', 63, 68), S('ATA', 80, 50)],
  '5-4-1': [S('GOL', 5, 50), S('LAT', 30, 10), S('ZAG', 20, 30), S('ZAG', 18, 50), S('ZAG', 20, 70), S('LAT', 30, 90), S('MEI', 50, 16), S('VOL', 43, 39), S('VOL', 43, 61), S('MEI', 50, 84), S('ATA', 76, 50)],
};

/** Apelido e resumo de cada formação (escolha na Escalação e nas substituições). */
export const FORMATION_INFO: Record<FormationKey, { name: string; desc: string }> = {
  '4-4-2': { name: 'Clássico', desc: 'Duas linhas de quatro e dupla de ataque. Equilibrado em tudo.' },
  '4-3-3': { name: 'Com pontas', desc: 'Três atacantes abertos pressionam e esticam o campo.' },
  '4-2-3-1': { name: 'Moderno', desc: 'Dois volantes protegem; três meias abastecem o centroavante.' },
  '3-5-2': { name: 'Alas', desc: 'Três zagueiros e alas que sobem. Meio-campo povoado.' },
  '5-3-2': { name: 'Retranca', desc: 'Cinco atrás e contra-ataque com dois atacantes.' },
  '4-5-1': { name: 'Meio cheio', desc: 'Cinco no meio para ter a bola; um atacante isolado.' },
  '4-1-4-1': { name: 'Volante fixo', desc: 'Um volante na frente da zaga e quatro meias por dentro e por fora.' },
  '4-3-1-2': { name: 'Losango', desc: 'Meio fechado com camisa 10 e dois atacantes; pouco jogo pelos lados.' },
  '4-4-1-1': { name: 'Segundo atacante', desc: 'Um meia joga colado no centroavante, entre as linhas.' },
  '4-3-2-1': { name: 'Árvore de Natal', desc: 'Três volantes/meias atrás de dois meias-atacantes e um centroavante.' },
  '4-2-4': { name: 'Ofensivo total', desc: 'Quatro atacantes à moda antiga. Muito gol, meio-campo exposto.' },
  '3-4-3': { name: 'Ataque largo', desc: 'Três zagueiros, alas e um tridente. Agressivo e arriscado.' },
  '3-4-2-1': { name: 'Dois camisas 10', desc: 'Três zagueiros, alas e dois meias atrás do centroavante.' },
  '5-4-1': { name: 'Ferrolho', desc: 'Dez atrás da linha da bola. Para segurar resultado.' },
};
export const FORMATION_KEYS = Object.keys(FORMATIONS) as FormationKey[];

// ---------- Formação personalizada ----------
export type ShapeLine = 'def' | 'mid' | 'att';
/** Faixas do campo (x) e as funções liberadas em cada linha. */
export const SHAPE_LINES: Record<ShapeLine, { label: string; min: number; max: number; roles: Position[] }> = {
  def: { label: 'Defesa', min: 14, max: 33, roles: ['ZAG', 'LAT'] },
  mid: { label: 'Meio-campo', min: 34, max: 61, roles: ['VOL', 'MEI', 'LAT'] },
  att: { label: 'Ataque', min: 62, max: 84, roles: ['MEI', 'ATA'] },
};
export const lineOf = (x: number): ShapeLine => (x < 33.5 ? 'def' : x < 61.5 ? 'mid' : 'att');
/** Quantos jogadores de linha cada setor aceita na formação personalizada. */
export const SHAPE_LIMITS: Record<ShapeLine, [number, number]> = { def: [3, 5], mid: [2, 6], att: [0, 4] };

/** Desenho em campo de um clube: o personalizado, se houver, senão o da formação. */
type ShapeOwner = { formation: FormationKey; shape?: FormationSlot[] | null; shapeOn?: boolean };
export const customShapeOn = (c: ShapeOwner): boolean => !!c.shapeOn && !!c.shape && c.shape.length === 11;
export const shapeOf = (c: ShapeOwner): FormationSlot[] => (customShapeOn(c) ? c.shape! : FORMATIONS[c.formation]);

/** Rótulo "4-2-3-1" de um desenho, pelas faixas do campo (defesa, meio, meia-atacante, ataque). */
export function shapeLabel(shape: FormationSlot[]): string {
  const n = [0, 0, 0, 0];
  for (const s of shape.slice(1)) n[s.x < 34 ? 0 : s.x < 58 ? 1 : s.x < 68 ? 2 : 3]++;
  return n.filter((k) => k > 0).join('-');
}

/** Nome da formação de um clube para as telas ("3-4-3" ou "4-2-3-1 personalizada"). */
export const formationLabel = (c: ShapeOwner): string => (customShapeOn(c) ? `${shapeLabel(c.shape!)} personalizada` : c.formation);

/** Função padrão de quem chega numa linha (laterais e alas pelos lados). */
function defaultRole(line: ShapeLine, x: number, y: number): Position {
  const wide = y < 22 || y > 78;
  if (line === 'def') return wide ? 'LAT' : 'ZAG';
  if (line === 'mid') return wide && x < 50 ? 'LAT' : x < 46 ? 'VOL' : 'MEI';
  return x < 70 && !wide ? 'MEI' : 'ATA';
}

/** Problema do desenho (ou null): goleiro fixo, funções da linha certa e limites por setor. */
export function shapeIssue(shape: FormationSlot[]): string | null {
  if (shape.length !== 11 || shape[0].pos !== 'GOL') return 'A formação precisa de 11 posições com o goleiro.';
  const count: Record<ShapeLine, number> = { def: 0, mid: 0, att: 0 };
  for (const s of shape.slice(1)) {
    const line = lineOf(s.x);
    if (s.pos === 'GOL' || !SHAPE_LINES[line].roles.includes(s.pos)) return `${s.pos} não pode jogar na linha de ${SHAPE_LINES[line].label.toLowerCase()}.`;
    count[line]++;
  }
  for (const line of Object.keys(SHAPE_LIMITS) as ShapeLine[]) {
    const [lo, hi] = SHAPE_LIMITS[line];
    if (count[line] < lo) return `${SHAPE_LINES[line].label}: mínimo de ${lo} jogador${lo > 1 ? 'es' : ''}.`;
    if (count[line] > hi) return `${SHAPE_LINES[line].label}: máximo de ${hi} jogadores.`;
  }
  for (let a = 1; a < shape.length; a++) {
    for (let b = a + 1; b < shape.length; b++) {
      if (Math.abs(shape[a].x - shape[b].x) < 8 && Math.abs(shape[a].y - shape[b].y) < 14) return 'Duas posições muito próximas.';
    }
  }
  return null;
}

/**
 * Move a posição `i` para (x, y). Se a função atual não vale na nova linha, troca pela padrão da linha.
 * Devolve o novo desenho, ou null se ele quebrar os limites por setor ou encostar em outra posição (o goleiro não se move).
 */
export function moveSlot(shape: FormationSlot[], i: number, x: number, y: number): FormationSlot[] | null {
  const next = placeSlot(shape, i, x, y);
  return next && !shapeIssue(next) ? next : null;
}

/** Como `moveSlot`, mas sem validar (para mostrar o motivo de um movimento inválido). */
export function placeSlot(shape: FormationSlot[], i: number, x: number, y: number): FormationSlot[] | null {
  if (i <= 0 || i >= shape.length) return null;
  const nx = Math.round(Math.min(84, Math.max(14, x))), ny = Math.round(Math.min(94, Math.max(6, y)));
  const line = lineOf(nx);
  const pos = SHAPE_LINES[line].roles.includes(shape[i].pos) ? shape[i].pos : defaultRole(line, nx, ny);
  return shape.map((s, k) => (k === i ? { pos, x: nx, y: ny } : { ...s }));
}

/** Troca a função da posição `i` (só entre as liberadas para a linha dela). */
export function setSlotRole(shape: FormationSlot[], i: number, pos: Position): FormationSlot[] | null {
  if (i <= 0 || !SHAPE_LINES[lineOf(shape[i].x)].roles.includes(pos)) return null;
  return shape.map((s, k) => (k === i ? { ...s, pos } : { ...s }));
}

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
  goal: ['GOOOOL! {p} manda para o fundo da rede!', 'GOL! {p} não perdoa e marca para o {t}!', 'É GOL! Que finalização de {p}!', 'GOOOL do {t}! {p} bate firme e marca!', 'Golaço de {p}! A torcida do {t} vai à loucura!', '{p} recebe na área, escolhe o canto e balança a rede!', 'O {t} encontrou espaço: {p} finaliza com categoria!', '{p} aparece na hora certa e marca para o {t}!'],
  assist: [' Passe de {a}.', ' Assistência de {a}.', ' Belo cruzamento de {a}.', ' Lançamento perfeito de {a}.'],
  save: ['Defesaça de {g}! {p} parou no goleiro.', '{p} finaliza e {g} espalma.', '{g} voa e salva o {t}!', 'Chute de {p}, {g} segura firme.', '{g} fecha o ângulo e frustra {p}!', '{p} bate rasteiro; {g} cai para defender.', 'Reflexo incrível de {g} na finalização de {p}!'],
  miss: ['{p} chuta por cima do gol.', 'Tirou tinta da trave! {p} quase marca.', '{p} bate cruzado, para fora.', 'Na trave! {p} fica no quase.', '{p} arrisca de longe, sem direção.', '{p} pega de primeira, mas a bola passa ao lado.', 'A torcida já levantava: {p} manda rente ao poste.', '{p} tenta o canto e erra por muito pouco.'],
  block: ['A zaga bloqueia o chute de {p}.', '{p} tenta, mas a defesa trava.'],
  build: ['{t} troca passes no campo de ataque.', '{p} avança pela ponta.', '{t} pressiona a saída de bola.', '{p} tenta o drible e perde.', '{t} gira a bola procurando espaço.', 'Bola longa do {t}, a zaga afasta.', '{p} recebe entre as linhas e acelera.', 'O {t} muda o lado da jogada.', '{p} protege a bola e espera a passagem dos companheiros.', 'A defesa fecha os espaços diante do {t}.'],
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
  fk: ['Falta perigosa para o {t}, na entrada da área. {p} ajeita a bola.', 'Falta frontal! {p} vai para a cobrança.', 'Falta na meia-lua para o {t}. {p} na bola.'],
  fkGoal: ['GOL DE FALTA! {p} coloca a bola no ângulo!', 'QUE COBRANÇA! {p} passa por cima da barreira e marca para o {t}!', 'GOLAÇO DE FALTA de {p}! {g} só olhou!'],
  fkSave: ['{p} cobra com força e {g} espalma!', 'Cobrança de {p} no canto, {g} voa e defende.'],
  fkMiss: ['A cobrança de {p} explode na barreira.', '{p} bate por cima do gol.', 'Tirou tinta! A falta de {p} passa rente à trave.'],
  cross: ['Jogada pela ponta e cruzamento na área para {p}…', 'Cruzamento da linha de fundo, {p} sobe…', 'Bola alçada na área, {p} vai de cabeça…'],
  longShot: ['{p} arrisca de longe…', 'Lá de fora! {p} solta a bomba…', '{p} ajeita e chuta de fora da área…'],
  longGoal: ['GOLAÇO! {p} acerta um foguete de fora da área!', 'DE LONGE! {p} surpreende {g} e marca um golaço!'],
  counter: ['Contra-ataque do {t}! {p} dispara em velocidade.', 'Roubou e saiu! {p} puxa o contra-ataque do {t}.', 'Lançamento longo e {p} sai na cara do gol!', 'Campo aberto para {p}: o {t} acelera na transição!', '{p} arranca pelo meio com a defesa voltando às pressas.'],
} satisfies Record<string, string[]>;
export type TxtKey = keyof typeof TXT;

/** Sorteia uma frase de narração e substitui {chaves}. */
export const say = (key: TxtKey, vars?: Record<string, string>): string => {
  let s = pick(TXT[key]);
  for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

// ---------- Habilidades especiais ----------
// Chaves estáveis (saves); nomes no jeito da arquibancada. As descrições batem com o efeito no motor.
export const TRAITS: Record<TraitKey, Trait> = {
  finalizacao: { name: 'Matador', short: 'MAT', desc: 'Frio na cara do gol: chutes 12% mais perigosos.' },
  cabeceio: { name: 'Cabeceador', short: 'CAB', desc: 'Domina a bola aérea: alvo preferido nos escanteios, com cabeçadas mais perigosas.' },
  drible: { name: 'Driblador', short: 'DRI', desc: 'Desequilibra no ataque e cava faltas perto da área.' },
  passe: { name: 'Garçom', short: 'GAR', desc: 'Organiza o meio-campo e dá muito mais assistências.' },
  velocidade: { name: 'Velocista', short: 'VEL', desc: 'Arranque que fortalece o ataque e puxa contra-ataques.' },
  marcacao: { name: 'Xerife', short: 'XER', desc: 'Fecha os espaços e fortalece a defesa.' },
  desarme: { name: 'Ladrão de bolas', short: 'LAD', desc: 'Desarma com precisão e fortalece a defesa.' },
  reflexo: { name: 'Paredão', short: 'PAR', desc: 'Goleiro: chutes adversários 10% menos perigosos.' },
  lideranca: { name: 'Líder', short: 'LÍD', desc: 'Como capitão, dobra o bônus da braçadeira.' },
  resistencia: { name: 'Pulmão', short: 'PUL', desc: 'Cansa 20% menos durante a partida.' },
  faltas: { name: 'Batedor de falta', short: 'FAL', desc: 'Faltas perto da área viram chance real de gol (cobrança 70% mais perigosa).' },
  motorzinho: { name: 'Motorzinho', short: 'MOT', desc: 'Vai e volta o jogo todo: ajuda na defesa e no ataque, cansa menos e recupera mais rápido.' },
  chuteLonge: { name: 'Chute de longe', short: 'CHL', desc: 'Arrisca de fora da área com perigo.' },
  penalti: { name: 'Cobrador de pênalti', short: 'PEN', desc: 'Converte bem mais pênaltis.' },
  pegaPenalti: { name: 'Pegador de pênalti', short: 'PGP', desc: 'Goleiro: defende bem mais pênaltis.' },
  lancamento: { name: 'Lançador', short: 'LAN', desc: 'Lançamentos longos: mais contra-ataques e assistências.' },
  garra: { name: 'Raçudo', short: 'RAÇ', desc: 'Cresce na adversidade: rende 6% mais com o time atrás no placar.' },
  coringa: { name: 'Coringa', short: 'COR', desc: 'Polivalente: perde pouco rendimento fora da posição.' },
};
export const TRAIT_KEYS = Object.keys(TRAITS) as TraitKey[];

/** Pesos para sortear habilidades conforme a posição. */
export const TRAIT_WEIGHTS: Record<Position, Partial<Record<TraitKey, number>>> = {
  GOL: { reflexo: 6, pegaPenalti: 3, lideranca: 2, lancamento: 1, resistencia: 0.5 },
  ZAG: { marcacao: 4, desarme: 3, cabeceio: 4, lideranca: 2, velocidade: 1, garra: 2, lancamento: 1, coringa: 1 },
  LAT: { velocidade: 4, resistencia: 3, motorzinho: 2, passe: 2, desarme: 2, drible: 2, marcacao: 1, faltas: 0.8, coringa: 1.5, garra: 1 },
  VOL: { desarme: 4, marcacao: 3, passe: 3, resistencia: 2, motorzinho: 4, lideranca: 2, chuteLonge: 1.5, lancamento: 2, garra: 2, coringa: 1.5 },
  MEI: { passe: 5, drible: 4, finalizacao: 2, faltas: 3, chuteLonge: 2.5, lancamento: 2, motorzinho: 1.5, velocidade: 1, penalti: 1.5, lideranca: 1, coringa: 1 },
  ATA: { finalizacao: 5, drible: 3, velocidade: 3.5, cabeceio: 3, penalti: 2, chuteLonge: 1.5, faltas: 1, garra: 1, lideranca: 0.8 },
};

// ---------- Atributos ----------
export const ATTR_KEYS: AttrKey[] = ['vel', 'fol', 'fin', 'pas', 'dri', 'mar', 'cab', 'bp', 'ref', 'col'];
export const ATTRS: Record<AttrKey, AttrInfo> = {
  vel: { name: 'Velocidade', short: 'VEL', desc: 'Arranque e contra-ataque.' },
  fol: { name: 'Fôlego', short: 'FOL', desc: 'Cansa menos em campo e recupera mais rápido entre os jogos.' },
  fin: { name: 'Finalização', short: 'FIN', desc: 'Quem chuta mais e com mais perigo.' },
  pas: { name: 'Passe', short: 'PAS', desc: 'Criação no meio-campo e assistências.' },
  dri: { name: 'Drible', short: 'DRI', desc: 'Força no ataque individual.' },
  mar: { name: 'Marcação', short: 'MAR', desc: 'Força defensiva.' },
  cab: { name: 'Cabeceio', short: 'CAB', desc: 'Bolas aéreas nos escanteios.' },
  bp: { name: 'Bola parada', short: 'BP', desc: 'Faltas diretas e pênaltis.' },
  ref: { name: 'Reflexos', short: 'REF', desc: 'Goleiro: defesas difíceis.' },
  col: { name: 'Colocação', short: 'COL', desc: 'Goleiro: posicionamento e saídas do gol.' },
};
/** Índice de cada atributo em `Player.at`. */
export const ATTR_INDEX = Object.fromEntries(ATTR_KEYS.map((k, i) => [k, i])) as Record<AttrKey, number>;
/** Atributos exibidos por posição (os demais pouco importam para ela). */
export const ATTRS_FOR: Record<Position, AttrKey[]> = {
  GOL: ['ref', 'col', 'pas', 'fol', 'vel', 'bp'],
  ZAG: ['mar', 'cab', 'vel', 'fol', 'pas', 'dri', 'fin', 'bp'],
  LAT: ['vel', 'fol', 'mar', 'pas', 'dri', 'fin', 'cab', 'bp'],
  VOL: ['mar', 'fol', 'pas', 'vel', 'dri', 'fin', 'cab', 'bp'],
  MEI: ['pas', 'dri', 'fin', 'bp', 'vel', 'fol', 'mar', 'cab'],
  ATA: ['fin', 'vel', 'dri', 'cab', 'pas', 'fol', 'bp', 'mar'],
};
/** Desvio médio de cada atributo em relação ao overall, por posição (ordem de ATTR_KEYS). */
export const ATTR_PROFILE: Record<Position, number[]> = {
  //      vel  fol  fin  pas  dri  mar  cab   bp  ref  col
  GOL: [-25, -12, -45, -14, -40, -35, -28, -30, 3, 1],
  ZAG: [-6, -2, -22, -10, -16, 6, 5, -14, -50, -50],
  LAT: [5, 4, -14, -1, -2, 0, -8, -6, -50, -50],
  VOL: [-4, 4, -10, 2, -6, 4, -4, -6, -50, -50],
  MEI: [0, 0, -2, 5, 4, -12, -10, 2, -50, -50],
  ATA: [3, -2, 6, -4, 3, -24, 0, -4, -50, -50],
};
/** Atributo reforçado por cada habilidade. */
export const TRAIT_ATTR: Partial<Record<TraitKey, AttrKey>> = {
  finalizacao: 'fin', cabeceio: 'cab', drible: 'dri', passe: 'pas', velocidade: 'vel', marcacao: 'mar', desarme: 'mar',
  reflexo: 'ref', resistencia: 'fol', faltas: 'bp', motorzinho: 'fol', chuteLonge: 'fin', penalti: 'bp', pegaPenalti: 'ref', lancamento: 'pas',
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

// ---------- Categorias de base ----------
export interface AcademyFocusInfo {
  name: string;
  desc: string;
  /** Posições favorecidas (pesos da safra e evolução +15%). */
  pos: Position[];
}
export const ACADEMY_FOCUS: Record<AcademyFocus, AcademyFocusInfo> = {
  balanced: { name: 'Equilibrado', desc: 'Garotos de todas as posições, sem prioridade.', pos: [] },
  attack: { name: 'Ataque', desc: 'Mais atacantes e meias ofensivos na safra; eles evoluem 15% mais rápido.', pos: ['ATA', 'MEI'] },
  midfield: { name: 'Meio-campo', desc: 'Mais volantes e meias na safra; eles evoluem 15% mais rápido.', pos: ['VOL', 'MEI'] },
  defense: { name: 'Defesa', desc: 'Mais zagueiros e laterais na safra; eles evoluem 15% mais rápido.', pos: ['ZAG', 'LAT'] },
  goalkeepers: { name: 'Goleiros', desc: 'Mais goleiros na safra; eles evoluem 15% mais rápido.', pos: ['GOL'] },
};
/** Multiplicador do peso de posição da safra para o setor em foco. */
export const FOCUS_WEIGHT = 2.5;
/** Evolução extra dos garotos do setor em foco. */
export const FOCUS_DEV = 1.15;
