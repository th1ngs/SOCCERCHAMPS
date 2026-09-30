"use client";

import Link from "next/link";
import { ArrowLeft, Bot, ChevronRight, CircleQuestionMark, House, LogOut, Play, RotateCcw, Shuffle, Trophy, Users, Volume2, VolumeX } from "lucide-react";
import type { Level } from "@/arcade/ai";
import { ROUND_NAMES, opponentOf, type ArcadeCup, type CupMatch, type CupScope } from "@/arcade/cup";
import { ARCADE_LEAGUES, LEAGUE_CODE, teamById, teamStars, teamsOfLeague, type ArcadeTeam } from "@/arcade/teams";
import { LEAGUES, divisionName } from "@/game/leagues";
import type { DivisionId, LeagueId } from "@/game/types";
import { Button, IconButton, buttonClasses } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Flag } from "@/components/ui/Flag";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { Panel, PanelTitle } from "./Panel";
import { DURATIONS, type ArcadeSettings } from "./settings";

export type SelectMode = "cpu" | "pvp" | "cup";

function TeamStars({ n }: { n: number }) {
  return (
    <span className="text-[11px] tracking-widest text-gold-400" aria-label={`${n} de 4 estrelas`}>
      {"★".repeat(n)}
      <span className="text-white/15">{"★".repeat(Math.max(0, 4 - n))}</span>
    </span>
  );
}

// ---------- Menu ----------
export function MenuScreen({
  hasCup,
  sound,
  onToggleSound,
  onCup,
  onResumeCup,
  onCpu,
  onPvp,
  onHelp,
}: {
  hasCup: boolean;
  sound: boolean;
  onToggleSound: () => void;
  onCup: () => void;
  onResumeCup: () => void;
  onCpu: () => void;
  onPvp: () => void;
  onHelp: () => void;
}) {
  return (
    <Panel label="Menu principal" className="text-center">
      <IconButton label={sound ? "Desligar som" : "Ligar som"} icon={sound ? <Volume2 /> : <VolumeX />} onClick={onToggleSound} className="absolute right-3 top-3" />
      <h1 className="font-display font-extrabold uppercase italic leading-[0.9]">
        <span className="block text-[clamp(34px,9vw,56px)] tracking-[0.12em] text-snow">Soccer</span>
        <span className="block bg-linear-to-b from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-[clamp(44px,12vw,72px)] tracking-wide text-transparent drop-shadow-[0_4px_0_rgba(0,0,0,.35)]">
          Champs
        </span>
      </h1>
      <p className="mb-6 mt-3 text-mist">Futebol de botão • arraste, mire e solte!</p>
      <div className="flex flex-col gap-2.5">
        <Button variant="primary" size="lg" icon={<Trophy />} onClick={onCup}>
          Copa arcade
        </Button>
        {hasCup && (
          <Button variant="secondary" size="lg" icon={<Play />} onClick={onResumeCup}>
            Continuar Copa
          </Button>
        )}
        <Button variant="secondary" size="lg" icon={<Bot />} onClick={onCpu}>
          Amistoso vs CPU
        </Button>
        <Button variant="secondary" size="lg" icon={<Users />} onClick={onPvp}>
          2 jogadores
        </Button>
        <Button variant="ghost" icon={<CircleQuestionMark />} onClick={onHelp}>
          Como jogar
        </Button>
        <Link href="/" className={buttonClasses("ghost", "md")}>
          <House aria-hidden /> Voltar ao início
        </Link>
      </div>
    </Panel>
  );
}

// ---------- Seleção ----------
const SELECT_TITLES: Record<SelectMode, [string, string]> = {
  cpu: ["Escolha seu time", "Escolha o adversário"],
  pvp: ["Jogador 1: escolha seu time", "Jogador 2: escolha seu time"],
  cup: ["Escolha seu time para a Copa", "Escolha seu time para a Copa"],
};

const LEAGUE_OPTIONS: SegmentedOption<LeagueId>[] = ARCADE_LEAGUES.map((id) => ({
  value: id,
  label: (
    <span className="inline-flex items-center gap-1.5" title={LEAGUES[id].name}>
      <Flag code={id} decorative />
      <span className="sm:hidden">{LEAGUE_CODE[id]}</span>
      <span className="hidden sm:inline">{LEAGUES[id].name}</span>
      <span className="sr-only sm:hidden">{LEAGUES[id].name}</span>
    </span>
  ),
}));

const CUP_SCOPE_OPTIONS: SegmentedOption<CupScope>[] = [
  { value: "mixed", label: "Internacional" },
  { value: "league", label: "Nacional" },
];

