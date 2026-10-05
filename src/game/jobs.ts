// Vagas de treinador (v10): clubes que demitiram o técnico abrem vagas; o usuário se candidata e a
// diretoria responde na semana seguinte, pela reputação do treinador comparada ao tamanho do clube.
import { isDivision, prestigeOf } from './leagues';
import type { Club, Vacancy, World } from './types';
import { clamp, pick, shuffle } from './util';
import { pushMessage, table, user } from './world';

/** Quantas vagas ficam abertas e de quanto em quanto tempo o quadro muda. */
export const VACANCY_COUNT = 8;
export const VACANCY_EVERY = 5;
/** Candidaturas em análise ao mesmo tempo. */
export const MAX_APPLICATIONS = 3;

/**
 * Reputação do treinador (20-100): o tamanho do clube que dirige, os títulos (pesados pela importância),
 * as metas cumpridas e a confiança atual da diretoria.
 */
export function managerRep(w: World): number {
  const u = user(w);
  const titles = (w.records?.titles ?? []).reduce((s, t) => s + titleWeight(t.comp), 0);
  const seasons = w.history.filter((h) => h.user.club);
  const ok = seasons.filter((h) => h.user.success).length;
  const bad = seasons.length - ok;
  return Math.round(clamp(prestigeOf(u) * 0.55 + 12 + titles * 4 + ok * 2.5 - bad * 3 + (w.board.conf - 50) / 8, 20, 100));
}

/** Peso de um título pelo nome (o histórico guarda nomes). */
function titleWeight(name: string): number {
  if (/Liga dos Campeões|Libertadores|Intercontinental|Copa dos Campeões/.test(name)) return 2;
  if (/Liga Europa|Sul-Americana/.test(name)) return 1.4;
  if (/^Copa (do|da|de)|Taça de Portugal|Copa do Rei|Copa Argentina/.test(name) && !/Liga|Nordeste/.test(name)) return 1.2;
  if (/Campeonato|Supercopa|Supertaça|Copa da Liga|Taça da Liga|Nordeste/.test(name)) return 0.5;
  return 1.5; // ligas
}

/** Chance (0-1) de a diretoria aceitar o treinador. */
export function jobChance(w: World, clubId: string): number {
  const c = w.clubs[clubId];
  if (!c || clubId === w.userClub) return 0;
  const gap = managerRep(w) - (prestigeOf(c) * 0.55 + 12);
  return clamp(0.5 + gap / 25, 0.03, 0.97);
}

export const chanceLabel = (p: number): string => (p >= 0.7 ? 'Alta' : p >= 0.4 ? 'Média' : p >= 0.15 ? 'Baixa' : 'Remota');

/** Clube em crise: posição bem pior que a esperada pela reputação. */
function crises(w: World): Map<string, number> {
  const out = new Map<string, number>();
  const byDiv = new Map<string, Club[]>();
  for (const c of Object.values(w.clubs)) byDiv.set(c.div, [...(byDiv.get(c.div) ?? []), c]);
  for (const [div, clubs] of byDiv) {
    const t = table(w, div as Club['div']);
    if (!t.some((r) => r.j > 0)) continue;
    const byRep = clubs.slice().sort((a, b) => b.rep - a.rep).map((c) => c.id);
    t.forEach((r, i) => out.set(r.id, i + 1 - (byRep.indexOf(r.id) + 1)));
  }
  return out;
}

