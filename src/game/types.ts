// Tipos do motor do modo Manager.
// Tudo que fica dentro de `World` precisa ser 100% serializável em JSON
// (localStorage e Postgres jsonb): apenas objetos/arrays simples, números,
// strings, booleanos e null. Nada de Map, Set ou classes.

export type Position = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
export type FormationKey = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-5-1';
export type TacticKey = 'def' | 'bal' | 'att' | 'press';
export type TrainingKey = 'low' | 'mid' | 'high';
export type LeagueId = 'bra' | 'arg' | 'por' | 'esp' | 'eng' | 'ita';
export type DivisionId =
  | 'bra1' | 'bra2' | 'bra3'
  | 'arg1' | 'arg2'
  | 'por1' | 'por2'
  | 'esp1' | 'esp2'
  | 'eng1' | 'eng2'
  | 'ita1' | 'ita2';
/** @deprecated use DivisionId. */
export type Division = DivisionId;
/** Copa Nacional de uma liga. */
export type CupId = `cup:${LeagueId}`;
/** Copa Nacional ou Copa dos Campeões ('cont'). */
export type KnockoutId = CupId | 'cont';
/** Competição de uma partida: divisão (liga), Copa Nacional ou Copa dos Campeões. */
export type Competition = DivisionId | KnockoutId;
export type KitPattern = 'h' | 'v' | 'sash' | 'solid' | 'half';
export type FormResult = 'V' | 'E' | 'D';
export type TicketPrice = 'popular' | 'normal' | 'premium';
export type TraitKey =
  | 'finalizacao' | 'cabeceio' | 'drible' | 'passe' | 'velocidade'
  | 'marcacao' | 'desarme' | 'reflexo' | 'lideranca' | 'resistencia';

export interface Trait {
  name: string;
  short: string;
  desc: string;
}

export interface TicketPriceInfo {
  name: string;
  /** Multiplicador do preço do ingresso. */
  mult: number;
  /** Ajuste na ocupação do estádio. */
  occ: number;
}

export interface Loan {
  principal: number;
  weekly: number;
  weeksLeft: number;
}

export interface GateForecast {
  attendance: number;
  income: number;
  derby: boolean;
}

/** Pesos de um slot em cada setor do campo (defesa, meio, ataque). */
export interface SectorWeights {
  d?: number;
  m?: number;
  a?: number;
}

/** x = 0 (próprio gol) → 100 (gol adversário); y = 0 (esquerda) → 100 (direita). */
export interface FormationSlot {
  pos: Position;
  x: number;
  y: number;
}

export interface Tactic {
  name: string;
  att: number;
  def: number;
  fatigue: number;
  mid?: number;
}

export interface Training {
  name: string;
  recover: number;
  dev: number;
  injury: number;
}

export interface LeagueInfo {
  id: LeagueId;
  /** Nome do país ("Brasil"). */
  name: string;
  country: string;
  flag: string;
  /** Força econômica: multiplica cota de TV e prêmios. */
  wealth: number;
  /** Divisões, da mais alta para a mais baixa. */
  divisions: DivisionId[];
}

export interface DivisionInfo {
  id: DivisionId;
  league: LeagueId;
  name: string;
  /** 1 = primeira divisão. */
  level: number;
  /** Divisão de cima (acesso) ou null. */
  up: DivisionId | null;
  /** Divisão de baixo (rebaixamento) ou null. */
  down: DivisionId | null;
}

/** Item dos arquivos de dados src/game/clubs/<liga>.ts. */
export interface ClubSeed {
  /** Único global; estrangeiros com prefixo do país ("arg-rosario"). */
  id: string;
  name: string;
  short: string;
  city: string;
  uf: string;
  colors: [string, string] | string[];
  pattern: KitPattern;
  rep: number;
  cap: number;
  nickname: string;
  mascot: string;
  stadium: string;
  /** Id do rival (mesma liga). */
  rival: string;
}

