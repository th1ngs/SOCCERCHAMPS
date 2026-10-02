// Textos e dados de apresentação da página inicial.
import type { FlagCode } from "@/components/ui/Flag";

export interface LeagueShowcase {
  code: FlagCode;
  country: string;
  divisions: string[];
  tagline: string;
  /** Poder financeiro relativo (1–5), só para exibição. */
  money: number;
}

export const LEAGUE_SHOWCASE: LeagueShowcase[] = [
  { code: "bra", country: "Brasil", divisions: ["Série A", "Série B", "Série C", "Série D"], tagline: "Quatro divisões, clássicos regionais e o sonho do acesso.", money: 3 },
  { code: "eng", country: "Inglaterra", divisions: ["Premier Division", "First Division", "Second Division"], tagline: "A liga mais rica: cotas de TV que mudam um clube.", money: 5 },
  { code: "esp", country: "Espanha", divisions: ["Primera División", "Segunda División", "Primera Federación"], tagline: "Toque de bola, gigantes históricos e muita técnica.", money: 4 },
  { code: "ita", country: "Itália", divisions: ["Serie A", "Serie B", "Serie C"], tagline: "Defesas de ferro e dérbis que param cidades.", money: 4 },
  { code: "por", country: "Portugal", divisions: ["Primeira Liga", "Segunda Liga", "Liga 3"], tagline: "Vitrine de talentos: revele e venda para a Europa.", money: 2 },
  { code: "arg", country: "Argentina", divisions: ["Primera División", "Primera Nacional", "Primera B"], tagline: "Garra, estádios lotados e as melhores categorias de base.", money: 2 },
  { code: "ger", country: "Alemanha", divisions: ["Bundesliga", "2. Bundesliga", "3. Liga"], tagline: "Torcida vibrante, estádios cheios e clubes bem estruturados.", money: 5 },
  { code: "fra", country: "França", divisions: ["Ligue 1", "Ligue 2", "National"], tagline: "Talentos jovens, velocidade e grandes centros formadores.", money: 4 },
  { code: "ned", country: "Holanda", divisions: ["Eredivisie", "Eerste Divisie"], tagline: "Futebol ofensivo, base forte e muitos gols.", money: 3 },
  { code: "bel", country: "Bélgica", divisions: ["Pro League", "Challenger Pro League"], tagline: "Revelação de promessas e disputa equilibrada.", money: 3 },
  { code: "tur", country: "Turquia", divisions: ["Süper Lig", "1. Lig"], tagline: "Clássicos intensos e arquibancadas fervendo.", money: 3 },
  { code: "sco", country: "Escócia", divisions: ["Premiership", "Championship"], tagline: "Rivalidades antigas e estádios com muita tradição.", money: 2 },
  { code: "gre", country: "Grécia", divisions: ["Super League", "Super League 2"], tagline: "Pressão da torcida e viagens desafiadoras pelo país.", money: 2 },
];

export const STATS = [
  { value: "13", label: "ligas nacionais" },
  { value: "35", label: "divisões" },
  { value: "700", label: "clubes fictícios" },
  { value: "17.000+", label: "jogadores" },
  { value: "14", label: "copas por temporada" },
];

export const STEPS = [
  { title: "Escolha seu clube", text: "Comece num gigante cobrado por títulos ou num clube pequeno sonhando com o acesso, em qualquer uma das 13 ligas." },
  { title: "Monte o time", text: "Contrate na janela, revele garotos da base, defina escalação, capitão e estilo de jogo, e cuide das finanças." },
  { title: "Faça história", text: "Assista às partidas ao vivo, dispute a Copa dos Campeões e leve seu nome ao Hall da Fama." },
];
