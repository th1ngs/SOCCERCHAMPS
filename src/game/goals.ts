// Metas da diretoria (v10): além da posição na liga, metas de copas, continental, estadual, finanças, folha,
// base e clássicos. Cada meta tem peso; o resultado ajusta a confiança no fim da temporada.
import { isDerbyClubs } from './engine';
import { clubWages } from './finance';
import { competitionName, isNationalCup, isStateCup, roundNameBySize } from './leagues';
import type { BoardGoal, Club, KnockoutId, World } from './types';
import { clubPlayers, table, user } from './world';

export type GoalState = 'done' | 'on' | 'risk' | 'failed';
export interface GoalProgress {
  state: GoalState;
  text: string;
}

/** Confiança ganha (ou perdida) por ponto de peso de meta cumprida (ou não). */
export const GOAL_CONF = 3;

/** Posição do clube entre os inscritos de uma copa, pela reputação (0 = maior). */
function rankIn(w: World, club: Club, ids: string[]): number {
  return ids.map((id) => w.clubs[id]).filter(Boolean).sort((a, b) => b.rep - a.rep).findIndex((c) => c.id === club.id);
}

/** Fase alvo (tamanho da fase: 4 = semifinal, 1 = título) pelo peso do clube na copa. */
function stageTarget(rank: number, n: number): number {
  const f = rank / Math.max(1, n);
  return f < 0.1 ? 2 : f < 0.25 ? 4 : f < 0.5 ? 8 : 16;
}
const stageLabel = (size: number): string =>
  size <= 1 ? 'conquistar o título' : size === 2 ? 'chegar à final' : size <= 4 ? 'chegar à semifinal' : size <= 8 ? 'chegar às quartas de final' : 'chegar às oitavas de final';

/** Metas da temporada para o clube do usuário (chamado em startSeason/switchClub, depois do objetivo da liga). */
export function makeGoals(w: World): BoardGoal[] {
  const u = user(w);
  const goals: BoardGoal[] = [{ id: 'league', kind: 'league', label: w.board.label, weight: 3, target: w.board.target }];
  const cup = (Object.keys(w.cups) as KnockoutId[]).find((c) => isNationalCup(c) && w.cups[c]?.entrants.includes(u.id));
  if (cup) {
    const e = w.cups[cup]!.entrants;
    const t = stageTarget(rankIn(w, u, e), e.length);
    goals.push({ id: 'cup', kind: 'cup', comp: cup, label: `${competitionName(cup)}: ${stageLabel(t)}`, weight: 1, target: t });
  }
  const cont = (['cont', 'lib', 'eur2', 'sud'] as KnockoutId[]).find((c) => w.cups[c]?.entrants.includes(u.id));
  if (cont) {
    const e = w.cups[cont]!.entrants;
    const t = Math.max(4, stageTarget(rankIn(w, u, e), e.length));
    goals.push({ id: 'cont', kind: 'continental', comp: cont, label: `${competitionName(cont)}: ${stageLabel(t)}`, weight: 1.5, target: t });
  }
  const state = (Object.keys(w.cups) as KnockoutId[]).find((c) => isStateCup(c) && w.cups[c]?.entrants.includes(u.id));
  if (state) {
    const e = w.cups[state]!.entrants;
    const t = rankIn(w, u, e) === 0 ? 1 : rankIn(w, u, e) < 3 ? 2 : 4;
    goals.push({ id: 'state', kind: 'state', comp: state, label: `${competitionName(state)}: ${stageLabel(t)}`, weight: 0.5, target: t });
  }
  goals.push({ id: 'cash', kind: 'finance', label: 'Fechar a temporada com o caixa no azul', weight: 1, target: 0 });
  goals.push({ id: 'wages', kind: 'wages', label: 'Manter a folha dentro do teto salarial da liga', weight: 0.5, target: 0 });
  goals.push({ id: 'youth', kind: 'youth', label: 'Dar 15 jogos a jogadores de até 21 anos', weight: 0.5, target: 15 });
  if (w.clubs[u.rival]) goals.push({ id: 'derby', kind: 'derby', label: `Não perder clássicos para o ${w.clubs[u.rival].name}`, weight: 0.5, target: 0 });
  return goals;
}

