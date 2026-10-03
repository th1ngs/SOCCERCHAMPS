// Instruções táticas (v6): por onde atacar, como passar, altura da linha e tipo de marcação.
// Cada instrução tem um custo e rende mais quando o elenco tem o perfil certo (atributos individuais).
import { ATTR_INDEX, ATTR_PROFILE, shapeOf } from './data';
import type {
  AttrKey, Club, FormationSlot, InstructionMods, InstructionOption, Instructions, LineKey, MarkKey, PassKey, Player, WidthKey, World,
} from './types';
import { clamp } from './util';

export const DEFAULT_INSTRUCTIONS: Instructions = { width: 'misto', pass: 'misto', line: 'media', mark: 'zona' };

export const WIDTH_OPTIONS: Record<WidthKey, InstructionOption> = {
  meio: { name: 'Pelo meio', desc: 'Tabelas pelo centro: mais controle do meio-campo; rende com meias de bom passe.' },
  misto: { name: 'Variado', desc: 'Sem preferência de corredor.' },
  pontas: { name: 'Pelas pontas', desc: 'Jogo aberto e cruzamentos para a área: rende com pontas rápidos e bons cabeceadores, mas cede o meio.' },
};
export const PASS_OPTIONS: Record<PassKey, InstructionOption> = {
  curto: { name: 'Toque curto', desc: 'Posse e paciência: meio-campo mais forte, menos contra-ataques.' },
  misto: { name: 'Variado', desc: 'Mistura passes curtos e longos.' },
  longo: { name: 'Bola longa', desc: 'Lançamentos nas costas da defesa: muito mais contra-ataques com atacantes rápidos, menos posse.' },
};
export const LINE_OPTIONS: Record<LineKey, InstructionOption> = {
  baixa: { name: 'Linha baixa', desc: 'Defesa recuada: mais sólida e sofre poucos contra-ataques, mas ataca menos.' },
  media: { name: 'Linha média', desc: 'Equilíbrio entre pressão e segurança.' },
  alta: { name: 'Linha alta', desc: 'Adianta a defesa e sufoca o meio, mas deixa espaço nas costas (zagueiros lentos sofrem).' },
};
export const MARK_OPTIONS: Record<MarkKey, InstructionOption> = {
  zona: { name: 'Por zona', desc: 'Cada um cuida do seu setor.' },
  individual: { name: 'Individual', desc: 'Encaixe homem a homem: defesa mais forte com bons marcadores, porém mais faltas e cartões.' },
};

/** Desvio individual de um atributo em relação ao perfil da posição (0 em saves sem atributos). */
function dev(p: Player, k: AttrKey): number {
  const i = ATTR_INDEX[k];
  return p.at && p.at.length > i ? p.at[i] - ATTR_PROFILE[p.pos][i] : 0;
}

export interface SquadProfile {
  /** Pontas (jogadores abertos): velocidade + drible. */
  wide: number;
  /** Meio-campo central: passe. */
  pass: number;
  /** Atacantes: velocidade. */
  speed: number;
  /** Defensores: marcação. */
  mark: number;
  /** Defensores: velocidade (recompor nas costas). */
  defSpeed: number;
  /** Bola aérea: melhor cabeceio relativo. */
  aerial: number;
}

/** Perfil do time em campo (cada valor entre −1 e 1; 0 = típico para o nível dos jogadores). */
export function squadProfile(entries: { p: Player; slot: FormationSlot }[]): SquadProfile {
  const acc = { wide: [0, 0], pass: [0, 0], speed: [0, 0], mark: [0, 0], defSpeed: [0, 0] };
  let aerial = -99;
  const add = (k: keyof typeof acc, v: number) => { acc[k][0] += v; acc[k][1]++; };
  for (const { p, slot } of entries) {
    const pos = slot.pos;
    if (pos === 'GOL') continue;
    const wide = slot.y <= 25 || slot.y >= 75;
    if (wide && pos !== 'ZAG') add('wide', (dev(p, 'vel') + dev(p, 'dri')) / 2);
    if (!wide && (pos === 'MEI' || pos === 'VOL')) add('pass', dev(p, 'pas'));
    if (pos === 'ATA') add('speed', dev(p, 'vel'));
    if (pos === 'ZAG' || pos === 'LAT') { add('mark', dev(p, 'mar')); add('defSpeed', dev(p, 'vel')); }
    aerial = Math.max(aerial, dev(p, 'cab'));
  }
  const n = (k: keyof typeof acc) => clamp((acc[k][1] ? acc[k][0] / acc[k][1] : 0) / 8, -1, 1);
  return { wide: n('wide'), pass: n('pass'), speed: n('speed'), mark: n('mark'), defSpeed: n('defSpeed'), aerial: clamp(aerial / 10, -1, 1) };
}

