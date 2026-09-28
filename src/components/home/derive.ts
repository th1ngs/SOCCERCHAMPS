// Derivações puras do painel inicial.
import { clubPlayers, nextWindow, sum, table, user, WINDOWS, windowOpen } from "@/game";
import type { Player, TableRow, World } from "@/game/types";

export interface MiniTable {
  rows: { pos: number; row: TableRow }[];
  userPos: number;
}

/** Cinco linhas da classificação em volta do usuário. */
export function miniTable(w: World): MiniTable {
  const u = user(w);
  const t = table(w, u.div);
  const pos = t.findIndex((r) => r.id === u.id);
  const start = Math.max(0, Math.min(pos - 2, t.length - 5));
  return { rows: t.slice(start, start + 5).map((row, i) => ({ pos: start + i + 1, row })), userPos: pos + 1 };
}

export interface SquadAlerts {
  size: number;
  short: boolean;
  injured: Player[];
  suspended: Player[];
  /** Pendurados: 2 amarelos (o 3º suspende). */
  hanging: Player[];
  tired: Player[];
  expiring: Player[];
  clean: boolean;
}

export function squadAlerts(w: World): SquadAlerts {
  const u = user(w);
  const players = clubPlayers(w, u).filter(Boolean);
  const injured = players.filter((p) => p.inj > 0);
  const suspended = players.filter((p) => p.susp > 0);
  const hanging = players.filter((p) => p.yc === 2 && !p.susp);
  const tired = players.filter((p) => !p.inj && p.fitness < 70 && u.lineup.includes(p.id));
  const expiring = players.filter((p) => p.contract <= 1);
  const short = players.length < 20;
  return {
    size: players.length,
    short,
    injured,
    suspended,
    hanging,
    tired,
    expiring,
    clean: !short && !injured.length && !suspended.length && !hanging.length && !tired.length && !expiring.length,
  };
}

export const clubScorers = (w: World, n = 3): Player[] =>
  clubPlayers(w, user(w))
    .filter((p) => p && p.s.goals > 0)
    .sort((a, b) => b.s.goals - a.s.goals || b.s.assists - a.s.assists)
    .slice(0, n);

/** Folha salarial semanal (profissionais + base). */
export function weeklyWages(w: World): number {
  const u = user(w);
  return sum(u.squad.concat(u.youth), (id) => w.players[id]?.wage ?? 0);
}

export function windowText(w: World): string {
  if (windowOpen(w)) {
    const win = WINDOWS.find(([a, b]) => w.week >= a && w.week <= b);
    return win ? `Aberta até a semana ${win[1]}` : "Aberta";
  }
  const nx = nextWindow(w);
  return nx ? `Abre na semana ${nx}` : "Fechada até a próxima temporada";
}

/** Texto e tom da confiança da diretoria. */
export function confidenceTone(conf: number): { tone: "bad" | "warn" | "good"; text: string; cls: string } {
  if (conf < 30) return { tone: "bad", cls: "text-danger-400", text: "Você está na corda bamba. Precisa de resultados já." };
  if (conf < 55) return { tone: "warn", cls: "text-warn-400", text: "A diretoria está atenta ao desempenho." };
  return { tone: "good", cls: "text-pitch-400", text: "A diretoria apoia o seu trabalho." };
}
