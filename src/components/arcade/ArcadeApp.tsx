"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Dices, LoaderCircle, Play, Trophy, Volume2, VolumeX } from "lucide-react";
import { Audio } from "@/arcade/audio";
import { ARCADE_LEAGUES, ARCADE_TEAMS, teamById, teamStars, teamsOfLeague, type ArcadeTeam } from "@/arcade/teams";
import { ROUND_NAMES, applyPlayerResult, clearCup, loadCup, newCup, opponentOf, saveCup, type ArcadeCup } from "@/arcade/cup";
import { LEAGUES, clamp } from "@/game";
import type { LeagueId } from "@/game/types";
import { BOT_DESC, BOT_LEVELS, BOT_NAME, Difficulty, type BotSetting } from "@/lances/difficulty";
import { genericChance, genericSquad } from "@/lances/scenario";
import { oppGoalProb, planChances, type SeriesOutcome, type SeriesPlan } from "@/lances/series";
import { LancesSeries } from "@/components/lances/LancesSeries";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Crest } from "@/components/ui/Crest";
import { Card } from "@/components/ui/primitives";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { CHANCE_OPTIONS, loadSettings, saveSettings, type ArcadeSettings } from "./settings";

type Mode = "friendly" | "cup";
type Screen = { kind: "menu" } | { kind: "select"; mode: Mode } | { kind: "play"; mode: Mode; plan: SeriesPlan; me: ArcadeTeam; opp: ArcadeTeam } | { kind: "result"; me: ArcadeTeam; opp: ArcadeTeam; score: [number, number]; tb: [number, number] | null } | { kind: "cup" };

const noop = () => () => {};
const field = "h-11 w-full rounded-xl bg-ink-950/70 px-3 text-snow ring-1 ring-inset ring-white/12 focus:outline-2 focus:outline-gold-400";

/** Plano de uma partida do arcade: lances do usuário em 3D e gols do adversário sorteados pela força e pelo nível do bot. */
function arcadePlan(me: ArcadeTeam, opp: ArcadeTeam, s: ArcadeSettings, knockout: boolean, label: string): SeriesPlan {
  const diff = opp.rating - me.rating;
  const difficulty = new Difficulty(s.bot, 1 + clamp(diff / 6, -1, 1.5));
  const p = oppGoalProb(difficulty.level, diff);
  const names = genericSquad(opp.id, opp.club.league, opp.rating).att.map((x) => x.name);
  const oppGoals: { min: number; who: string }[] = [];
  for (let k = 0; k < s.chances; k++) if (Math.random() < p) oppGoals.push({ min: 2 + Math.floor(Math.random() * 88), who: names[Math.floor(Math.random() * names.length)] });
  oppGoals.sort((a, b) => a.min - b.min);
  const kit = (t: ArcadeTeam) => ({ name: t.name, short: t.club.short, colors: [t.club.colors[0], t.club.colors[1]] as [string, string], pattern: t.club.pattern });
  return {
    label, home: kit(me), away: kit(opp), userSide: 0, chances: planChances(s.chances), oppGoals, difficulty,
    setup: (kind, params) => genericChance(me, opp, params, Math.random, kind),
    tiebreak: knockout ? { oppProb: clamp(p + 0.12, 0.2, 0.65) } : null,
  };
}

