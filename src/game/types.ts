// Tipos do motor do modo Manager.
// Tudo que fica dentro de `World` precisa ser 100% serializável em JSON
// (localStorage e Postgres jsonb): apenas objetos/arrays simples, números,
// strings, booleanos e null. Nada de Map, Set ou classes.

export type Position = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';
export type FormationKey = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-5-1';
export type TacticKey = 'def' | 'bal' | 'att' | 'press';
/** Instruções táticas (v6): por onde atacar, como passar, altura da linha e tipo de marcação. */
export type WidthKey = 'meio' | 'misto' | 'pontas';
export type PassKey = 'curto' | 'misto' | 'longo';
export type LineKey = 'baixa' | 'media' | 'alta';
export type MarkKey = 'zona' | 'individual';
export interface Instructions {
  width: WidthKey;
  pass: PassKey;
  line: LineKey;
  mark: MarkKey;
}
export interface InstructionOption {
  name: string;
  desc: string;
}
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
/** Habilidades especiais (as 10 primeiras vêm da v4; as demais, da v5). */
export type TraitKey =
  | 'finalizacao' | 'cabeceio' | 'drible' | 'passe' | 'velocidade'
  | 'marcacao' | 'desarme' | 'reflexo' | 'lideranca' | 'resistencia'
  | 'faltas' | 'motorzinho' | 'chuteLonge' | 'penalti' | 'pegaPenalti' | 'lancamento' | 'garra' | 'coringa';

/**
 * Atributos do jogador (1-99), na ordem de `Player.at`:
 * velocidade, fôlego, finalização, passe, drible, marcação, cabeceio, bola parada, reflexos e colocação (goleiros).
 */
export type AttrKey = 'vel' | 'fol' | 'fin' | 'pas' | 'dri' | 'mar' | 'cab' | 'bp' | 'ref' | 'col';

export interface AttrInfo {
  name: string;
  short: string;
  desc: string;
}

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
  /** Força econômica: multiplica prêmios e o poder de compra geral. */
  wealth: number;
  /** Tamanho do contrato de TV da liga (× cota base por divisão). */
  tv: number;
  /** Fração da cota de TV dividida pelo peso do clube (0 = igualitária). */
  tvSplit: number;
  /** Mercado comercial (patrocínio, sócios e produtos). */
  commercial: number;
  /** Preço médio do ingresso relativo ao Brasil. */
  ticket: number;
  /** Nível salarial relativo ao Brasil. */
  wages: number;
  /** Chance de um clube começar endividado (empréstimo bancário). */
  debt: number;
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
  /** Batedor de faltas (v5). */
  fkTaker: string | null;
  /** Instruções táticas (v6). */
  instr: Instructions;
  loan: Loan | null;
  /** Patrocínio master semanal, renegociado a cada temporada (v5). */
  sponsor: number;
  /** Teto da folha salarial semanal definido pela diretoria (v5). */
  wageCap: number;
  /** Nível do departamento de olheiros (1-5). */
  scouting: number;
  academyFocus: AcademyFocus;
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
  /** Habilidades especiais (0-3). */
  traits: TraitKey[];
  /** Atributos como desvio do overall, na ordem de ATTR_KEYS (valor = overall + desvio, 1-99). */
  at: number[];
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
  /** Chegada ao clube atual (safra, peneira ou contratação): temporada e overall. */
  start: { season: number; ovr: number };
  /** Semana de chegada ao clube atual (para o conhecimento do potencial). */
  joined?: { season: number; week: number; apps?: number };
  /** Empréstimo em andamento (clubId = clube que recebeu). */
  loan: PlayerLoan | null;
  /** Multa rescisória (0 = agente livre). */
  releaseClause: number;
  /** Papel prometido na contratação/renovação. */
  promise?: Role | null;
  /** Temporada em que a promessa já foi cobrada. */
  promiseChecked?: number;
  /**
   * Histórico por temporada (v6), do mais antigo ao mais recente, no máximo HIST_MAX linhas:
   * [temporada, clube no fim da temporada, jogos, gols, assistências, nota média × 100, títulos].
   */
  hist?: HistRow[];
  /** Revelado pela base deste clube (promovido ao profissional). */
  cria?: string;
  /** Jogos e gols pela seleção (Copa das Nações). */
  intl?: [apps: number, goals: number];
  /** Última conversa (temporada × 100 + semana), para não repetir cobranças (v6). */
  talkedAt?: number;
  /** Promessa de mais chances feita numa conversa: quando e quantos jogos o time e ele tinham. */
  chance?: { season: number; week: number; apps: number; games: number } | null;
}

