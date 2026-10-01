import { DIVISIONS, DIVISION_IDS, LEAGUES, isDivision } from './leagues';
import { NAMES_BY_NAT } from './names';
import type { AwardPlayer, AwardRankingEntry, Competition, DivisionId, Player, Position, SeasonAwards, TableRow, World } from './types';

const avg = (p: Player): number => p.s.apps ? p.s.rsum / p.s.apps : 0;
const DIVISION_WEIGHT = [1, 0.72, 0.52];
/** Importância da liga: nível da divisão domina; prestígio do país só desempata ligas do mesmo nível. */
const divisionWeight = (div: DivisionId): number => {
  const info = DIVISIONS[div];
  return (DIVISION_WEIGHT[info.level - 1] ?? 0.52) * (0.92 + (LEAGUES[info.league].wealth - 0.75) * 0.16);
};

interface Contribution { goals: number; assists: number; goalPoints: number; assistPoints: number }
const emptyContribution = (): Contribution => ({ goals: 0, assists: 0, goalPoints: 0, assistPoints: 0 });

/** Gols e assistências recebem o peso da competição, do adversário e da fase decisiva. */
function contributions(w: World): Map<string, Contribution> {
  const out = new Map<string, Contribution>();
  const row = (pid: string) => {
    let value = out.get(pid);
    if (!value) { value = emptyContribution(); out.set(pid, value); }
    return value;
  };
  const matchWeight = (comp: Competition, round: number, opponent: string, close: boolean) => {
    const base = isDivision(comp) ? divisionWeight(comp) : comp === 'cont'
      ? 1.45 + round * 0.12
      : 1.05 + round * 0.08;
    const difficulty = 0.88 + (w.clubs[opponent]?.rep ?? 60) / 300;
    return base * difficulty * (close ? 1.08 : 1);
  };
  for (const week of w.weeks) {
    if (!week) continue;
    for (const match of week.matches) {
      if (!match.played || !match.goals.length) continue;
      const close = match.hs != null && match.as != null && Math.abs(match.hs - match.as) <= 1;
      for (const [pid, side, , assist, penalty] of match.goals) {
        const opponent = side === 0 ? match.a : match.h;
        const weight = matchWeight(match.comp, week.round, opponent, close);
        const scorer = row(pid);
        scorer.goals++;
        scorer.goalPoints += weight * (penalty ? 0.85 : 1);
        if (assist) {
          const maker = row(assist);
          maker.assists++;
          maker.assistPoints += weight;
        }
      }
    }
  }
  // Saves antigos podem não trazer todos os lances; os totais da temporada continuam valendo.
  for (const p of Object.values(w.players)) {
    if (!p.s.goals && !p.s.assists) continue;
    const value = row(p.id);
    const weight = p.clubId && w.clubs[p.clubId] ? divisionWeight(w.clubs[p.clubId].div) : 1;
    value.goalPoints += Math.max(0, p.s.goals - value.goals) * weight;
    value.assistPoints += Math.max(0, p.s.assists - value.assists) * weight;
  }
  return out;
}

function clubResults(w: World, tables: Record<DivisionId, TableRow[]>): Map<string, number> {
  const out = new Map<string, number>();
  for (const div of DIVISION_IDS) {
    const rows = tables[div];
    for (const [index, row] of rows.entries()) {
      const rank = rows.length > 1 ? (rows.length - 1 - index) / (rows.length - 1) : 1;
      out.set(row.id, rank * 2.5 * divisionWeight(div) + (index === 0 ? 3 * divisionWeight(div) : 0));
    }
  }
  for (const [comp, cup] of Object.entries(w.cups)) {
    if (!cup?.champion) continue;
    out.set(cup.champion, (out.get(cup.champion) ?? 0) + (comp === 'cont' ? 6 : 2.5));
  }
  return out;
}

/** Pontuação da Bola de Ouro: rendimento, produção, frequência, liga e títulos. */
function playerScore(w: World, p: Player, impact: Map<string, Contribution>, results: Map<string, number>): AwardRankingEntry['breakdown'] {
  const league = p.clubId && w.clubs[p.clubId] ? divisionWeight(w.clubs[p.clubId].div) : 1;
  const c = impact.get(p.id) ?? emptyContribution();
  const attendance = Math.min(1, p.s.apps / 28);
  const rating = Math.max(0, avg(p) - 6) * 9 * league * Math.sqrt(attendance);
  const games = Math.min(p.s.apps, 40) * 0.22 * league;
  const goals = c.goalPoints * 1.15;
  const assists = c.assistPoints * 0.75;
  const campaign = (results.get(p.clubId ?? '') ?? 0) * attendance;
  return { rating, games, goals, assists, campaign };
}
const totalScore = (parts: AwardRankingEntry['breakdown']): number => Object.values(parts).reduce((sum, points) => sum + points, 0);
const roundScore = (value: number): number => Math.round(value * 10) / 10;
const snapshot = (p: Player): AwardPlayer => ({
  id: p.id, name: p.name, club: p.clubId || '', pos: p.pos, age: p.age,
  apps: p.s.apps, goals: p.s.goals, assists: p.s.assists,
  avg: Math.round(avg(p) * 100) / 100,
});