/** Dados fixos de um clube (tabela CLUBS), com liga e divisão inicial. */
export interface ClubStatic {
  id: string;
  name: string;
  short: string;
  city: string;
  uf: string;
  colors: [string, string];
  pattern: KitPattern;
  league: LeagueId;
  /** Divisão inicial (no World, a divisão atual). */
  div: DivisionId;
  /** Reputação 0-100. */
  rep: number;
  /** Capacidade do estádio. */
  cap: number;
  nickname: string;
  mascot: string;
  stadium: string;
  /** Id do clube rival (clássico). */
  rival: string;
}

export interface Trophy {
  season: number;
  comp: string;
}

/** Clube dentro do mundo (dados fixos + estado da carreira). */
export interface Club extends ClubStatic {
  money: number;
  /** Nível da base (1-5). */
  academy: number;
  /** Nível do CT (1-5). */
  training: number;
  formation: FormationKey;
  tactic: TacticKey;
  trainingInt: TrainingKey;
  squad: string[];
  youth: string[];
  /** 11 posições alinhadas com os slots da formação; null = vaga aberta. */
  lineup: (string | null)[];
  bench: string[];
  trophies: Trophy[];
  /** Torcida (0-100, começa em 60). */
  fans: number;
  ticketPrice: TicketPrice;
  captain: string | null;
  penTaker: string | null;
  loan: Loan | null;
}

export interface SeasonStats {
  apps: number;
  goals: number;
  assists: number;
  /** Soma das notas (média = rsum / apps). */
  rsum: number;
}

export interface CareerStats {
  apps: number;
  goals: number;
  assists: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  pos: Position;
  ovr: number;
  pot: number;
  clubId: string | null;
  youth: boolean;
  /** Anos restantes de contrato (0 = livre). */
  contract: number;
  fitness: number;
  morale: number;
  /** Semanas de lesão restantes. */
  inj: number;
  /** Lesão sofrida nesta semana (não desconta no endWeek atual). */
  injNew?: boolean;
  /** Tipo da lesão atual ("Pancada", "Estiramento", "Distensão", "Fratura") ou null. */
  injType: string | null;
  /** 1-2 características. */
  traits: TraitKey[];
  /** Craque: +3 de overall efetivo em partidas e valor × 1,3. */
  star: boolean;
  /** Nacionalidade. */
  nat: LeagueId;
  /** Jogos de suspensão. */
  susp: number;
  /** Amarelos acumulados. */
  yc: number;
  listed: boolean;
  num: number;
  s: SeasonStats;
  c: CareerStats;
  played: boolean;
  /** Salário semanal. */
  wage: number;
  renewAsk?: number | null;
  agreedWage?: number | null;
}

/** Gol gravado na partida: [pid, lado, minuto, assistente|0, pênalti 1|0]. */
export type MatchGoal = [string, number, number, string | 0, 0 | 1];

export interface Match {
  id: string;
  h: string;
  a: string;
  comp: Competition;
  hs: number | null;
  as: number | null;
  pens: [number, number] | null;
  played: boolean;
  goals: MatchGoal[];
  neutral?: boolean;
  attendance?: number;
}

/**
 * Semana do calendário.
 * - 'league': rodada `round` (1-30) de todas as divisões;
 * - 'cup': fase `round` (0-4) de todas as Copas Nacionais (cada partida diz a sua em `comp`);
 * - 'cont': fase `round` (0-3) da Copa dos Campeões.
 */
export interface Week {
  type: 'league' | 'cup' | 'cont';
  round: number;
  matches: Match[];
}

export interface Cup {
  /** Participantes desta temporada. */
  entrants: string[];
  /** Ainda vivos. */
  alive: string[];
  champion: string | null;
}

export type MessageKind = 'info' | 'board' | 'medical' | 'trophy' | 'transfer' | 'news' | 'offer' | 'youth';