/** Times da liga agrupados por divisão (ordem de prestígio). */
function groupByDivision(league: LeagueId): [DivisionId, ArcadeTeam[]][] {
  return LEAGUES[league].divisions.map((d) => [d, teamsOfLeague(league).filter((t) => t.club.div === d)]);
}

function PickSlot({ team, placeholder, tone }: { team?: ArcadeTeam; placeholder: string; tone: "p0" | "p1" }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 ring-1 ring-inset", tone === "p0" ? "ring-snow/40" : "ring-gold-400/60")}>
      {team ? (
        <>
          <Crest club={team.club} size={22} className="shrink-0" />
          <span className="truncate text-sm font-bold">{team.name}</span>
          <Flag code={team.club.league} />
        </>
      ) : (
        <span className="text-sm text-mist">{placeholder}</span>
      )}
    </div>
  );
}

export function SelectScreen({
  mode,
  picks,
  step,
  settings,
  onPick,
  onSetting,
  onStart,
  onBack,
}: {
  mode: SelectMode;
  picks: [string | null, string | null];
  step: number;
  settings: ArcadeSettings;
  onPick: (id: string) => void;
  onSetting: (patch: Partial<ArcadeSettings>) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const ready = mode === "cup" ? !!picks[0] : !!(picks[0] && picks[1]);
  const sub =
    mode === "cup"
      ? settings.cupScope === "mixed"
        ? "16 times das primeiras divisões das 13 ligas, mata-mata até a final."
        : "Os 16 times da divisão do seu clube, mata-mata até a final."
      : mode === "pvp"
        ? "Os dois jogadores jogam no mesmo aparelho, alternando os turnos."
        : "Toque em um time. Toque de novo em outro para trocar o adversário.";
  const need = mode === "cup" ? "Escolha seu time" : !picks[0] ? "Escolha seu time" : "Escolha o adversário";
  return (
    <Panel label="Seleção de times" width="xl" className="gap-4">
      <div className="flex items-center gap-3">
        <IconButton label="Voltar ao menu" icon={<ArrowLeft />} onClick={onBack} />
        <PanelTitle sub={sub}>{SELECT_TITLES[mode][Math.min(step, 1)]}</PanelTitle>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented ariaLabel="Liga" options={LEAGUE_OPTIONS} value={settings.league} onChange={(league) => onSetting({ league })} className="max-w-full" />
      </div>
      <div className="max-h-[42dvh] min-h-52 space-y-3 overflow-y-auto p-1" role="group" aria-label={`Times da liga: ${LEAGUES[settings.league].name}`}>
        {groupByDivision(settings.league).map(([div, teams]) => (
          <section key={div}>
            <h3 className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-gold-400">{divisionName(div)}</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]">
              {teams.map((t) => {
                const p0 = picks[0] === t.id, p1 = picks[1] === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPick(t.id)}
                    aria-pressed={p0 || p1}
                    className={cn(
                      "flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-2 text-center transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold-400",
                      p0 ? "border-snow bg-snow/14" : p1 ? "border-gold-400 bg-gold-400/14" : "border-transparent bg-white/5",
                    )}
                  >
                    <Crest club={t.club} size={34} />
                    <span className="line-clamp-2 text-[13px] font-bold leading-tight">{t.name}</span>
                    <TeamStars n={teamStars(t)} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/8 pt-4">
        <div className="flex flex-wrap gap-4">
          {mode === "cup" && (
            <div>
              <span className="mb-1 block text-xs uppercase tracking-wider text-mist">Participantes</span>
              <Segmented ariaLabel="Participantes da Copa" size="sm" value={settings.cupScope} onChange={(cupScope) => onSetting({ cupScope })} options={CUP_SCOPE_OPTIONS} />
            </div>
          )}
          {mode !== "pvp" && (
            <div>
              <span className="mb-1 block text-xs uppercase tracking-wider text-mist">Dificuldade</span>
              <Segmented<Level>
                ariaLabel="Dificuldade"
                size="sm"
                value={settings.difficulty}
                onChange={(v) => onSetting({ difficulty: v })}
                options={[
                  { value: "easy", label: "Fácil" },
                  { value: "medium", label: "Médio" },
                  { value: "hard", label: "Difícil" },
                ]}
              />
            </div>
          )}
          <div>
            <span className="mb-1 block text-xs uppercase tracking-wider text-mist">Duração</span>
            <Segmented
              ariaLabel="Duração"
              size="sm"
              value={String(settings.duration)}
              onChange={(v) => onSetting({ duration: Number(v) })}
              options={DURATIONS.map((d) => ({ value: String(d), label: `${d / 60} min` }))}
            />
          </div>
        </div>
        {mode === "cup" && (
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-60">
            <PickSlot team={teamById(picks[0])} placeholder="Seu time" tone="p0" />
          </div>
        )}
        {mode !== "cup" && (
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-sm">
            <PickSlot team={teamById(picks[0])} placeholder={mode === "pvp" ? "Jogador 1" : "Você"} tone="p0" />
            <span className="font-display font-extrabold italic text-gold-400">VS</span>
            <PickSlot team={teamById(picks[1])} placeholder={mode === "pvp" ? "Jogador 2" : "CPU"} tone="p1" />
          </div>
        )}
        <div className="flex flex-col items-end gap-1 max-sm:w-full">
          <Button variant="primary" size="lg" icon={mode === "cup" ? <Trophy /> : <Play />} onClick={onStart} disabled={!ready} title={ready ? undefined : need} className="max-sm:w-full">
            {mode === "cup" ? "Iniciar Copa" : "Jogar"}
          </Button>
          {!ready && <span className="text-xs text-mist">{need}.</span>}
        </div>
      </div>
    </Panel>
  );
}

// ---------- Copa ----------
function BracketRow({ id, score, won, me, flag }: { id: string | null; score: number | null; won: boolean; me: boolean; flag: boolean }) {
  const t = teamById(id);
  if (!t) return <div className="flex h-7 items-center px-2.5 text-xs italic text-mist/60">A definir</div>;
  return (
    <div className={cn("flex h-7 items-center gap-2 px-2.5 text-[13px]", won ? "font-bold text-snow" : "text-mist")}>
      <Crest club={t.club} size={15} className="shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate", me && "text-gold-400")}>{t.name}</span>
      {flag && <Flag code={t.club.league} />}
      <b className="font-display text-sm text-snow tabular">{score ?? ""}</b>
    </div>
  );
}

function BracketMatch({ m, cup, round }: { m: CupMatch; cup: ArcadeCup; round: number }) {
  const mine = m.a === cup.player || m.b === cup.player;
  const next = mine && !m.w && round === cup.round && cup.status === "playing";
  const flag = cup.scope === "mixed";
  return (
    <div className={cn("relative divide-y divide-white/8 overflow-hidden rounded-lg bg-white/5 ring-1 ring-inset", next ? "ring-2 ring-gold-400" : "ring-white/10")}>
      <BracketRow id={m.a} score={m.sa} won={!!m.w && m.w === m.a} me={m.a === cup.player} flag={flag} />
      <BracketRow id={m.b} score={m.sb} won={!!m.w && m.w === m.b} me={m.b === cup.player} flag={flag} />
      {m.ot && (
        <em className="absolute right-7 top-1/2 -translate-y-1/2 rounded bg-mist px-1 text-[9px] font-extrabold not-italic text-ink-950" title="Decidido na morte súbita">
          MS
        </em>
      )}
    </div>
  );
}

export function CupScreen({ cup, onPlay, onNewCup, onBack }: { cup: ArcadeCup; onPlay: () => void; onNewCup: () => void; onBack: () => void }) {
  const me = teamById(cup.player);
  const opp = teamById(opponentOf(cup));
  const champ = teamById(cup.champion);
  const playing = cup.status === "playing";
  const sub = playing
    ? `${ROUND_NAMES[cup.round]} • ${me?.name} x ${opp?.name ?? "?"}`
    : cup.status === "champion"
      ? `${me?.name} é campeão da Copa!`
      : `Campeão: ${champ?.name ?? "?"}`;
  return (
    <Panel label="Chaveamento da Copa" width="2xl" className="gap-4">
      <div className="flex items-center gap-3">
        <IconButton label="Voltar ao menu" icon={<ArrowLeft />} onClick={onBack} />
        <PanelTitle sub={sub}>{cup.scope === "mixed" ? "Copa arcade internacional" : "Copa arcade"}</PanelTitle>
        {cup.status === "champion" && <Trophy className="ml-auto size-8 shrink-0 text-gold-400" aria-hidden />}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-4 gap-3">
          {ROUND_NAMES.map((name, r) => {
            const matches = cup.rounds[r] || Array.from({ length: 8 >> r }, (): CupMatch => ({ a: null, b: null, sa: null, sb: null, w: null, ot: false }));
            return (
              <div key={name} className="flex flex-col gap-2">
                <h3 className="text-center font-display text-xs font-bold uppercase tracking-wider text-gold-400">{name}</h3>
                <div className="flex flex-1 flex-col justify-around gap-2">
                  {matches.map((m, i) => (
                    <BracketMatch key={i} m={m} cup={cup} round={r} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end">
        {playing ? (
          <Button variant="primary" size="lg" icon={<Play />} onClick={onPlay} className="max-sm:w-full">
            <span className="truncate">
              Jogar: {me?.club.short} x {opp?.club.short}
            </span>
          </Button>
        ) : (
          <Button variant="primary" size="lg" icon={<Shuffle />} onClick={onNewCup} className="max-sm:w-full">
            Nova Copa
          </Button>
        )}
      </div>
    </Panel>
  );
}

// ---------- Resultado ----------
export interface ResultView {
  title: string;
  note: string;
  tone: "win" | "lose" | "draw";
  teams: [ArcadeTeam, ArcadeTeam];
  score: [number, number];
  mode: SelectMode;
  cupPlaying: boolean;
}

export function ResultScreen({ r, onPrimary, onChangeTeams, onMenu }: { r: ResultView; onPrimary: () => void; onChangeTeams: () => void; onMenu: () => void }) {
  return (
    <Panel label="Resultado" className="text-center">
      <h2 className={cn("font-display text-4xl font-extrabold uppercase italic", r.tone === "win" ? "text-gold-400" : r.tone === "lose" ? "text-danger-400" : "text-snow")}>
        {r.title}
      </h2>
      <div className="mt-5 flex items-center justify-center gap-4">
        {r.teams.map((t, i) => (
          <div key={i} className={cn("flex w-28 flex-col items-center gap-1.5", i === 1 && "order-3")}>
            <Crest club={t.club} size={52} />
            <span className="line-clamp-2 text-sm font-bold leading-tight">{t.name}</span>
          </div>
        ))}
        <div className="order-2 font-display text-5xl font-extrabold tabular">
          {r.score[0]} - {r.score[1]}
        </div>
      </div>
      {r.note && <p className="mt-3 text-sm text-mist">{r.note}</p>}
      <div className="mt-6 flex flex-col gap-2.5">
        {r.mode === "cup" ? (
          <Button variant="primary" size="lg" iconRight={<ChevronRight />} onClick={onPrimary}>
            {r.cupPlaying ? "Continuar na Copa" : "Ver chaveamento"}
          </Button>
        ) : (
          <>
            <Button variant="primary" size="lg" icon={<RotateCcw />} onClick={onPrimary}>
              Jogar revanche
            </Button>
            <Button variant="secondary" icon={<Shuffle />} onClick={onChangeTeams}>
              Trocar times
            </Button>
          </>
        )}
        <Button variant="ghost" icon={<House />} onClick={onMenu}>
          Menu principal
        </Button>
      </div>
    </Panel>
  );
}

// ---------- Pausa ----------
export function PauseScreen({ inCup, onResume, onRestart, onQuit }: { inCup: boolean; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  return (
    <Panel label="Pausa" className="text-center">
      <PanelTitle>Pausado</PanelTitle>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button variant="primary" size="lg" icon={<Play />} onClick={onResume}>
          Continuar
        </Button>
        {!inCup && (
          <Button variant="secondary" icon={<RotateCcw />} onClick={onRestart}>
            Reiniciar partida
          </Button>
        )}
        <Button variant="ghost" icon={<LogOut />} onClick={onQuit}>
          Sair para o menu
        </Button>
      </div>
      {inCup && <p className="mt-3 text-xs text-mist">Na Copa não dá para reiniciar a partida.</p>}
    </Panel>
  );
}

// ---------- Ajuda ----------
export function HelpScreen({ onClose }: { onClose: () => void }) {
  return (
    <Panel label="Como jogar">
      <PanelTitle>Como jogar</PanelTitle>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
        <li>
          <b>Toque/clique</b> em um dos seus jogadores (os que estão piscando).
        </li>
        <li>
          <b>Arraste para trás</b>, como um estilingue. A seta mostra a direção do chute.
        </li>
        <li>
          Quanto mais longe arrastar, <b>mais forte</b> o chute. <b>Solte</b> para chutar.
        </li>
        <li>
          Os times jogam em <b>turnos</b>: um chute por vez, com <b>12 segundos</b> para decidir.
        </li>
        <li>
          Na <b>saída de bola</b>, o primeiro chute tem força reduzida. Construa a jogada antes de finalizar.
        </li>
        <li>
          Use as <b>laterais</b> para fazer tabelas e desviar dos adversários.
        </li>
        <li>
          Quem fizer mais gols até o fim do tempo vence. Na <b>Copa</b>, empate vai para a <b>morte súbita</b>.
        </li>
      </ol>
      <p className="mt-3 text-xs text-mist">
        Atalho: <kbd className="rounded bg-white/12 px-1.5 py-0.5">Esc</kbd> pausa a partida.
      </p>
      <Button variant="primary" size="lg" block className="mt-5" onClick={onClose}>
        Entendi, voltar ao menu
      </Button>
    </Panel>
  );
}
