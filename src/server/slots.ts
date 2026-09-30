import "server-only";
import { pool } from "./db";
import { readSave } from "./careers";

export function validSlot(raw: string) {
  const slot = Number(raw);
  return Number.isInteger(slot) && slot >= 1 && slot <= 3 ? slot : null;
}

export async function listSlots(accountId: string) {
  const r = await pool().query<{ slot: number; manager_name: string; club_name: string; season: number; week: number; updated_at: Date }>(
    "select slot, manager_name, club_name, season, week, updated_at from account_saves where account_id = $1 order by slot", [accountId],
  );
  return r.rows.map((x) => ({ slot: x.slot, managerName: x.manager_name, clubName: x.club_name, season: x.season, week: x.week, updatedAt: x.updated_at.toISOString() }));
}

export async function loadSlot(accountId: string, slot: number) {
  const r = await pool().query<{ data: unknown }>("select data from account_saves where account_id = $1 and slot = $2", [accountId, slot]);
  return r.rows[0]?.data ?? null;
}

export async function saveSlot(accountId: string, slot: number, data: unknown) {
  const meta = readSave(data);
  await pool().query(
    `insert into account_saves (account_id, slot, manager_name, club_name, season, week, data)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (account_id, slot) do update set manager_name = excluded.manager_name,
     club_name = excluded.club_name, season = excluded.season, week = excluded.week,
     data = excluded.data, updated_at = now()`,
    [accountId, slot, meta.managerName, meta.clubName, meta.season, meta.week, data],
  );
  return { slot };
}