function coachName(w: World, clubId: string): string {
  if (clubId === w.userClub && !w.playerCareer) return w.manager.name;
  const club = w.clubs[clubId];
  const names = NAMES_BY_NAT[club.league];
  const hash = [...club.id].reduce((n, char) => Math.imul(n, 31) + char.charCodeAt(0) | 0, 17) >>> 0;
  return `${names.FIRST[hash % names.FIRST.length]} ${names.LAST[(hash >>> 8) % names.LAST.length]}`;
}

/** Gala anual calculada com os jogos disputados, antes de zerar as estatísticas da temporada. */
export function seasonAwards(w: World, tables: Record<DivisionId, TableRow[]>): SeasonAwards {
  const impact = contributions(w);
  const results = clubResults(w, tables);
  const played = Object.values(w.players).filter((p) => p.clubId && w.clubs[p.clubId] && p.s.apps >= 8);
  const scores = new Map(played.map((p) => [p.id, playerScore(w, p, impact, results)]));
  const ranked = played.slice().sort((a, b) => totalScore(scores.get(b.id)!) - totalScore(scores.get(a.id)!) || b.s.apps - a.s.apps || a.id.localeCompare(b.id));
  const young = ranked.find((p) => p.age <= 21) ?? null;
  const player = ranked.find((p) => p.s.apps >= 15) ?? ranked[0] ?? null;
  const ranking = ranked.filter((p) => p.s.apps >= 15 || p.id === player?.id).slice(0, 10).map((p): AwardRankingEntry => {
    const raw = scores.get(p.id)!;
    const breakdown = {
      rating: roundScore(raw.rating), goals: roundScore(raw.goals), assists: roundScore(raw.assists),
      games: roundScore(raw.games), campaign: roundScore(raw.campaign),
    };
    return { player: snapshot(p), points: roundScore(totalScore(raw)), breakdown };
  });
  const goalkeeper = ranked.find((p) => p.pos === 'GOL' && p.s.apps >= 12) ?? ranked.find((p) => p.pos === 'GOL') ?? null;
  const goldenBoot = played.filter((p) => p.s.goals > 0).sort((a, b) =>
    (impact.get(b.id)?.goalPoints ?? 0) - (impact.get(a.id)?.goalPoints ?? 0)
    || b.s.goals - a.s.goals || b.s.assists - a.s.assists || a.id.localeCompare(b.id))[0] ?? null;

  const positions: Position[] = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  const chosen = new Set<string>();
  const team: AwardPlayer[] = [];
  for (const pos of positions) {
    const pick = ranked.find((p) => p.pos === pos && !chosen.has(p.id)) ?? ranked.find((p) => !chosen.has(p.id));
    if (pick) { chosen.add(pick.id); team.push(snapshot(pick)); }
  }

  const cupWins = new Map<string, number>();
  for (const [comp, cup] of Object.entries(w.cups)) if (cup?.champion) {
    cupWins.set(cup.champion, (cupWins.get(cup.champion) ?? 0) + (comp === 'cont' ? 0.7 : 0.3));
  }
  const campaigns = DIVISION_IDS.flatMap((div) => {
    const rows = tables[div];
    const reps = rows.map((r) => w.clubs[r.id].rep);
    const minRep = Math.min(...reps), maxRep = Math.max(...reps);
    return rows.map((row, index) => {
      const club = w.clubs[row.id];
      const ppg = row.j ? row.p / row.j : 0;
      const weight = divisionWeight(div);
      const cupBonus = cupWins.get(row.id) ?? 0;
      const clubScore = (ppg + (row.j ? (row.gf - row.ga) / row.j * 0.12 : 0) + (index === 0 ? 0.2 : 0)) * weight + cupBonus;
      const expectation = maxRep > minRep ? (club.rep - minRep) / (maxRep - minRep) : 0.5;
      const result = rows.length > 1 ? (rows.length - 1 - index) / (rows.length - 1) : 1;
      const managerScore = ((result - expectation) * 0.9 + ppg * 0.55 + (index === 0 ? 0.35 : 0)) * weight + cupBonus;
      return { id: row.id, clubScore, managerScore };
    });
  });
  campaigns.sort((a, b) => b.clubScore - a.clubScore || a.id.localeCompare(b.id));
  const club = campaigns[0]?.id ?? null;
  campaigns.sort((a, b) => b.managerScore - a.managerScore || a.id.localeCompare(b.id));
  const managerClub = campaigns[0]?.id ?? null;

  return {
    young: young ? snapshot(young) : null,
    player: player ? snapshot(player) : null,
    goalkeeper: goalkeeper ? snapshot(goalkeeper) : null,
    goldenBoot: goldenBoot ? snapshot(goldenBoot) : null,
    goldenBootPoints: goldenBoot ? Math.round((impact.get(goldenBoot.id)?.goalPoints ?? 0) * 10) / 10 : null,
    club,
    manager: managerClub ? { name: coachName(w, managerClub), club: managerClub } : null,
    team,
    ranking,
  };
}