export type Role = 'titular' | 'rotacao' | 'reserva';

/** Linha do histórico de um jogador (compacta para o save). */
export type HistRow = [season: number, club: string, apps: number, goals: number, assists: number, rating: number, titles?: string[]];

export interface NationRow {
  id: LeagueId;
  p: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gf: number;
  ga: number;
}
export interface NationMatch {
  h: LeagueId;
  a: LeagueId;
  hs: number;
  as: number;
  pens: [number, number] | null;
  /** Rodada (1-5) ou 0 = final. */
  round: number;
  /** Gols: [pid, lado]. */
  goals: [string, number][];
}
/** Uma edição da Copa das Nações (seleções das seis nacionalidades, entre temporadas). */
export interface NationsEdition {
  season: number;
  squads: Record<LeagueId, string[]>;
  table: NationRow[];
  matches: NationMatch[];
  champion: LeagueId;
  runnerUp: LeagueId;
  scorers: { pid: string; name: string; nat: LeagueId; goals: number }[];
}

/** Lenda: jogador aposentado que marcou época num clube. */
export interface Legend {
  club: string;
  name: string;
  pos: Position;
  apps: number;
  goals: number;
  from: number;
  to: number;
}

export interface MatchRecord {
  season: number;
  opp: string;
  gf: number;
  ga: number;
  comp: string;
}
export interface DealRecord {
  season: number;
  name: string;
  club: string | null;
  fee: number;
}
/** Recordes da carreira do treinador (v6). */
export interface Records {
  biggestWin: MatchRecord | null;
  worstLoss: MatchRecord | null;
  biggestSale: DealRecord | null;
  biggestBuy: DealRecord | null;
  topScorer: { season: number; name: string; goals: number } | null;
  unbeaten: { current: number; best: number };
  wins: { current: number; best: number };
  matches: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number };
  titles: { season: number; comp: string; club: string }[];
}
export type AchievementKey =
  | 'primeira_vitoria' | 'goleada' | 'classico' | 'sequencia5' | 'invicto10' | 'titulo' | 'liga' | 'acesso' | 'copa'
  | 'continental' | 'triplice' | 'venda50' | 'contratacao30' | 'cria' | 'artilheiro' | 'caixa100' | 'meta3' | 'veterano' | 'nacoes';
export interface Achievement {
  key: AchievementKey;
  season: number;
  week: number;
}
export type AcademyFocus = 'balanced' | 'attack' | 'midfield' | 'defense' | 'goalkeepers';

export interface PlayerLoan {
  /** Dono. */
  from: string;
  /** Clube que recebeu. */
  to: string;
  /** Temporada em que volta. */
  until: number;
  /** Fração do salário paga por quem recebeu. */
  wageShare: number;
  buyOption: number | null;
  /** Papel combinado no clube que recebeu. */
  role?: Role;
  /** Era da base do dono (volta para a base se ainda tiver idade). */
  youth?: boolean;
  /** Jogos e gols na temporada no início do empréstimo (para o resumo). */
  apps0?: number;
  goals0?: number;
}

export type ScoutLevel = 0 | 1 | 2;
export interface ScoutInfo {
  level: ScoutLevel;
  season: number;
}
export interface ScoutJob {
  pid: string;
  readyWeek: number;
  season: number;
}

export interface Payable {
  season: number;
  week: number;
  amount: number;
  desc: string;
  /** Clube devedor (padrão: o do usuário). */
  club?: string;
}

export type TransferKind = 'transfer' | 'loan' | 'free' | 'release' | 'clause';
export interface TransferRecord {
  season: number;
  week: number;
  pid: string;
  name: string;
  from: string | null;
  to: string | null;
  fee: number;
  kind: TransferKind;
  /** Envolveu o clube do usuário (nunca é apagado). */
  user?: boolean;
}

