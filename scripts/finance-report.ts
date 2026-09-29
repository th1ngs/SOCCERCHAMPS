// Relatório de finanças por clube: simula temporadas e mostra receitas, folha, teto e caixa por divisão.
//   npx tsx scripts/finance-report.ts [--seasons N]
import * as G from '../src/game';
import type { World } from '../src/game';

const args = process.argv.slice(2);
const i = args.indexOf('--seasons');
const SEASONS = i >= 0 ? Number(args[i + 1]) || 1 : 1;

const w: World = G.newWorld('Relatório', 'anhangabau');
G.startSeason(w);
const start: Record<string, number> = {};
for (const c of Object.values(w.clubs)) start[c.id] = c.money;
const k = (n: number) => (n / 1e6).toFixed(1).padStart(6);

function table(title: string) {
  console.log(`\n${title}`);
  console.log('div   | clube                   | rep | cap   | caixa0 | caixa  | TV/s  | patr/s | com/s | bilh/s | manut | folha/s | teto/s | dívida');
  for (const div of G.DIVISION_IDS) {
    const clubs = Object.values(w.clubs).filter((c) => c.div === div).sort((a, b) => b.rep - a.rep);
    for (const c of [clubs[0], clubs[Math.floor(clubs.length / 2)], clubs[clubs.length - 1]]) {
      const f = G.financeProfile(w, c);
      const kk = (n: number) => (n / 1e3).toFixed(0).padStart(5);
      console.log(`${div.padEnd(5)} | ${c.name.slice(0, 23).padEnd(23)} | ${String(Math.round(c.rep)).padStart(3)} | ${String(c.cap).padStart(5)} | ${k(start[c.id])} | ${k(c.money)} | ${kk(f.tv)} | ${kk(f.sponsor)}  | ${kk(f.commercial)} | ${kk(f.gate)}  | ${kk(f.upkeep)} | ${kk(f.wages)}   | ${kk(f.wageCap)}  | ${c.loan ? k(c.loan.principal) : '     -'}`);
    }
  }
}
table('Início (milhares por semana; caixa em milhões)');
const t0 = Date.now();
for (let s = 0; s < SEASONS; s++) {
  for (;;) {
    G.simulateWeek(w);
    const r = G.endWeek(w);
    if (r.seasonEnd) break;
  }
  G.newSeason(w);
}
table(`Depois de ${SEASONS} temporada(s) (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
const all = Object.values(w.clubs);
console.log(`\nNo vermelho: ${all.filter((c) => c.money < 0).length}/${all.length} • acima do teto: ${all.filter((c) => G.clubWages(w, c) > c.wageCap).length}`);
for (const lg of G.LEAGUE_IDS) {
  const cs = all.filter((c) => c.league === lg);
  const avg = cs.reduce((s, c) => s + c.money, 0) / cs.length;
  console.log(`${lg}: caixa médio ${(avg / 1e6).toFixed(1)} mi, no vermelho ${cs.filter((c) => c.money < 0).length}/${cs.length}`);
}
