import type { MatchResult, SimGoal, World } from "@/game/types";

export interface PostMatchInsight {
  title: string;
  text: string;
}

const name = (w: World, pid: string): string => w.players[pid]?.name ?? "Jogador";
const count = (goals: SimGoal[], side: number, min = -1): number => goals.filter((g) => g.side === side && g.min > min).length;

/** Leitura baseada apenas nos eventos e números da partida, sem atribuir causalidade ao acaso. */
export function postMatchInsights(w: World, result: MatchResult, userSide: number): PostMatchInsight[] {
  const insights: PostMatchInsight[] = [];
  const other = 1 - userSide;
  const goals = result.goals;
  const winningGoal = result.winner >= 0
    ? goals.filter((g) => g.side === result.winner)[count(goals, 1 - result.winner)]
    : undefined;
  if (winningGoal) {
    insights.push({
      title: "Lance decisivo",
      text: `${name(w, winningGoal.pid)} marcou o gol da vitória aos ${winningGoal.min}'${winningGoal.assist ? `, com assistência de ${name(w, winningGoal.assist)}` : ""}.`,
    });
  } else if (goals.length) {
    const leaders = new Map<string, number>();
    for (const g of goals) {
      leaders.set(g.pid, (leaders.get(g.pid) ?? 0) + 1);
      if (g.assist) leaders.set(g.assist, (leaders.get(g.assist) ?? 0) + 0.5);
    }
    const [pid, impact] = [...leaders].sort((a, b) => b[1] - a[1])[0];
    insights.push({ title: "Destaque ofensivo", text: `${name(w, pid)} participou diretamente de ${Math.ceil(impact)} gol${impact > 1 ? "s" : ""}.` });
  } else {
    const standout = [...result.played[0], ...result.played[1]]
      .filter((pid) => w.players[pid])
      .sort((a, b) => (result.ratings[b] ?? 0) - (result.ratings[a] ?? 0))[0];
    if (standout) insights.push({ title: "Destaque do jogo", text: `${name(w, standout)} teve a maior nota em campo: ${(result.ratings[standout] ?? 6).toFixed(1).replace('.', ',')}.` });
  }

  const stats = result.stats;
  if (stats) {
    const xg = stats.xg[userSide], rivalXg = stats.xg[other];
    const shots = stats.shots[userSide], onTarget = stats.onT[userSide];
    let text: string;
    if (xg >= rivalXg + 0.5) text = `A criação funcionou: ${xg.toFixed(2)} xG contra ${rivalXg.toFixed(2)} do adversário.`;
    else if (rivalXg >= xg + 0.5) text = `A defesa cedeu as melhores chances: ${rivalXg.toFixed(2)} xG do adversário contra ${xg.toFixed(2)} do seu time.`;
    else text = `Jogo equilibrado em chances: ${xg.toFixed(2)} xG contra ${rivalXg.toFixed(2)}.`;
    if (xg >= rivalXg + 0.5 && count(goals, userSide) < count(goals, other)) text += " Faltou converter a vantagem em chances.";
    if (rivalXg >= xg + 0.5 && count(goals, userSide) > count(goals, other)) text += " A eficiência no ataque compensou.";
    if (shots >= 5 && onTarget / shots < 0.3) text += ` Só ${onTarget} de ${shots} finalizações foram no alvo.`;
    else if (shots >= 5 && onTarget / shots >= 0.6) text += ` ${onTarget} de ${shots} finalizações foram no alvo.`;
    insights.push({ title: "Leitura tática", text });
  }

  const changes = result.tactics?.filter((t) => t.side === userSide && t.min > 0) ?? [];
  if (changes.length) {
    const last = changes[changes.length - 1];
    const labels = { def: "defensiva", bal: "equilibrada", att: "ofensiva", press: "pressão alta" };
    insights.push({ title: "Ajuste tático", text: `A última mudança para ${labels[last.tactic]} veio aos ${last.min}'. Dali até o fim: ${count(goals, userSide, last.min)} gol(s) marcado(s) e ${count(goals, other, last.min)} sofrido(s).` });
  }

  const subs = result.substitutions?.filter((sub) => sub.side === userSide) ?? [];
  if (subs.length) {
    const direct = subs.map((sub) => {
      const scored = goals.filter((g) => g.side === userSide && g.pid === sub.player && g.min >= sub.min).length;
      const assisted = goals.filter((g) => g.side === userSide && g.assist === sub.player && g.min >= sub.min).length;
      return { sub, scored, assisted };
    });
    const contributors = direct.filter(({ scored, assisted }) => scored || assisted);
    if (contributors.length) {
      for (const { sub, scored, assisted } of contributors) {
        insights.push({ title: "Impacto da substituição", text: `${name(w, sub.player)} entrou aos ${sub.min}' no lugar de ${name(w, sub.out)} e fez ${scored} gol(s) e ${assisted} assistência(s).` });
      }
    } else {
      const first = subs[0];
      insights.push({ title: "Substituições", text: `${subs.length} troca${subs.length > 1 ? "s" : ""} realizada${subs.length > 1 ? "s" : ""}. Após a primeira, aos ${first.min}', o time marcou ${count(goals, userSide, first.min - 1)} e sofreu ${count(goals, other, first.min - 1)} gol(s).` });
    }
  }
  return insights;
}
