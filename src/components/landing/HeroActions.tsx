"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useGame } from "@/components/game/GameProvider";
import { CloudLoadForm } from "@/components/start/CloudLoadForm";

export function HeroActions() {
  const g = useGame();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [importSlot, setImportSlot] = useState<number | null>(null);
  const occupied = new Set(g.slots.map((s) => s.slot));
  const free = [1, 2, 3].find((n) => !occupied.has(n));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try { await g.auth(mode, nickname, password); setPassword(""); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function openSlot(slot: number) {
    setBusy(true); setError("");
    try { await g.selectSlot(slot); router.push("/jogo"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  async function importOld(slot: number) {
    setBusy(true); setError("");
    try { await g.importLegacy(slot); router.push("/jogo"); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (!g.ready) return <div className="h-12 w-72 animate-pulse rounded-xl bg-white/6" aria-label="Carregando" />;

  if (!g.account) return (
    <section className="w-full max-w-md rounded-2xl bg-ink-800 p-5 ring-1 ring-white/10">
      <div className="mb-4 flex gap-2">
        <Button variant={mode === "login" ? "primary" : "ghost"} onClick={() => { setMode("login"); setError(""); }}>Entrar</Button>
        <Button variant={mode === "register" ? "primary" : "ghost"} onClick={() => { setMode("register"); setError(""); }}>Criar conta</Button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold">Nickname
          <input required minLength={3} maxLength={24} pattern="[A-Za-z0-9_À-ÿ]+" autoComplete="username" value={nickname}
            onChange={(e) => setNickname(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-ink-950 px-3 text-snow ring-1 ring-white/15 focus:outline-2 focus:outline-gold-400" />
        </label>
        <label className="block text-sm font-semibold">Senha
          <input required minLength={8} maxLength={128} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl bg-ink-950 px-3 text-snow ring-1 ring-white/15 focus:outline-2 focus:outline-gold-400" />
        </label>
        {error && <p role="alert" className="text-sm text-danger-400">{error}</p>}
        <Button type="submit" variant="primary" loading={busy}>{mode === "register" ? "Criar conta" : "Entrar"}</Button>
      </form>
      <p className="mt-3 text-xs text-mist">Use apenas nickname e senha. Cada conta tem três saves na nuvem.</p>
    </section>
  );

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg">Olá, <b className="text-gold-400">{g.account.nickname}</b></p>
        <Button variant="ghost" icon={<LogOut />} onClick={() => void g.logout()} disabled={busy}>Sair</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((slot) => {
          const saved = g.slots.find((s) => s.slot === slot);
          return <div key={slot} className="rounded-xl bg-ink-800 p-4 ring-1 ring-white/10">
            <p className="font-display text-lg font-bold uppercase text-gold-400">Save {slot}</p>
            {saved ? <>
              <p className="mt-2 font-semibold">{saved.clubName}</p>
              <p className="text-sm text-mist">{saved.managerName} · Temporada {saved.season}, semana {saved.week}</p>
              <Button className="mt-3" variant="primary" disabled={busy} onClick={() => void openSlot(slot)} iconRight={<ChevronRight />}>Continuar</Button>
            </> : <>
              <p className="mt-2 text-sm text-mist">Slot vazio</p>
              <Link href={`/nova-carreira?slot=${slot}`} className={buttonClasses("primary", "sm", false, "mt-3")}><Plus /> Nova carreira</Link>
            </>}
          </div>;
        })}
      </div>
      {g.world && <Link href="/jogo" className={buttonClasses("outline", "sm")}>Voltar à carreira atual</Link>}
      {free && <>
        <div className="flex flex-wrap gap-2">
          {g.legacySaveAvailable && <Button variant="ghost" disabled={busy} onClick={() => void importOld(free)}>Importar save deste navegador para o slot {free}</Button>}
          <Button variant="ghost" onClick={() => setImportSlot(importSlot ? null : free)}>Importar código antigo</Button>
        </div>
        {importSlot && <CloudLoadForm onLoad={async (code) => { await g.importCode(importSlot, code); router.push("/jogo"); }} />}
      </>}
      {g.incompatibleSave && <p className="text-sm text-warn-400">Há um save antigo incompatível neste navegador. Os saves atuais da conta continuam disponíveis.</p>}
      {error && <p role="alert" className="text-sm text-danger-400">{error}</p>}
    </section>
  );
}