export interface Offer {
  pid: string;
  club: string;
  fee: number;
  expires: number;
  done?: boolean;
  expired?: boolean;
  accepted?: boolean;
}

export interface Message {
  id: number;
  season: number;
  week: number;
  read: boolean;
  kind: MessageKind;
  title: string;
  body: string;
  offer?: Offer;
}

/** Dados que o chamador fornece a pushMessage (id/season/week/read são preenchidos). */
export interface MessageInput {
  kind?: MessageKind;
  title: string;
  body: string;
  offer?: Offer;
  read?: boolean;
}

export interface Board {
  conf: number;
  target: number;
  label: string;
}

export interface Manager {
  name: string;
}

/** Movimentações financeiras por categoria (tickets, prize, wages, sponsor, tv, transfers, other, loan). */
export type FinanceCategory = 'tickets' | 'prize' | 'wages' | 'sponsor' | 'tv' | 'transfers' | 'other' | 'loan';
export type FinanceLog = Partial<Record<FinanceCategory, number>>;

export interface FinanceEntry extends FinanceLog {
  season: number;
  week: number;
  balance: number;
}

export interface ScorerEntry {
  name: string;
  club: string;
  goals: number;
}

/** Histórico por temporada (Hall da Fama). */
export interface HistoryEntry {
  season: number;
  /** Campeão de cada divisão. */
  champions: Record<DivisionId, string>;
  /** "cup:bra" … e "cont" → id do campeão. */
  cups: Record<string, string | null>;
  /** Artilheiros das primeiras divisões. */
  scorers: Partial<Record<DivisionId, ScorerEntry | null>>;
  best: { name: string; club: string; avg: number } | null;
  user: { club: string; league: LeagueId; div: DivisionId; pos: number; objective: string; success: boolean };
}

export interface TableRow {
  id: string;
  /** Pontos */
  p: number;
  /** Jogos */
  j: number;
  /** Vitórias */
  v: number;
  /** Empates */
  e: number;
  /** Derrotas */
  d: number;
  gf: number;
  ga: number;
  form: FormResult[];
}

export interface DivisionMove {
  club: string;
  from: DivisionId;
  to: DivisionId;
}

export interface SeasonSummary {
  entry: HistoryEntry;
  /** Classificação final de cada divisão. */
  tables: Record<DivisionId, TableRow[]>;
  /** Todas as trocas de divisão (aplicadas em newSeason). */
  moves: DivisionMove[];
  /** Clubes da liga do usuário que sobem / caem. */
  promoted: string[];
  relegated: string[];
  userPos: number;
  success: boolean;
  fired: boolean;
  /** Artilheiro de cada divisão (cópia do jogador no fim da temporada). */
  scorers: Partial<Record<DivisionId, Player | null>>;
  best: Player | null;
  /** Classificados para a Copa dos Campeões da próxima temporada (16). */
  contNext: string[];
  /** Clube maior interessado no treinador. */
  offer?: string;
}

export interface Fired {
  reason: string;
}

export interface World {
  version: number;
  manager: Manager;
  userClub: string;
  season: number;
  week: number;
  clubs: Record<string, Club>;
  players: Record<string, Player>;
  free: string[];
  nextId: number;
  /** Índice = semana; weeks[0] = null (pré-temporada). */
  weeks: (Week | null)[];
  /** Copas da temporada: "cup:<liga>" e "cont". */
  cups: Partial<Record<KnockoutId, Cup>>;
  /** Classificados para a próxima Copa dos Campeões (definidos no fim da temporada). */
  contNext: string[] | null;
  inbox: Message[];
  nextMsg: number;
  history: HistoryEntry[];
  board: Board;
  finance: FinanceEntry[];
  finWeek: FinanceLog;
  finSeason: FinanceLog;
  trialUsed: boolean;
  started: boolean;
  fired?: Fired | null;
  pendingSeason?: SeasonSummary | null;
}

export interface WeekReport {
  news: string[];
  seasonEnd?: SeasonSummary;
}

