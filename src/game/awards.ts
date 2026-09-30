import { DIVISIONS, DIVISION_IDS } from './leagues';
import { NAMES_BY_NAT } from './names';
import type { AwardPlayer, DivisionId, Player, Position, SeasonAwards, TableRow, World } from './types';

const avg = (p: Player): number => p.s.apps ? p.s.rsum / p.s.apps : 0;
const strength = (w: World, p: Player): number => {
  const div = p.clubId ? w.clubs[p.clubId]?.div : null;
  return div ? (3 - DIVISIONS[div].level) * 0.12 : 0;
};
const score = (w: World, p: Player): number =>
  avg(p) + p.s.goals * 0.035 + p.s.assists * 0.025 + Math.min(p.s.apps, 30) * 0.006 + strength(w, p);
const snapshot = (p: Player): AwardPlayer => ({
  id: p.id, name: p.name, club: p.clubId || '', pos: p.pos, age: p.age,
  apps: p.s.apps, goals: p.s.goals, assists: p.s.assists,
  avg: Math.round(avg(p) * 100) / 100,
});
const byScore = (w: World, a: Player, b: Player): number => score(w, b) - score(w, a) || b.s.apps - a.s.apps || a.id.localeCompare(b.id);

function coachName(w: World, clubId: string): string {
  if (clubId === w.userClub) return w.manager.name;
  const club = w.clubs[clubId];
  const names = NAMES_BY_NAT[club.league];
  const hash = [...club.id].reduce((n, char) => Math.imul(n, 31) + char.charCodeAt(0) | 0, 17) >>> 0;
  return `${names.FIRST[hash % names.FIRST.length]} ${names.LAST[(hash >>> 8) % names.LAST.length]}`;
}

/** Gala anual calculada com os jogos disputados, antes de zerar as estatísticas da temporada. */
export function seasonAwards(w: World, tables: Record<DivisionId, TableRow[]>): SeasonAwards {
  const played = Object.values(w.players).filter((p) => p.clubId && w.clubs[p.clubId] && p.s.apps >= 8);
  const ranked = played.slice().sort((a, b) => byScore(w, a, b));
  const young = ranked.find((p) => p.age <= 21) ?? null;
  const player = ranked.find((p) => p.s.apps >= 15) ?? ranked[0] ?? null;
  const goalkeeper = ranked.find((p) => p.pos === 'GOL' && p.s.apps >= 12) ?? ranked.find((p) => p.pos === 'GOL') ?? null;
  const goldenBoot = played.filter((p) => p.s.goals > 0).sort((a, b) =>
    b.s.goals - a.s.goals || b.s.assists - a.s.assists || avg(b) - avg(a) || a.id.localeCompare(b.id))[0] ?? null;

  const positions: Position[] = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  const chosen = new Set<string>();
  const team: AwardPlayer[] = [];
  for (const pos of positions) {
    const pick = ranked.find((p) => p.pos === pos && !chosen.has(p.id)) ?? ranked.find((p) => !chosen.has(p.id));
    if (pick) { chosen.add(pick.id); team.push(snapshot(pick)); }
  }

  const cupWins = new Map<string, number>();
  for (const cup of Object.values(w.cups)) if (cup?.champion) cupWins.set(cup.champion, (cupWins.get(cup.champion) ?? 0) + 1);
  const campaigns = DIVISION_IDS.flatMap((div) => {
    const rows = tables[div];
    const reps = rows.map((r) => w.clubs[r.id].rep);
    const minRep = Math.min(...reps), maxRep = Math.max(...reps);
    return rows.map((row, index) => {
      const club = w.clubs[row.id];
      const ppg = row.j ? row.p / row.j : 0;
      const level = DIVISIONS[div].level;
      const cupBonus = (cupWins.get(row.id) ?? 0) * 0.35;
      const clubScore = ppg + (row.j ? (row.gf - row.ga) / row.j * 0.12 : 0) + (3 - level) * 0.18 + cupBonus;
      const expectation = maxRep > minRep ? (club.rep - minRep) / (maxRep - minRep) : 0.5;
      const result = rows.length > 1 ? (rows.length - 1 - index) / (rows.length - 1) : 1;
      const managerScore = (result - expectation) * 0.9 + ppg * 0.55 + (index === 0 ? 0.35 : 0) + cupBonus + (3 - level) * 0.08;
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
    club,
    manager: managerClub ? { name: coachName(w, managerClub), club: managerClub } : null,
    team,
  };
}