function TeamPicker({ league, onLeague, value, onChange, exclude }: { league: LeagueId; onLeague: (l: LeagueId) => void; value: string | null; onChange: (id: string) => void; exclude?: string | null }) {
  const teams = useMemo(() => teamsOfLeague(league).filter((t) => t.id !== exclude), [league, exclude]);
  return (
    <div>
      <select className={field} value={league} onChange={(e) => onLeague(e.target.value as LeagueId)} aria-label="Liga">
        {ARCADE_LEAGUES.map((l) => <option key={l} value={l}>{LEAGUES[l].name}</option>)}
      </select>
      <ul className="mt-2 grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
        {teams.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onChange(t.id)} aria-pressed={value === t.id} className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left ring-1 ring-inset transition-colors", value === t.id ? "bg-gold-400/15 ring-gold-400/70" : "bg-ink-950/50 ring-white/8 hover:bg-white/6")}>
              <Crest club={t.club} size={26} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold">{t.name}</span>
                <span className="text-[11px] text-gold-400">{"★".repeat(teamStars(t))}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Arcade de lances: amistoso ou Copa (16 clubes), contra o bot no nível escolhido. Só no cliente (3D e localStorage). */
export function ArcadeApp() {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <div className="grid min-h-dvh place-items-center text-mist"><LoaderCircle className="size-6 animate-spin" aria-label="Carregando" /></div>;
  return <Arcade />;
}

function Arcade() {
  const [settings, setSettings] = useState<ArcadeSettings>(loadSettings);
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const [cup, setCup] = useState<ArcadeCup | null>(loadCup);
  const [league, setLeague] = useState<LeagueId>(settings.league);
  const [oppLeague, setOppLeague] = useState<LeagueId>(settings.league);
  const [mine, setMine] = useState<string | null>(() => teamsOfLeague(settings.league)[0]?.id ?? null);
  const [opp, setOpp] = useState<string | null>(null);
  const update = (patch: Partial<ArcadeSettings>) => {
    const s = { ...settings, ...patch };
    setSettings(s);
    saveSettings(s);
    Audio.setEnabled(s.sound);
  };

  const startFriendly = () => {
    const me = teamById(mine), o = teamById(opp) ?? ARCADE_TEAMS.filter((t) => t.id !== mine)[Math.floor(Math.random() * (ARCADE_TEAMS.length - 1))];
    if (!me || !o) return;
    Audio.init();
    setScreen({ kind: "play", mode: "friendly", me, opp: o, plan: arcadePlan(me, o, settings, false, "Amistoso") });
  };
  const startCupMatch = (c: ArcadeCup) => {
    const me = teamById(c.player), o = teamById(opponentOf(c));
    if (!me || !o) return;
    Audio.init();
    setScreen({ kind: "play", mode: "cup", me, opp: o, plan: arcadePlan(me, o, settings, true, `Copa arcade • ${ROUND_NAMES[c.round]}`) });
  };
  const finished = (o: SeriesOutcome, s: Extract<Screen, { kind: "play" }>) => {
    if (s.mode === "cup" && cup) {
      const won = o.tiebreak ? o.tiebreak[0] > o.tiebreak[1] : o.userGoals > o.oppGoals;
      const next = structuredClone(cup);
      applyPlayerResult(next, o.userGoals + (o.tiebreak && won ? 1 : 0), o.oppGoals + (o.tiebreak && !won ? 1 : 0), !!o.tiebreak);
      saveCup(next);
      setCup(next);
      setScreen({ kind: "cup" });
      return;
    }
    setScreen({ kind: "result", me: s.me, opp: s.opp, score: [o.userGoals, o.oppGoals], tb: o.tiebreak });
  };

  if (screen.kind === "play") return <LancesSeries key={screen.opp.id + screen.plan.chances.map((c) => c.min).join()} plan={screen.plan} finishLabel="Continuar" onFinish={(o) => finished(o, screen)} />;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:pt-10">
      <div className="flex items-center gap-2">
        {screen.kind === "menu" ? <Link href="/" className={buttonClasses("ghost", "sm")}><ArrowLeft /> Início</Link> : <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => setScreen({ kind: "menu" })}>Menu</Button>}
        <Button variant="ghost" size="sm" className="ml-auto" icon={settings.sound ? <Volume2 /> : <VolumeX />} onClick={() => update({ sound: !settings.sound })}>{settings.sound ? "Som ligado" : "Sem som"}</Button>
      </div>
      <h1 className="mt-4 font-display text-5xl font-extrabold uppercase italic leading-none">Lances 3D</h1>
      <p className="mt-2 max-w-prose text-sm text-mist">Só os ataques decisivos: deslize para chutar (a direção escolhe o canto, o comprimento a altura e a curva do gesto dá efeito), toque num companheiro para passar e no gramado para conduzir. A defesa e o goleiro são do bot.</p>

      {screen.kind === "menu" && (
        <>
          <Card className="mt-6" title="Dificuldade do bot">
            <Segmented ariaLabel="Dificuldade do bot" value={settings.bot} onChange={(v) => update({ bot: v as BotSetting })} className="flex w-full flex-wrap" options={[...BOT_LEVELS, "auto"].map((k) => ({ value: k, label: BOT_NAME[k as BotSetting] }))} />
            <p className="mt-2 text-sm text-mist">{BOT_DESC[settings.bot]}</p>
            <span className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wider text-mist">Lances por partida</span>
            <Segmented ariaLabel="Lances por partida" size="sm" value={String(settings.chances)} onChange={(v) => update({ chances: Number(v) })} options={CHANCE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))} />
          </Card>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => setScreen({ kind: "select", mode: "friendly" })} className="rounded-3xl bg-linear-to-br from-pitch-700/50 via-ink-800 to-ink-800 p-6 text-left ring-1 ring-inset ring-white/10 transition-transform hover:-translate-y-0.5">
              <Play className="size-8 text-gold-400" />
              <p className="mt-3 font-display text-3xl font-extrabold uppercase italic">Amistoso</p>
              <p className="text-sm text-mist">Escolha os dois times e jogue os lances.</p>
            </button>
            <button type="button" onClick={() => (cup && cup.status === "playing" ? setScreen({ kind: "cup" }) : setScreen({ kind: "select", mode: "cup" }))} className="rounded-3xl bg-linear-to-br from-gold-500/25 via-ink-800 to-ink-800 p-6 text-left ring-1 ring-inset ring-white/10 transition-transform hover:-translate-y-0.5">
              <Trophy className="size-8 text-gold-400" />
              <p className="mt-3 font-display text-3xl font-extrabold uppercase italic">Copa arcade</p>
              <p className="text-sm text-mist">{cup && cup.status === "playing" ? `Continuar: ${ROUND_NAMES[cup.round]}` : "16 clubes, mata-mata. Empate vai para o lance decisivo."}</p>
            </button>
          </div>
        </>
      )}

      {screen.kind === "select" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card title="Seu time">
            <TeamPicker league={league} onLeague={(l) => { setLeague(l); update({ league: l }); }} value={mine} onChange={setMine} />
          </Card>
          {screen.mode === "friendly" ? (
            <Card title="Adversário" action={<Button variant="ghost" size="sm" icon={<Dices />} onClick={() => { const pool = ARCADE_TEAMS.filter((t) => t.id !== mine); const t = pool[Math.floor(Math.random() * pool.length)]; setOppLeague(t.club.league); setOpp(t.id); }}>Sortear</Button>}>
              <TeamPicker league={oppLeague} onLeague={setOppLeague} value={opp} onChange={setOpp} exclude={mine} />
            </Card>
          ) : (
            <Card title="Copa arcade">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mist">Participantes</span>
              <Segmented ariaLabel="Participantes da Copa" size="sm" value={settings.cupScope} onChange={(v) => update({ cupScope: v })} options={[{ value: "mixed", label: "Todas as ligas" }, { value: "league", label: "Só a minha liga" }]} />
              <p className="mt-3 text-sm text-mist">Oitavas, quartas, semi e final. Perdeu, está fora.</p>
            </Card>
          )}
          <div className="lg:col-span-2">
            <Button variant="primary" size="lg" block icon={<Play />} disabled={!mine} onClick={() => {
              if (screen.mode === "friendly") return startFriendly();
              if (!mine) return;
              const c = newCup(mine, settings.cupScope);
              saveCup(c); setCup(c); startCupMatch(c);
            }}>{screen.mode === "friendly" ? "Começar o amistoso" : "Começar a Copa"}</Button>
          </div>
        </div>
      )}

      {screen.kind === "result" && (
        <Card className="mt-6 text-center" tone="highlight">
          <div className="flex items-center justify-center gap-4">
            <Crest club={screen.me.club} size={56} />
            <span className="font-display text-5xl font-extrabold tabular">{screen.score[0]} : {screen.score[1]}</span>
            <Crest club={screen.opp.club} size={56} />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold uppercase italic">{screen.score[0] > screen.score[1] ? "Vitória!" : screen.score[0] < screen.score[1] ? "Derrota" : "Empate"}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" icon={<Play />} onClick={startFriendly}>Jogar de novo</Button>
            <Button variant="secondary" onClick={() => setScreen({ kind: "select", mode: "friendly" })}>Trocar times</Button>
          </div>
        </Card>
      )}

      {screen.kind === "cup" && cup && (
        <div className="mt-6 space-y-4">
          <Card tone="highlight" className="text-center">
            {cup.status === "playing" ? (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400">{ROUND_NAMES[cup.round]}</p>
                <div className="mt-3 flex items-center justify-center gap-4">
                  <Crest club={teamById(cup.player)!.club} size={52} />
                  <span className="font-display text-3xl font-extrabold italic text-gold-400">VS</span>
                  {teamById(opponentOf(cup)) && <Crest club={teamById(opponentOf(cup))!.club} size={52} />}
                </div>
                <p className="mt-2 font-semibold">{teamById(cup.player)?.name} x {teamById(opponentOf(cup))?.name}</p>
                <Button variant="primary" size="lg" className="mt-4" icon={<Play />} onClick={() => startCupMatch(cup)}>Jogar</Button>
              </>
            ) : (
              <>
                <Trophy className={cn("mx-auto size-12", cup.status === "champion" ? "text-gold-400" : "text-mist")} />
                <p className="mt-2 font-display text-3xl font-extrabold uppercase italic">{cup.status === "champion" ? "Campeão da Copa!" : cup.status === "runnerUp" ? "Vice-campeão" : "Eliminado"}</p>
                {cup.champion && cup.status !== "champion" && <p className="text-sm text-mist">Campeão: {teamById(cup.champion)?.name}</p>}
                <Button variant="primary" className="mt-4" onClick={() => { clearCup(); setCup(null); setScreen({ kind: "select", mode: "cup" }); }}>Nova Copa</Button>
              </>
            )}
          </Card>
          <div className="grid gap-3 md:grid-cols-4">
            {cup.rounds.map((r, i) => (
              <Card key={i} title={ROUND_NAMES[i]} className="p-3">
                <ul className="space-y-1.5">
                  {r.map((m, k) => {
                    const a = teamById(m.a), b = teamById(m.b);
                    const mineMatch = m.a === cup.player || m.b === cup.player;
                    return (
                      <li key={k} className={cn("rounded-lg px-2 py-1 text-xs", mineMatch ? "bg-gold-400/12 ring-1 ring-gold-400/40" : "bg-ink-950/40")}>
                        {[[a, m.sa, m.w === m.a], [b, m.sb, m.w === m.b]].map(([t, sc, w], j) => (
                          <span key={j} className={cn("flex items-center gap-1.5", w ? "font-semibold text-snow" : "text-mist")}>
                            {t && <Crest club={(t as ArcadeTeam).club} size={14} />}
                            <span className="min-w-0 flex-1 truncate">{(t as ArcadeTeam | undefined)?.name ?? "—"}</span>
                            <span className="tabular">{(sc as number | null) ?? ""}</span>
                          </span>
                        ))}
                        {m.ot && <span className="text-[10px] text-gold-300">lance decisivo</span>}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