/** Renova o quadro de vagas: clubes em crise primeiro (técnico demitido) e algumas saídas por outros motivos. */
export function refreshVacancies(w: World): void {
  if (w.playerCareer) return;
  const keep = (w.vacancies ?? []).filter((v) => w.clubs[v.club] && v.club !== w.userClub && (w.applications ?? []).some((a) => a.club === v.club && a.status === 'pending'));
  const taken = new Set([w.userClub, ...keep.map((v) => v.club)]);
  const clubs = Object.values(w.clubs).filter((c) => !taken.has(c.id) && isDivision(c.div));
  const crisisOf = crises(w);
  const worst = clubs.map((c) => ({ c, k: crisisOf.get(c.id) ?? 0 })).filter((x) => x.k >= 5).sort((a, b) => b.k - a.k).slice(0, 5);
  const out: Vacancy[] = keep.slice();
  for (const { c } of worst) out.push({ club: c.id, reason: 'Técnico demitido após a má campanha', season: w.season, week: w.week });
  const reasons = ['Técnico aceitou proposta de outro clube', 'Técnico pediu demissão', 'Fim de ciclo: a diretoria quer um novo projeto', 'Técnico se aposentou'];
  const near = shuffle(clubs.filter((c) => !out.some((v) => v.club === c.id) && Math.abs(prestigeOf(c) - prestigeOf(user(w))) <= 18));
  for (const c of near) {
    if (out.length >= VACANCY_COUNT) break;
    out.push({ club: c.id, reason: pick(reasons), season: w.season, week: w.week });
  }
  w.vacancies = out.slice(0, VACANCY_COUNT);
}

/** Candidata-se a uma vaga. Devolve o motivo da recusa ou null. */
export function applyForJob(w: World, clubId: string): string | null {
  if (w.playerCareer) return 'Na carreira de jogador não há vagas de treinador.';
  if (!w.vacancies?.some((v) => v.club === clubId)) return 'Essa vaga já foi preenchida.';
  const apps = (w.applications ??= []);
  if (apps.some((a) => a.club === clubId && a.season === w.season)) return 'Você já se candidatou a essa vaga nesta temporada.';
  if (apps.filter((a) => a.status === 'pending').length >= MAX_APPLICATIONS) return `No máximo ${MAX_APPLICATIONS} candidaturas em análise ao mesmo tempo.`;
  apps.push({ club: clubId, season: w.season, week: w.week, status: 'pending' });
  return null;
}

/** Responde as candidaturas (chamado no fim da semana) e expira propostas antigas. */
export function processApplications(w: World): void {
  const apps = w.applications ?? [];
  for (const a of apps) {
    if (a.status !== 'pending' || (a.season === w.season && a.week >= w.week)) continue;
    const c = w.clubs[a.club];
    if (!c) { a.status = 'rejected'; continue; }
    const ok = Math.random() < jobChance(w, a.club);
    a.status = ok ? 'offer' : 'rejected';
    a.expires = w.week + 3;
    pushMessage(w, ok
      ? { kind: 'board', title: `Proposta do ${c.name}!`, body: `A diretoria do ${c.name} aprovou a sua candidatura e quer você no comando. A proposta vale por 3 semanas.`, link: { href: '/jogo/carreira#vagas', label: 'Ver proposta' } }
      : { kind: 'board', title: `${c.name} recusou a candidatura`, body: `A diretoria do ${c.name} preferiu outro treinador. Títulos e metas cumpridas aumentam a sua reputação.`, link: { href: '/jogo/carreira#vagas', label: 'Ver vagas' } });
  }
  for (const a of apps) if (a.status === 'offer' && a.expires != null && (a.season !== w.season || w.week > a.expires)) a.status = 'expired';
  // Guarda só as da temporada atual e da anterior.
  w.applications = apps.filter((a) => a.season >= w.season - 1);
}

/** Proposta aceita: tira a vaga do quadro (a troca de clube é feita por switchClub). */
export function acceptJob(w: World, clubId: string): boolean {
  const a = w.applications?.find((x) => x.club === clubId && x.status === 'offer');
  if (!a) return false;
  a.status = 'accepted';
  w.vacancies = (w.vacancies ?? []).filter((v) => v.club !== clubId);
  return true;
}

/** Recusa uma proposta. */
export function declineJob(w: World, clubId: string): void {
  const a = w.applications?.find((x) => x.club === clubId && x.status === 'offer');
  if (a) a.status = 'declined';
}
