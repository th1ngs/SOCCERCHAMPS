import "server-only";
import { randomInt } from "node:crypto";
import { ensureSchema, pool, withTx } from "./db";
import { competitionName } from "@/game/leagues";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** Limite do corpo recebido (JSON puro ou gzip). */
export const MAX_SAVE_BYTES = 8 * 1024 * 1024;
/** Limite do JSON depois de descompactado (o mundo de 700 clubes passa de 15 MB e cresce com o histórico). */
export const MAX_JSON_BYTES = 48 * 1024 * 1024;

export function newCode(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export const CODE_RE = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;

interface SaveMeta {
  managerName: string;
  clubId: string;
  clubName: string;
  division: string;
  season: number;
  week: number;
  titles: { season: number; competition: string; clubId: string; clubName: string }[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Valida o formato mínimo do save e extrai os metadados indexados. */
export function readSave(data: unknown): SaveMeta {
  if (!isObj(data)) throw new SaveError("Save inválido.");
  const clubs = data.clubs, manager = data.manager, userClub = data.userClub;
  if (!isObj(clubs) || !isObj(manager) || typeof userClub !== "string" || !isObj(clubs[userClub])) throw new SaveError("Save inválido.");
  if (typeof data.season !== "number" || typeof data.week !== "number") throw new SaveError("Save inválido.");
  const club = clubs[userClub] as Obj;
  const name = (id: string) => (isObj(clubs[id]) && typeof (clubs[id] as Obj).name === "string" ? ((clubs[id] as Obj).name as string) : id);
  const titles: SaveMeta["titles"] = [];
  const history = Array.isArray(data.history) ? data.history : [];
  for (const h of history) {
    if (!isObj(h) || !isObj(h.user) || typeof h.season !== "number") continue;
    const uc = (h.user as Obj).club;
    if (typeof uc !== "string") continue;
    // Formato v3: campeões por divisão e por copa (ids de competição → id do clube).
    for (const key of ["champions", "cups"] as const) {
      const map = h[key];
      if (!isObj(map)) continue;
      for (const [comp, winner] of Object.entries(map)) {
        if (winner === uc) titles.push({ season: h.season as number, competition: competitionName(comp), clubId: uc, clubName: name(uc) });
      }
    }
  }
  return {
    managerName: String(manager.name ?? "Treinador").slice(0, 40),
    clubId: userClub,
    clubName: String(club.name ?? userClub).slice(0, 60),
    division: typeof club.div === "string" ? competitionName(club.div).slice(0, 40) : "?",
    season: data.season,
    week: data.week,
    titles,
  };
}

export class SaveError extends Error {}
export class NotFoundError extends Error {}

async function writeAchievements(c: import("pg").PoolClient, careerId: string, meta: SaveMeta) {
  for (const t of meta.titles) {
    await c.query(
      `insert into achievements (career_id, manager_name, club_id, club_name, season, competition)
       values ($1, $2, $3, $4, $5, $6) on conflict (career_id, season, competition) do nothing`,
      [careerId, meta.managerName, t.clubId, t.clubName, t.season, t.competition],
    );
  }
}

export async function createCareer(data: unknown) {
  const meta = readSave(data);
  await ensureSchema();
  return withTx(async (c) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      const r = await c.query<{ id: string; updated_at: Date }>(
        `insert into careers (code, manager_name, club_id, club_name, division, season, week, titles, data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (code) do nothing returning id, updated_at`,
        [code, meta.managerName, meta.clubId, meta.clubName, meta.division, meta.season, meta.week, meta.titles.length, data],
      );
      if (r.rowCount) {
        await writeAchievements(c, r.rows[0].id, meta);
        return { code, updatedAt: r.rows[0].updated_at.toISOString() };
      }
    }
    throw new Error("Não foi possível gerar um código único.");
  });
}

export async function updateCareer(code: string, data: unknown) {
  const meta = readSave(data);
  await ensureSchema();
  return withTx(async (c) => {
    const r = await c.query<{ id: string; updated_at: Date }>(
      `update careers set manager_name = $2, club_id = $3, club_name = $4, division = $5, season = $6, week = $7,
         titles = $8, data = $9, updated_at = now()
       where code = $1 returning id, updated_at`,
      [code, meta.managerName, meta.clubId, meta.clubName, meta.division, meta.season, meta.week, meta.titles.length, data],
    );
    if (!r.rowCount) throw new NotFoundError("Carreira não encontrada.");
    await writeAchievements(c, r.rows[0].id, meta);
    return { code, updatedAt: r.rows[0].updated_at.toISOString() };
  });
}

export async function getCareer(code: string) {
  await ensureSchema();
  const r = await pool().query<{ data: unknown; updated_at: Date }>(`select data, updated_at from careers where code = $1`, [code]);
  if (!r.rowCount) throw new NotFoundError("Carreira não encontrada.");
  return { data: r.rows[0].data, updatedAt: r.rows[0].updated_at.toISOString() };
}

export interface HallOfFame {
  managers: { managerName: string; clubName: string; clubId: string; season: number; titles: number }[];
  recent: { managerName: string; clubName: string; clubId: string; season: number; competition: string; at: string }[];
}

export async function hallOfFame(): Promise<HallOfFame> {
  await ensureSchema();
  const [top, recent] = await Promise.all([
    pool().query(
      `select manager_name, club_name, club_id, season, titles from careers
       where titles > 0 order by titles desc, season asc, updated_at asc limit 20`,
    ),
    pool().query(
      `select manager_name, club_name, club_id, season, competition, created_at from achievements
       order by created_at desc limit 20`,
    ),
  ]);
  return {
    managers: top.rows.map((r) => ({ managerName: r.manager_name, clubName: r.club_name, clubId: r.club_id, season: r.season, titles: r.titles })),
    recent: recent.rows.map((r) => ({
      managerName: r.manager_name, clubName: r.club_name, clubId: r.club_id, season: r.season, competition: r.competition, at: (r.created_at as Date).toISOString(),
    })),
  };
}