export interface Negotiation {
  patience: number;
  lastFee: number;
  week: number;
  season: number;
  /** Semana absoluta (temporada × 100 + semana) até a qual o clube não negocia. */
  cooldownUntil?: number;
  /** Acordo com o clube (ou multa paga). */
  agreed?: { fee: number; installments: 1 | 2 | 3; clause?: boolean };
  /** Termos pessoais aceitos pelo jogador. */
  contract?: Terms;
}

export interface Terms {
  wage: number;
  years: number;
  bonus: number;
  role: Role;
  /** Multa rescisória desejada (renovação); padrão 2,5× o valor. */
  releaseClause?: number;
}

export interface Deal extends Terms {
  fee: number;
  installments: 1 | 2 | 3;
}

export interface ClubResponse {
  status: 'accepted' | 'counter' | 'rejected' | 'walkout' | 'closed' | 'full' | 'money' | 'refused';
  counterFee?: number;
  patience: number;
  text: string;
}

export interface ContractResponse {
  status: 'accepted' | 'counter' | 'rejected';
  counter?: Terms;
  text: string;
}

export interface CounterOfferResult {
  status: 'accepted' | 'walkout' | 'improved';
  fee?: number;
  text: string;
}

export interface PotentialRange {
  min: number;
  max: number;
  exact: boolean;
}

export interface ScoutRequestResult {
  ok: boolean;
  reason?: string;
  readyWeek?: number;
}

export interface LoanOutOffer {
  club: string;
  wageShare: number;
  role: 'titular' | 'rotacao';
}

export interface LoanInTerms {
  ok: boolean;
  reason?: string;
  wageShare: number;
  buyOption: number;
}

export interface TrialOptions {
  region?: LeagueId;
  pos?: Position;
}