export interface Fixture {
  m: Match;
  week: number;
  wk: Week;
}

export interface SectorStrength {
  G: number;
  D: number;
  M: number;
  A: number;
}

// ---------- Partida (Sim) ----------

export type SimEventType = 'info' | 'build' | 'miss' | 'save' | 'goal' | 'red' | 'yellow' | 'injury' | 'sub' | 'pens';

export interface SimEvent {
  min: number;
  type: SimEventType;
  /** Lado (0 = mandante, 1 = visitante) ou null para eventos neutros. */
  side: number | null;
  text: string;
}

export interface SimGoal {
  side: number;
  pid: string;
  min: number;
  assist: string | null;
  pen: boolean;
}

export interface SimCard {
  pid: string;
  type: 'yellow' | 'red' | 'yy';
}

export interface SimInjury {
  pid: string;
  /** Gravidade sorteada (antes da redução pelo nível do CT). */
  weeks: number;
  /** Tipo da lesão (injuryLabel(weeks)); opcional para resultados externos. */
  type?: string;
}

export interface MatchStats {
  poss: [number, number];
  shots: [number, number];
  onT: [number, number];
  fouls: [number, number];
  yellow: [number, number];
  red: [number, number];
  corners: [number, number];
  xg: [number, number];
}

export interface OnField {
  pid: string;
  slot: number;
  fat: number;
  yc: number;
  eff?: number;
  /** Cache interno do Sim (recalculado ao trocar jogador, slot ou formação). */
  sp?: Position;
  /** overall efetivo × encaixe × moral (sem o cansaço). */
  k?: number;
  /** Multiplicadores de características por setor (defesa, meio, ataque). */
  dm?: number;
  mm?: number;
  am?: number;
  /** Desgaste por minuto (antes do fator tático). */
  drain?: number;
}

export interface SimSide {
  clubId: string;
  club: Club;
  user: boolean;
  /** CPU controla subs/tática deste lado. */
  auto: boolean;
  formation: FormationKey;
  tactic: TacticKey;
  baseTactic: TacticKey;
  on: OnField[];
  bench: string[];
  subs: number;
  played: string[];
}

export interface SimOptions {
  knockout?: boolean;
  neutral?: boolean;
  /** O clube do usuário controla as substituições (jogo ao vivo). */
  interactive?: boolean;
}

export interface SideStrength {
  A: number;
  D: number;
  M: number;
  G: number;
}

export type BallKind = 'mid' | 'attack' | 'goal' | 'save' | 'shot';

export interface Ball {
  x: number;
  y: number;
  side: number;
  kind: BallKind;
}

export type SimPhase = 'first' | 'half' | 'second' | 'done';

export interface MatchResult {
  fat: Record<string, number>;
  hs: number;
  as: number;
  pens: [number, number] | null;
  goals: SimGoal[];
  cards: SimCard[];
  injuries: SimInjury[];
  played: [string[], string[]];
  ratings: Record<string, number>;
  stats: MatchStats | null;
  /** 0 = mandante, 1 = visitante, -1 = empate. */
  winner: number;
}

// ---------- Mercado ----------

export type BidStatus = 'closed' | 'full' | 'money' | 'refused' | 'accepted' | 'counter' | 'rejected';

export interface BidResult {
  status: BidStatus;
  text: string;
  wage?: number;
  ask?: number;
}

export type UpgradeKey = 'academy' | 'training' | 'stadium';

export interface Upgrade {
  name: string;
  desc: string;
  max: number;
  cost: (c: Club) => number;
  level: (c: Club) => number;
}

export interface NewPlayerOptions {
  /** Nacionalidade; padrão: 85% a do clube, senão aleatória. */
  nat?: LeagueId;
  name?: string;
  age: number;
  pos: Position;
  ovr: number;
  pot: number;
  clubId?: string | null;
  youth?: boolean;
  contract?: number;
}
