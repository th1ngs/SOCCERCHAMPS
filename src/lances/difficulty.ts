// Dificuldade do bot nos lances: quatro níveis fixos e o modo automático, que se adapta ao desempenho.

export type BotLevel = "facil" | "medio" | "dificil" | "lenda";
export type BotSetting = BotLevel | "auto";

/** Parâmetros da defesa e do goleiro do bot. */
export interface BotParams {
  /** Velocidade máxima dos defensores (m/s). */
  defSpeed: number;
  /** Quanto o marcador mais próximo acelera para cima de quem tem a bola (0-1+). */
  press: number;
  /** Desarmes por segundo colado no jogador (antes do drible dele). */
  tackle: number;
  /** Raio (m) em que um defensor corta um passe. */
  interceptR: number;
  /** Raio (m) em que um defensor bloqueia um chute. */
  blockR: number;
  /** Tempo de reação do goleiro (s). */
  gkReact: number;
  /** Velocidade do mergulho do goleiro (m/s). */
  gkDive: number;
  /** Alcance dos braços do goleiro (m). */
  gkReach: number;
  /** Intervalo (s) entre as leituras do jogo dos defensores. */
  think: number;
  /** Defensores de linha no lance. */
  defenders: number;
  /** Distância (m) da última linha da defesa à frente da bola. */
  lineGap: number;
  /** Quanto o defensor da sobra fica atrás da linha (m): perto de 0 = linha em bloco. */
  cover: number;
  /** Chance por segundo de a linha subir de uma vez (linha de impedimento). */
  trap: number;
  /** Ajudas visuais (linha de impedimento desenhada no gramado): só nos níveis mais fáceis. */
  aids: boolean;
}

export const BOT_LEVELS: BotLevel[] = ["facil", "medio", "dificil", "lenda"];
export const BOT_NAME: Record<BotSetting, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil", lenda: "Lendário", auto: "Automático" };
export const BOT_DESC: Record<BotSetting, string> = {
  facil: "Defesa lenta e goleiro que demora a reagir.",
  medio: "Marcação firme; precisa caprichar no chute.",
  dificil: "Pressão forte, cortes de passe e goleiro rápido.",
  lenda: "Defesa implacável e goleiro de seleção.",
  auto: "Começa no médio e se adapta: acertou, fica mais difícil; errou, alivia.",
};

type Numeric = Omit<BotParams, "aids">;
const PRESETS: Numeric[] = [
  { defSpeed: 4.9, press: 0.7, tackle: 0.55, interceptR: 0.6, blockR: 0.45, gkReact: 0.38, gkDive: 4.4, gkReach: 1.1, think: 0.45, defenders: 2, lineGap: 9.5, cover: 3, trap: 0 },
  { defSpeed: 5.9, press: 0.88, tackle: 1.15, interceptR: 0.9, blockR: 0.58, gkReact: 0.27, gkDive: 5.0, gkReach: 1.12, think: 0.32, defenders: 3, lineGap: 8, cover: 2.2, trap: 0.04 },
  { defSpeed: 6.4, press: 0.97, tackle: 1.6, interceptR: 0.98, blockR: 0.66, gkReact: 0.21, gkDive: 5.6, gkReach: 1.18, think: 0.22, defenders: 3, lineGap: 7, cover: 1.2, trap: 0.1 },
  { defSpeed: 7.3, press: 1.05, tackle: 2.5, interceptR: 1.35, blockR: 0.8, gkReact: 0.12, gkDive: 7.2, gkReach: 1.48, think: 0.14, defenders: 4, lineGap: 6, cover: 0.6, trap: 0.16 },
];

/** Parâmetros para um nível contínuo de 0 (fácil) a 3 (lendário), interpolando os presets. */
export function botParams(level: number): BotParams {
  const l = Math.max(0, Math.min(3, level));
  const i = Math.min(2, Math.floor(l));
  const t = l - i;
  const a = PRESETS[i], b = PRESETS[i + 1];
  const mix = (k: keyof Numeric) => a[k] + (b[k] - a[k]) * t;
  return {
    defSpeed: mix("defSpeed"), press: mix("press"), tackle: mix("tackle"), interceptR: mix("interceptR"), blockR: mix("blockR"),
    gkReact: mix("gkReact"), gkDive: mix("gkDive"), gkReach: mix("gkReach"), think: mix("think"),
    defenders: Math.round(mix("defenders")), lineGap: mix("lineGap"), cover: mix("cover"), trap: mix("trap"),
    aids: l < 1.5,
  };
}

export const levelIndex = (l: BotLevel): number => BOT_LEVELS.indexOf(l);

/** Nome do nível contínuo (para o placar). */
export const levelName = (level: number): string => BOT_NAME[BOT_LEVELS[Math.max(0, Math.min(3, Math.round(level)))]];

/**
 * Dificuldade da partida: fixa ou automática. No automático, cada gol sobe o nível e cada lance perdido
 * alivia (passo menor), para manter os lances disputados sem frustrar.
 */
export class Difficulty {
  level: number;
  readonly setting: BotSetting;
  constructor(setting: BotSetting, base = 1) {
    this.setting = setting;
    this.level = setting === "auto" ? Math.max(0, Math.min(3, base)) : levelIndex(setting);
  }
  params(): BotParams {
    return botParams(this.level);
  }
  /** Registra o resultado de um lance (só mexe no automático). */
  record(goal: boolean): void {
    if (this.setting !== "auto") return;
    this.level = Math.max(0, Math.min(3, this.level + (goal ? 0.4 : -0.22)));
  }
}

const KEY = "scm.lances.bot";
export function loadBotSetting(): BotSetting {
  try {
    const v = localStorage.getItem(KEY);
    return v && (v === "auto" || (BOT_LEVELS as string[]).includes(v)) ? (v as BotSetting) : "auto";
  } catch {
    return "auto";
  }
}
export function saveBotSetting(v: BotSetting): void {
  try { localStorage.setItem(KEY, v); } catch { /* sem armazenamento */ }
}
