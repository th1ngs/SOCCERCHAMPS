import assert from 'node:assert/strict';
import { CLUBS, DIVISION_IDS, LEAGUE_IDS, LEAGUES, WORLD_VERSION, migrateWorld, newSeason, newWorld, startSeason } from '../src/game';
import type { World } from '../src/game';

assert.equal(LEAGUE_IDS.length, 13);
assert.equal(DIVISION_IDS.length, 27);
assert.equal(CLUBS.length, 432);
assert.equal(new Set(CLUBS.map((club) => club.id)).size, CLUBS.length);
for (const league of LEAGUE_IDS) {
  const clubs = CLUBS.filter((club) => club.league === league);
  assert.equal(clubs.length, LEAGUES[league].divisions.length * 16);
  for (const club of clubs) assert.equal(CLUBS.find((other) => other.id === club.rival)?.league, league);
}

const original = newWorld('Teste', CLUBS[0].id);
startSeason(original);
assert.equal(Object.keys(original.clubs).length, 432);
assert.equal(original.weeks.filter((week) => week?.type === 'league').length, 30);

// Simula um save v6: as sete ligas novas não existiam no mundo salvo.
const legacy = JSON.parse(JSON.stringify(original)) as World;
const oldLeagues = new Set(LEAGUE_IDS.slice(0, 6));
for (const club of Object.values(legacy.clubs)) {
  if (oldLeagues.has(club.league)) continue;
  for (const id of [...club.squad, ...club.youth]) delete legacy.players[id];
  delete legacy.clubs[club.id];
}
legacy.version = 6;
legacy.week = 1;
for (const week of legacy.weeks) if (week) week.matches = week.matches.filter((match) => legacy.clubs[match.h] && legacy.clubs[match.a]);
for (const comp of Object.keys(legacy.cups)) if (comp !== 'cont' && !oldLeagues.has(comp.slice(4) as (typeof LEAGUE_IDS)[number])) delete legacy.cups[comp as keyof typeof legacy.cups];
if (legacy.cups.cont) {
  legacy.cups.cont.entrants = legacy.cups.cont.entrants.filter((id) => legacy.clubs[id]);
  legacy.cups.cont.alive = legacy.cups.cont.alive.filter((id) => legacy.clubs[id]);
}
const preseason = JSON.parse(JSON.stringify(legacy)) as World;
preseason.week = 0;
migrateWorld(preseason);
assert.equal(Object.keys(preseason.clubs).length, 432);
assert.equal(preseason.weeks[1]?.matches.length, 27 * 8);
const scheduleBefore = legacy.weeks[1]?.matches.length;
migrateWorld(legacy);
assert.equal(legacy.version, WORLD_VERSION);
assert.equal(Object.keys(legacy.clubs).length, 208);
assert.equal(legacy.weeks[1]?.matches.length, scheduleBefore);
assert.match(legacy.inbox[0].title, /novas ligas a caminho/i);
newSeason(legacy);
assert.equal(Object.keys(legacy.clubs).length, 432);
for (const division of DIVISION_IDS) {
  assert.equal(Object.values(legacy.clubs).filter((club) => club.div === division).length, 16);
  assert.equal(legacy.weeks[1]?.matches.filter((match) => match.comp === division).length, 8);
}
assert.equal(Object.keys(legacy.cups).length, 14);

console.log('13 ligas, 27 divisões e migração de saves v6: OK');