/** Efeito das instruções para um perfil de elenco. */
export function instructionMods(instr: Instructions, pr: SquadProfile): InstructionMods {
  const m: InstructionMods = { att: 1, mid: 1, def: 1, counterFor: 1, counterAgainst: 1, foul: 1, cross: 0 };
  if (instr.width === 'pontas') { m.att *= 1.01 + 0.03 * pr.wide; m.mid *= 0.975; m.cross = 1 + 0.4 * Math.max(0, pr.aerial); }
  else if (instr.width === 'meio') { m.mid *= 1.02; m.att *= 0.99 + 0.03 * pr.pass; }
  if (instr.pass === 'longo') { m.counterFor *= 1.45 * (1 + 0.4 * pr.speed); m.mid *= 0.95; m.att *= 1.01; }
  else if (instr.pass === 'curto') { m.mid *= 1.02 + 0.03 * pr.pass; m.counterFor *= 0.7; m.att *= 0.99; }
  if (instr.line === 'alta') { m.mid *= 1.03; m.counterAgainst *= 1.35 - 0.3 * pr.defSpeed; }
  else if (instr.line === 'baixa') { m.def *= 1.05; m.att *= 0.96; m.counterAgainst *= 0.65; m.counterFor *= 1.1; }
  if (instr.mark === 'individual') { m.def *= 1.02 + 0.03 * pr.mark; m.foul *= 1.25; }
  return m;
}

/** Entradas (jogador + slot) da escalação salva de um clube. */
function lineupEntries(w: World, club: Club): { p: Player; slot: FormationSlot }[] {
  const slots = shapeOf(club);
  const out: { p: Player; slot: FormationSlot }[] = [];
  club.lineup.forEach((id, i) => {
    const p = id ? w.players[id] : undefined;
    if (p && slots[i]) out.push({ p, slot: slots[i] });
  });
  return out;
}

/** Perfil da escalação atual de um clube. */
export const clubProfile = (w: World, club: Club): SquadProfile => squadProfile(lineupEntries(w, club));

/** Instruções que a CPU escolhe conforme o perfil do elenco e o tamanho do clube. */
export function aiInstructions(w: World, club: Club): Instructions {
  const pr = clubProfile(w, club);
  return {
    width: pr.wide > 0.3 && pr.wide >= pr.pass ? 'pontas' : pr.pass > 0.45 ? 'meio' : 'misto',
    pass: pr.speed > 0.35 ? 'longo' : pr.pass > 0.45 ? 'curto' : 'misto',
    line: club.rep >= 78 && pr.defSpeed > -0.3 ? 'alta' : club.rep <= 50 ? 'baixa' : 'media',
    mark: pr.mark > 0.5 ? 'individual' : 'zona',
  };
}

/** Define as instruções do clube do usuário. */
export function setInstructions(w: World, instr: Partial<Instructions>): void {
  const u = w.clubs[w.userClub];
  u.instr = { ...(u.instr ?? DEFAULT_INSTRUCTIONS), ...instr };
}

export interface InstructionAdvice {
  tone: 'good' | 'warn' | 'info';
  text: string;
}

/** Dicas para o usuário: o que combina (ou não) com o elenco escalado. */
export function instructionAdvice(w: World, club: Club): InstructionAdvice[] {
  const pr = clubProfile(w, club);
  const i = club.instr ?? DEFAULT_INSTRUCTIONS;
  const out: InstructionAdvice[] = [];
  if (pr.wide > 0.25) out.push(i.width === 'pontas' ? { tone: 'good', text: 'Seus pontas são rápidos e driblam bem: o jogo pelas pontas está rendendo.' } : { tone: 'info', text: 'Seus pontas são rápidos e driblam bem: experimente atacar pelas pontas.' });
  if (pr.pass > 0.25) out.push(i.pass === 'curto' || i.width === 'meio' ? { tone: 'good', text: 'Meio-campo de bom passe combina com o toque curto e o jogo pelo meio.' } : { tone: 'info', text: 'Seus meias passam bem: toque curto ou jogo pelo meio devem render mais.' });
  if (pr.speed > 0.25) out.push(i.pass === 'longo' ? { tone: 'good', text: 'Atacantes velozes + bola longa: contra-ataques perigosos.' } : { tone: 'info', text: 'Seus atacantes são velozes: a bola longa gera muitos contra-ataques.' });
  if (i.line === 'alta' && pr.defSpeed < -0.2) out.push({ tone: 'warn', text: 'Zagueiros lentos com linha alta: o time vai sofrer contra-ataques.' });
  if (i.width === 'pontas' && pr.aerial < 0) out.push({ tone: 'warn', text: 'Sem um bom cabeceador, os cruzamentos das pontas perdem força.' });
  if (i.pass === 'longo' && pr.speed < -0.2) out.push({ tone: 'warn', text: 'Bola longa com atacantes lentos rende pouco.' });
  if (pr.mark > 0.3 && i.mark !== 'individual') out.push({ tone: 'info', text: 'Você tem bons marcadores: a marcação individual fortalece a defesa.' });
  if (!out.length) out.push({ tone: 'info', text: 'O elenco não tem um perfil marcante: instruções variadas são uma escolha segura.' });
  return out;
}
