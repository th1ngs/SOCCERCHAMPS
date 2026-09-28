"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle, LogOut, Play, Trophy } from "lucide-react";
import { Audio } from "@/arcade/audio";
import { Match, type Controller, type MatchEnd } from "@/arcade/game";
import type { Level } from "@/arcade/ai";
import { ArcadeRunner } from "@/arcade/runner";
import { ARCADE_TEAMS, teamById, type ArcadeTeam } from "@/arcade/teams";
import { ROUND_NAMES, applyPlayerResult, clearCup, loadCup, newCup, opponentOf, saveCup, type ArcadeCup } from "@/arcade/cup";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ButtonHud } from "./ButtonHud";
import { ButtonStage } from "./ButtonStage";
import { CupScreen, HelpScreen, MenuScreen, PauseScreen, ResultScreen, SelectScreen, type ResultView, type SelectMode } from "./screens";
import { LEVEL_ORDER, loadSettings, saveSettings, type ArcadeSettings } from "./settings";

interface MatchCfg {
  mode: SelectMode;
  teams: [ArcadeTeam, ArcadeTeam];
  controllers: [Controller, Controller];
  difficulty: [Level, Level];
  duration: number;
  goldenGoal: boolean;
  /** Copa em andamento (modo cup). */
  cup?: ArcadeCup;
}

type Screen = "menu" | "select" | "cup" | "result" | "help" | null;
type Confirm = "newCup" | "quitCup" | null;

function demoMatch(): Match {
  const pool = ARCADE_TEAMS.slice().sort(() => Math.random() - 0.5);
  return new Match({
    teams: [pool[0], pool[1]],
    controllers: ["cpu", "cpu"],
    difficulty: ["medium", "medium"],
    duration: 99999,
    goldenGoal: false,
    silent: true,
  });
}

const noopSubscribe = () => () => {};

/** Modo arcade (futebol de botão avulso). Só monta no cliente: usa canvas e localStorage. */
export function ArcadeApp() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) {
    return (
      <div className="grid min-h-dvh place-items-center text-mist">
        <LoaderCircle className="size-6 animate-spin" aria-label="Carregando" />
      </div>
    );
  }
  return <ArcadeGame />;
}