/** Menor fase (tamanho) em que o usuário jogou numa copa; 1 se foi campeão. */
function reached(w: World, comp: string): number {
  const cup = w.cups[comp as KnockoutId];
  if (cup?.champion === w.userClub) return 1;
  let best = Infinity;
  for (const wk of w.weeks) for (const m of wk?.matches ?? []) if (m.comp === comp && (m.h === w.userClub || m.a === w.userClub) && m.size) best = Math.min(best, m.size);
  return best;
}

/** Progresso de uma meta agora (ou o veredito, com `final`). */
export function goalProgress(w: World, g: BoardGoal, final = false): GoalProgress {
  const u = user(w);
  switch (g.kind) {
    case 'league': {
      const pos = leaguePos(w);
      if (!pos) return { state: 'on', text: 'A liga ainda não começou.' };
      const ok = pos <= g.target;
      return { state: final ? (ok ? 'done' : 'failed') : ok ? 'on' : pos <= g.target + 2 ? 'risk' : 'failed', text: `${pos}º lugar (meta: até ${g.target}º)` };
    }
    case 'cup': case 'continental': case 'state': {
      const cup = w.cups[g.comp as KnockoutId];
      const best = reached(w, g.comp!);
      const ok = best <= g.target;
      if (ok) return { state: 'done', text: best === 1 ? 'Campeão!' : `Chegou à ${roundNameBySize(best).toLowerCase()}` };
      const alive = !!cup?.alive.includes(u.id) && !cup.champion;
      if (alive && !final) return { state: 'on', text: best < Infinity ? `Vivo: ${roundNameBySize(best).toLowerCase()}` : 'Vivo na copa' };
      return { state: 'failed', text: best < Infinity ? `Eliminado na ${roundNameBySize(best).toLowerCase()}` : 'Eliminado' };
    }
    case 'finance': {
      const ok = u.money >= 0;
      return { state: ok ? (final ? 'done' : 'on') : final ? 'failed' : 'risk', text: ok ? 'Caixa positivo' : 'Caixa no vermelho' };
    }
    case 'wages': {
      const wages = clubWages(w, u);
      const ok = !u.wageCap || wages <= u.wageCap;
      return { state: ok ? (final ? 'done' : 'on') : final ? 'failed' : 'risk', text: ok ? 'Folha dentro do teto' : 'Folha acima do teto' };
    }
    case 'youth': {
      const apps = clubPlayers(w, u).filter((p) => p.age <= 21).reduce((s, p) => s + p.s.apps, 0);
      const ok = apps >= g.target;
      return { state: ok ? 'done' : final ? 'failed' : 'on', text: `${apps} de ${g.target} jogos` };
    }
    case 'derby': {
      let lost = 0, played = 0;
      for (const wk of w.weeks) for (const m of wk?.matches ?? []) {
        if (!m.played || (m.h !== u.id && m.a !== u.id) || !isDerbyClubs(w, m.h, m.a)) continue;
        played++;
        const gf = m.h === u.id ? m.hs! : m.as!, ga = m.h === u.id ? m.as! : m.hs!;
        const pensLost = m.pens ? (m.h === u.id ? m.pens[0] < m.pens[1] : m.pens[1] < m.pens[0]) : false;
        if (gf < ga || (gf === ga && pensLost)) lost++;
      }
      if (lost) return { state: 'failed', text: `${lost} derrota${lost > 1 ? 's' : ''} em ${played} clássico${played > 1 ? 's' : ''}` };
      return { state: final || played ? 'done' : 'on', text: played ? `Invicto em ${played} clássico${played > 1 ? 's' : ''}` : 'Nenhum clássico ainda' };
    }
  }
}

function leaguePos(w: World): number {
  const u = user(w);
  let played = false;
  for (const wk of w.weeks) if (wk?.type === 'league' && wk.matches.some((m) => m.played && m.comp === u.div)) { played = true; break; }
  if (!played) return 0;
  return table(w, u.div).findIndex((r) => r.id === u.id) + 1;
}

/** Avaliação final das metas extras (a da liga é avaliada pela posição em seasonEnd): delta de confiança e resumo. */
export function evaluateGoals(w: World): { delta: number; results: { label: string; ok: boolean; weight: number }[] } {
  const goals = w.board.goals ?? [];
  const results = goals.filter((g) => g.kind !== 'league').map((g) => {
    const p = goalProgress(w, g, true);
    return { label: g.label, ok: p.state === 'done', weight: g.weight };
  });
  const delta = results.reduce((s, r) => s + (r.ok ? GOAL_CONF : -GOAL_CONF) * r.weight, 0);
  return { delta: Math.round(delta), results };
}
