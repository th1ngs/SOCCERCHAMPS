// Textos e dados de apresentação da página inicial.
import type { FlagCode } from "./Flag";

export interface LeagueShowcase {
  code: FlagCode;
  country: string;
  divisions: string[];
  tagline: string;
  /** Poder financeiro relativo (1–5), só para exibição. */
  money: number;
}

export const LEAGUE_SHOWCASE: LeagueShowcase[] = [
  { code: "bra", country: "Brasil", divisions: ["Série A", "Série B", "Série C"], tagline: "Três divisões, clássicos regionais e o sonho do acesso.", money: 3 },
  { code: "eng", country: "Inglaterra", divisions: ["Premier Division", "First Division"], tagline: "A liga mais rica: cotas de TV que mudam um clube.", money: 5 },
  { code: "esp", country: "Espanha", divisions: ["Primera División", "Segunda División"], tagline: "Toque de bola, gigantes históricos e muita técnica.", money: 4 },
  { code: "ita", country: "Itália", divisions: ["Serie A", "Serie B"], tagline: "Defesas de ferro e dérbis que param cidades.", money: 4 },
  { code: "por", country: "Portugal", divisions: ["Primeira Liga", "Segunda Liga"], tagline: "Vitrine de talentos: revele e venda para a Europa.", money: 2 },
  { code: "arg", country: "Argentina", divisions: ["Primera División", "Primera Nacional"], tagline: "Garra, estádios lotados e as melhores categorias de base.", money: 2 },
];

export const STATS = [
  { value: "6", label: "ligas nacionais" },
  { value: "13", label: "divisões" },
  { value: "208", label: "clubes fictícios" },
  { value: "5.000+", label: "jogadores" },
  { value: "8", label: "copas por temporada" },
];

export const STEPS = [
  { title: "Escolha seu clube", text: "Comece num gigante cobrado por títulos ou num clube pequeno sonhando com o acesso, em qualquer uma das seis ligas." },
  { title: "Monte o time", text: "Contrate na janela, revele garotos da base, defina escalação, capitão e estilo de jogo, e cuide das finanças." },
  { title: "Faça história", text: "Assista às partidas ao vivo, dispute a Copa dos Campeões e leve seu nome ao Hall da Fama." },
];