function ArcadeGame() {
  const [settings, setSettings] = useState<ArcadeSettings>(() => {
    const s = loadSettings();
    Audio.setEnabled(s.sound);
    return s;
  });
  const [runner] = useState(() => {
    const r: ArcadeRunner = new ArcadeRunner({
      pauseOnHide: true,
      onTick: (m) => {
        if (!r.interactive && m.state === "over") r.setMatch(demoMatch(), false);
      },
    });
    r.setMatch(demoMatch(), false);
    return r;
  });
  const hud = useSyncExternalStore(runner.subscribe, runner.getSnapshot, runner.getServerSnapshot);
  const [screen, setScreen] = useState<Screen>("menu");
  const [playing, setPlaying] = useState<MatchCfg | null>(null);
  const [selMode, setSelMode] = useState<SelectMode>("cpu");
  const [picks, setPicks] = useState<[string | null, string | null]>([null, null]);
  const [step, setStep] = useState(0);
  const [cup, setCup] = useState<ArcadeCup | null>(() => loadCup());
  const [result, setResult] = useState<ResultView | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const click = () => {
    Audio.init();
    Audio.click();
  };

  const updateSettings = (patch: Partial<ArcadeSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    Audio.setEnabled(next.sound);
    click();
  };

  // ---------- Navegação ----------
  const goMenu = useCallback(() => {
    runner.setMatch(demoMatch(), false);
    setPlaying(null);
    setResult(null);
    setScreen("menu");
  }, [runner]);

  const openSelect = (mode: SelectMode) => {
    setSelMode(mode);
    setPicks([null, null]);
    setStep(0);
    setScreen("select");
  };

  // ---------- Partidas ----------
  const onMatchEnd = (res: MatchEnd, cfg: MatchCfg) => {
    const [t0, t1] = cfg.teams;
    let title: string, note = res.overtime ? "Decidido na morte súbita." : "";
    let tone: ResultView["tone"] = res.winner === 0 ? "win" : res.winner === 1 ? "lose" : "draw";
    if (cfg.mode === "pvp") {
      title = res.winner < 0 ? "Empate!" : `${cfg.teams[res.winner].name} venceu!`;
      if (res.winner >= 0) tone = "win";
    } else {
      title = res.winner === 0 ? "Vitória!" : res.winner === 1 ? "Derrota" : "Empate";
    }
    let cupPlaying = false;
    if (cfg.mode === "cup" && cfg.cup) {
      const c = cfg.cup;
      const won = applyPlayerResult(c, res.score[0], res.score[1], res.overtime);
      saveCup(c);
      setCup({ ...c });
      cupPlaying = c.status === "playing";
      if (c.status === "champion") {
        title = "Campeão da Copa!";
        note = "Você conquistou a Copa arcade!";
      } else if (c.status === "runnerUp") {
        title = "Vice-campeão";
        note = "Foi por pouco! Tente de novo.";
      } else if (!won) {
        note = "Seu time foi eliminado da Copa.";
      } else {
        note = (note ? note + " " : "") + "Classificado para a " + ROUND_NAMES[c.round].toLowerCase() + "!";
      }
    }
    setResult({ title, note, tone, teams: [t0, t1], score: res.score, mode: cfg.mode, cupPlaying });
    setScreen("result");
  };

  const startMatch = (cfg: MatchCfg) => {
    Audio.init();
    const match = new Match({
      teams: cfg.teams,
      controllers: cfg.controllers,
      difficulty: cfg.difficulty,
      duration: cfg.duration,
      goldenGoal: cfg.goldenGoal,
      onEnd: (r) => onMatchEnd(r, cfg),
    });
    runner.setMatch(match, true);
    setPlaying(cfg);
    setResult(null);
    setScreen(null);
  };

  const startCupMatch = () => {
    if (!cup || cup.status !== "playing") return;
    const me = teamById(cup.player), opp = teamById(opponentOf(cup));
    if (!me || !opp) return;
    const base = LEVEL_ORDER.indexOf(settings.difficulty);
    const lvl = LEVEL_ORDER[Math.min(2, base + Math.floor(cup.round / 2))];
    startMatch({ mode: "cup", teams: [me, opp], controllers: ["human", "cpu"], difficulty: [lvl, lvl], duration: settings.duration, goldenGoal: true, cup });
  };

  const pickTeam = (id: string) => {
    click();
    if (selMode === "cup") {
      setPicks([id, null]);
      return;
    }
    if (step === 0) {
      let p1 = picks[1];
      if (selMode === "cpu" && !p1) {
        const pool = ARCADE_TEAMS.filter((t) => t.id !== id);
        p1 = pool[(Math.random() * pool.length) | 0].id;
      }
      if (p1 === id) p1 = null;
      setPicks([id, p1]);
      setStep(1);
    } else if (id === picks[0]) {
      setStep(0); // tocar de novo no seu time volta a escolher o time 1
    } else {
      setPicks([picks[0], id]);
    }
  };

  const startFromSelect = () => {
    click();
    const [a, b] = picks;
    if (selMode === "cup") {
      if (!a) return;
      const c = newCup(a);
      saveCup(c);
      setCup(c);
      setScreen("cup");
      return;
    }
    const ta = teamById(a), tb = teamById(b);
    if (!ta || !tb) return;
    const lvl = settings.difficulty;
    startMatch({
      mode: selMode,
      teams: [ta, tb],
      controllers: selMode === "pvp" ? ["human", "human"] : ["human", "cpu"],
      difficulty: [lvl, lvl],
      duration: settings.duration,
      goldenGoal: false,
    });
  };

  // ---------- Pausa ----------
  const inMatch = !!playing && screen === null && hud.state !== "over";
  const togglePause = useCallback(() => {
    if (!runner.match || !runner.interactive) return;
    runner.setPaused(!runner.match.paused);
  }, [runner]);

  useEffect(() => {
    if (!inMatch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inMatch, togglePause]);

  const quit = () => {
    click();
    if (playing?.mode !== "cup") return goMenu();
    setConfirm("quitCup");
  };

  const confirmYes = () => {
    click();
    if (confirm === "newCup") {
      clearCup();
      setCup(null);
      setConfirm(null);
      openSelect("cup");
    } else if (confirm === "quitCup") {
      if (playing?.cup) {
        applyPlayerResult(playing.cup, 0, 3, false);
        saveCup(playing.cup);
        setCup({ ...playing.cup });
      }
      setConfirm(null);
      goMenu();
    }
  };

  const hasCup = cup?.status === "playing";
  const turnLabel = (() => {
    if (!playing || !hud.aiming) return "";
    if (playing.mode === "pvp") return `Vez do Jogador ${hud.turn + 1} • ${hud.turnSecs}s`;
    return hud.turn === 0 ? `Sua vez • ${hud.turnSecs}s` : `Vez do ${playing.teams[1].name}`;
  })();

  return (
    <div className="fixed inset-0 flex select-none flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#10294a,#07121f_70%)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {playing && (
        <ButtonHud
          teams={[playing.teams[0].club, playing.teams[1].club]}
          hud={hud}
          onTogglePause={() => {
            click();
            togglePause();
          }}
          turnLabel={turnLabel}
        />
      )}
      <ButtonStage runner={runner}>
        {screen === "menu" && (
          <MenuScreen
            hasCup={hasCup}
            sound={settings.sound}
            onToggleSound={() => updateSettings({ sound: !settings.sound })}
            onCup={() => {
              click();
              if (hasCup) setConfirm("newCup");
              else {
                clearCup();
                setCup(null);
                openSelect("cup");
              }
            }}
            onResumeCup={() => {
              click();
              setCup(loadCup() ?? cup);
              setScreen("cup");
            }}
            onCpu={() => {
              click();
              openSelect("cpu");
            }}
            onPvp={() => {
              click();
              openSelect("pvp");
            }}
            onHelp={() => {
              click();
              setScreen("help");
            }}
          />
        )}
        {screen === "select" && (
          <SelectScreen
            mode={selMode}
            picks={picks}
            step={step}
            settings={settings}
            onPick={pickTeam}
            onSetting={updateSettings}
            onStart={startFromSelect}
            onBack={() => {
              click();
              goMenu();
            }}
          />
        )}
        {screen === "cup" && cup && (
          <CupScreen
            cup={cup}
            onPlay={() => {
              click();
              startCupMatch();
            }}
            onNewCup={() => {
              click();
              clearCup();
              setCup(null);
              openSelect("cup");
            }}
            onBack={() => {
              click();
              goMenu();
            }}
          />
        )}
        {screen === "result" && result && (
          <ResultScreen
            r={result}
            onPrimary={() => {
              click();
              if (result.mode === "cup") {
                setScreen("cup");
                setPlaying(null);
                runner.setMatch(demoMatch(), false);
              } else if (playing) startMatch(playing);
            }}
            onChangeTeams={() => {
              click();
              runner.setMatch(demoMatch(), false);
              setPlaying(null);
              openSelect(result.mode);
            }}
            onMenu={() => {
              click();
              goMenu();
            }}
          />
        )}
        {screen === "help" && (
          <HelpScreen
            onClose={() => {
              click();
              setScreen("menu");
            }}
          />
        )}
        {inMatch && hud.paused && (
          <PauseScreen
            inCup={playing?.mode === "cup"}
            onResume={() => {
              click();
              runner.setPaused(false);
            }}
            onRestart={() => {
              click();
              if (playing && playing.mode !== "cup") startMatch(playing);
            }}
            onQuit={quit}
          />
        )}
      </ButtonStage>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "newCup" ? "Começar nova Copa?" : "Sair da partida?"}
        footer={
          <>
            <Button variant="secondary" icon={confirm === "newCup" ? <Trophy /> : <Play />} onClick={() => setConfirm(null)}>
              {confirm === "newCup" ? "Manter Copa atual" : "Continuar jogando"}
            </Button>
            <Button variant="danger" icon={<LogOut />} onClick={confirmYes}>
              {confirm === "newCup" ? "Começar nova Copa" : "Sair e perder por W.O."}
            </Button>
          </>
        }
      >
        <p className="text-sm text-mist">
          {confirm === "newCup" ? "O progresso da Copa atual será perdido." : "Na Copa, sair agora conta como derrota por W.O. (0 x 3) e seu time é eliminado."}
        </p>
      </Modal>
    </div>
  );
}
