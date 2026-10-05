// Patrocínio master escolhido pelo usuário (v10): no começo de cada contrato chegam três propostas
// com perfis diferentes, e o usuário escolhe uma. A CPU continua com o patrocínio automático (finance.ts).
import { sponsorValue } from './finance';
import { compWith } from './leagues';
import type { Club, LeagueId, SponsorDeal, SponsorKind, World } from './types';
import { pick, rand } from './util';
import { addMoney, pushMessage, user } from './world';

const BRANDS: Record<'global' | LeagueId, string[]> = {
  global: ['Orbita Telecom', 'Vértice Bank', 'Nébula Bet', 'Atlas Seguros', 'Pulsar Energia', 'Horizonte Air', 'Kairo Motors', 'Lumen Tech'],
  bra: ['Banco Ipê', 'Cerrado Agro', 'Guaraná Tupã', 'Viação Estrela', 'Farmácias Aurora', 'Construtora Baobá'],
  arg: ['Banco Pampa', 'Yerba Andina', 'Seguros Río', 'Petrolera Sur'],
  por: ['Banco Atlântico', 'Vinhos Douro', 'Telecom Lusa'],
  esp: ['Banco Meseta', 'Energía Íbera', 'Aerolíneas Sol'],
  eng: ['Thames Capital', 'Albion Air', 'Crown Insurance'],
  ita: ['Banca Tevere', 'Moda Sforza', 'Autostrade Nord'],
  ger: ['Rhein Bank', 'Adler Motorwerke', 'Nordwind Energie'],
  fra: ['Banque Lumière', 'Air Provence', 'Maison Orée'],
  ned: ['Polder Bank', 'Tulp Energie'],
  bel: ['Banque Ardenne', 'Brasserie Escaut'],
  tur: ['Boğaz Bank', 'Anadolu Hava'],
  sco: ['Highland Bank', 'Loch Distillers'],
  gre: ['Aegean Bank', 'Olympos Shipping'],
};

export const SPONSOR_KINDS: Record<SponsorKind, { name: string; desc: string }> = {
  fixo: { name: 'Valor fixo', desc: 'O maior valor garantido por semana, por uma temporada. Sem bônus.' },
  desempenho: { name: 'Por desempenho', desc: 'Base menor, mas paga por vitória, por título e por meta da diretoria cumprida.' },
  longo: { name: 'Longo prazo', desc: 'Contrato de 3 temporadas: valor estável mesmo se o time cair, com bônus pela meta.' },
};

const round1k = (v: number): number => Math.round(v / 1000) * 1000;

/** Três propostas (uma de cada tipo) pelo valor de mercado do clube. */
export function makeSponsorOffers(w: World, c: Club): SponsorDeal[] {
  const v = sponsorValue(c) * rand(0.95, 1.08);
  const names = [...BRANDS[c.league], ...BRANDS.global];
  const used = new Set<string>();
  const brand = () => { let b = pick(names); for (let k = 0; used.has(b) && k < 20; k++) b = pick(names); used.add(b); return b; };
  const deal = (kind: SponsorKind, weekly: number, winBonus: number, titleBonus: number, goalBonus: number, seasons: number): SponsorDeal => ({
    id: `sp${w.season}${kind}${Math.floor(Math.random() * 1e6).toString(36)}`,
    brand: brand(), kind, weekly: round1k(weekly), winBonus: round1k(winBonus), titleBonus: round1k(titleBonus), goalBonus: round1k(goalBonus),
    seasons, seasonsLeft: seasons,
  });
  return [
    deal('fixo', v * 1.04, 0, 0, 0, 1),
    deal('desempenho', v * 0.7, v * 0.85, v * 7, v * 5, 1),
    deal('longo', v * 0.95, 0, 0, v * 3, 3),
  ];
}

/** Abre a escolha de patrocínio (início da carreira ou fim do contrato). */
export function offerSponsors(w: World): void {
  if (w.playerCareer) return;
  const u = user(w);
  w.sponsorOffers = makeSponsorOffers(w, u);
  pushMessage(w, {
    kind: 'board',
    title: 'Escolha o patrocinador master',
    body: `Três empresas querem estampar a camisa do ${u.name}: ${w.sponsorOffers.map((d) => `${d.brand} (${SPONSOR_KINDS[d.kind].name.toLowerCase()})`).join(', ')}. Escolha em Clube → Patrocínio até o fim da janela; sem escolha, a diretoria assina a de valor fixo.`,
    link: { href: '/jogo/clube#patrocinio', label: 'Escolher patrocínio' },
  });
}

/** Assina uma das propostas. */
export function chooseSponsor(w: World, id: string): boolean {
  const deal = w.sponsorOffers?.find((d) => d.id === id);
  if (!deal) return false;
  const u = user(w);
  u.sponsorDeal = { ...deal, seasonsLeft: deal.seasons };
  u.sponsor = deal.weekly;
  w.sponsorOffers = null;
  pushMessage(w, { kind: 'board', title: `Novo patrocinador: ${deal.brand}`, body: `Contrato de ${deal.seasons} temporada(s): ${sponsorSummary(deal)}.` });
  return true;
}

/** "R$ 300 mil/sem + R$ 200 mil por vitória…" */
export function sponsorSummary(d: SponsorDeal): string {
  const fmt = (v: number) => (v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi` : `R$ ${Math.round(v / 1000)} mil`);
  return [
    `${fmt(d.weekly)}/sem`,
    d.winBonus ? `${fmt(d.winBonus)} por vitória` : '',
    d.titleBonus ? `${fmt(d.titleBonus)} por título` : '',
    d.goalBonus ? `${fmt(d.goalBonus)} pela meta da diretoria` : '',
  ].filter(Boolean).join(' + ');
}

/** Bônus de vitória (chamado nos jogos do usuário). */
export function sponsorWin(w: World): void {
  const d = user(w).sponsorDeal;
  if (d?.winBonus) addMoney(w, w.userClub, d.winBonus, 'sponsor');
}

/** Bônus de título. */
export function sponsorTitle(w: World, comp: string): void {
  const d = user(w).sponsorDeal;
  if (!d?.titleBonus) return;
  addMoney(w, w.userClub, d.titleBonus, 'sponsor');
  pushMessage(w, { kind: 'info', title: `Bônus do patrocinador: ${d.brand}`, body: `Pelo título ${compWith('de', comp)}, a ${d.brand} pagou R$ ${(d.titleBonus / 1e6).toFixed(1).replace('.', ',')} mi.` });
}

/** Bônus de meta cumprida (fim de temporada). */
export function sponsorGoal(w: World, success: boolean): void {
  const d = user(w).sponsorDeal;
  if (success && d?.goalBonus) addMoney(w, w.userClub, d.goalBonus, 'sponsor');
}

/**
 * Virada de temporada do usuário: conta uma temporada do contrato. O valor do contrato vale enquanto durar
 * (o "longo prazo" não cai com o rebaixamento); quando acaba, abre propostas novas.
 */
export function sponsorNewSeason(w: World): void {
  if (w.playerCareer) return;
  const u = user(w);
  const d = u.sponsorDeal;
  if (d) {
    d.seasonsLeft--;
    if (d.seasonsLeft > 0) { u.sponsor = d.weekly; return; }
    u.sponsorDeal = null;
  }
  offerSponsors(w);
}

/** Fim da janela sem escolha: a diretoria assina a proposta de valor fixo. */
export function sponsorDeadline(w: World): void {
  const offers = w.sponsorOffers;
  if (!offers?.length) return;
  const fixed = offers.find((d) => d.kind === 'fixo') ?? offers[0];
  chooseSponsor(w, fixed.id);
}