/** Estado anterior dos jogadores observados (para os avisos). */
export interface WatchState {
  listed: boolean;
  contract: number;
  clubId: string | null;
  clauseOk: boolean;
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

export type MessageKind = 'info' | 'board' | 'medical' | 'trophy' | 'award' | 'transfer' | 'news' | 'offer' | 'youth';

export interface Offer {
  pid: string;
  club: string;
  fee: number;
  expires: number;
  done?: boolean;
  expired?: boolean;
  accepted?: boolean;
  /** Proposta por um garoto da base. */
  youth?: boolean;
  /** Teto escondido da CPU (não mostrar na UI). */
  ceiling?: number;
  /** Rodadas de contraproposta já feitas. */
  rounds?: number;
  /** A CPU desistiu depois de uma contraproposta. */
  walkout?: boolean;
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
  /** Jogador relacionado (relatório de olheiro, lista de observação, promessa…). */
  pid?: string;
  /** Conversa com um jogador, com opções de resposta (v6). */
  talk?: Talk;
}

export type TalkKind = 'bench' | 'raise' | 'leave';
export interface TalkOption {
  key: string;
  label: string;
  /** Efeito resumido mostrado no botão. */
  hint: string;
}
export interface Talk {
  kind: TalkKind;
  pid: string;
  options: TalkOption[];
  /** Semana (e temporada da mensagem) em que o jogador cansa de esperar. */
  expires: number;
  /** Aumento pedido (R$/sem), só em 'raise'. */
  amount?: number;
  /** Clube interessado, só em 'leave'. */
  club?: string;
  /** Resposta dada (ou 'ignored') e o resultado. */
  answer?: string;
  result?: string;
}

/** Conversa no vestiário antes de um jogo (v6). */
export type TeamTalkKey = 'motivar' | 'tranquilizar' | 'cobrar';
export interface TeamTalk {
  season: number;
  week: number;
  key: TeamTalkKey;
  /** Multiplicador de rendimento do time na partida. */
  mult: number;
  text: string;
}

/** Dados que o chamador fornece a pushMessage (id/season/week/read são preenchidos). */
export interface MessageInput {
  kind?: MessageKind;
  title: string;
  body: string;
  offer?: Offer;
  pid?: string;
  talk?: Talk;
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
export type FinanceCategory = 'tickets' | 'prize' | 'wages' | 'sponsor' | 'tv' | 'commercial' | 'upkeep' | 'transfers' | 'other' | 'loan';
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

/** Retrato estatístico guardado no histórico após transferências ou aposentadoria. */
export interface AwardPlayer {
  id: string;
  name: string;
  club: string;
  pos: Position;
  age: number;
  apps: number;
  goals: number;
  assists: number;
  avg: number;
}

export interface SeasonAwards {
  young: AwardPlayer | null;
  player: AwardPlayer | null;
  goalkeeper: AwardPlayer | null;
  goldenBoot: AwardPlayer | null;
  /** Pontos dos gols ponderados pela dificuldade e importância da partida. */
  goldenBootPoints?: number | null;
  /** Clube com a melhor campanha do ano. */
  club: string | null;
  manager: { name: string; club: string } | null;
  /** Seleção do ano: goleiro, defesa, meio e ataque. */
  team: AwardPlayer[];
  /** Dez candidatos elegíveis à Bola de Ouro, com parcelas da pontuação. */
  ranking?: AwardRankingEntry[];
}

export interface AwardRankingEntry {
  player: AwardPlayer;
  points: number;
  breakdown: { rating: number; goals: number; assists: number; games: number; campaign: number };
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
  awards?: SeasonAwards;
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
  /** 0 = segunda, 6 = domingo (jogo). */
  day: number;
  /** Última notícia exibida na animação do calendário. */
  calendarSeenMessageId?: number;
  /** Migração da orientação dos mandos no calendário de liga. */
  scheduleRevision?: number;
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
  /** Conhecimento do usuário sobre jogadores de fora (0 básico, 1 observado, 2 relatório). */
  scouting: Record<string, ScoutInfo>;
  scoutQueue: ScoutJob[];
  negotiations: Record<string, Negotiation>;
  /** Parcelas de transferências a pagar. */
  payables: Payable[];
  watchlist: string[];
  watchState: Record<string, WatchState>;
  /** Histórico de transferências (todas as do usuário + últimas 400 da CPU). */
  transfers: TransferRecord[];
  /**
   * Índice salarial (v5): overall médio dos elencos no início da carreira e o desvio atual.
   * Os salários de mercado descontam o desvio, para a folha não disparar com a evolução geral.
   */
  econ?: { baseOvr: number; drift: number };
  /** Edições da Copa das Nações (v6). */
  nations?: NationsEdition[];
  /** Recordes, conquistas e lendas da carreira (v6). */
  records?: Records;
  achievements?: Achievement[];
  legends?: Legend[];
  /** Conversa no vestiário escolhida para o jogo desta semana (v6). */
  teamTalk?: TeamTalk | null;
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
  /** Dados do lance para a apresentação ao vivo, sem depender do texto da narração. */
  penalty?: {
    shooterId: string;
    keeperId: string | null;
    outcome: 'goal' | 'save' | 'miss';
    /** Placar da disputa após esta cobrança; ausente nos pênaltis do tempo normal. */
    shootoutScore?: [number, number];
    round?: number;
  };
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
  /** Raçudo: rende mais com o time atrás no placar. */
  garra?: boolean;
  /** Atributos usados nos lances (cache do Sim, ordem de ATTR_KEYS). */
  av?: number[];
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
  instr: Instructions;
  /** Efeito da conversa no vestiário (1 = neutro). */
  talk?: number;
  /** Efeitos das instruções (recalculados quando o time ou as instruções mudam). */
  mods?: InstructionMods | null;
  on: OnField[];
  bench: string[];
  subs: number;
  played: string[];
}

/** Multiplicadores das instruções táticas aplicados pelo Sim. */
export interface InstructionMods {
  att: number;
  mid: number;
  def: number;
  /** Chance de contra-ataque a favor. */
  counterFor: number;
  /** Chance de contra-ataque sofrido. */
  counterAgainst: number;
  /** Faltas cometidas. */
  foul: number;
  /** Cruzamentos para a área (chance extra de cabeçada). */
  cross: number;
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
  substitutions?: { side: number; min: number; out: string; player: string }[];
  tactics?: { side: number; min: number; tactic: TacticKey }[];
}

// ---------- Mercado ----------

export type BidStatus = 'closed' | 'full' | 'money' | 'refused' | 'accepted' | 'counter' | 'rejected';

export interface BidResult {
  status: BidStatus;
  text: string;
  wage?: number;
  ask?: number;
}

export type UpgradeKey = 'academy' | 'training' | 'stadium' | 'scouting';

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
