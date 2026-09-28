// Partida: turnos, relógio, gols, entrada do jogador humano e controle da CPU.
(function () {
  const SC = window.SC;
  const { F, P, STEP } = SC.Phys;

  const TURN_TIME = 12;
  const MAX_DRAG = 170;
  const nowS = () => performance.now() / 1000;

  class Match {
    // opts: { teams:[t0,t1], controllers:['human'|'cpu', ...], difficulty:[lvl0,lvl1],
    //         duration(s), goldenGoal, silent, onEnd({score, winner, overtime}) }
    constructor(opts) {
      this.opts = opts;
      this.teams = opts.teams;
      this.ctrl = opts.controllers;
      this.clock = opts.duration;
      this.score = [0, 0];
      this.overtime = false;
      this.timeUp = false;
      this.paused = false;
      this.particles = [];
      this.trail = [];
      this.banner = null;
      this.drag = null;
      this.accum = 0;
      this.events = [];
      this.lastTick = 0;
      this.kickoff(0);
      this.sfx('whistle', false);
    }

    sfx(name, arg) {
      if (!this.opts.silent) SC.Audio[name](arg);
    }

    showBanner(text, opts = {}) {
      this.banner = Object.assign({ text, t0: nowS(), dur: 1.4 }, opts);
    }

    isHumanTurn() {
      return this.ctrl[this.turn] === 'human';
    }

    kickoff(team) {
      this.bodies = SC.Phys.kickoffBodies();
      this.trail = [];
      this.turn = team;
      this.setState('intro');
      this.showBanner(this.teams[team].name, { sub: 'Saída de bola', dur: 1.3 });
    }

    setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    startTurn(team) {
      this.turn = team;
      this.turnTimer = TURN_TIME;
      this.drag = null;
      this.setState('aim');
      if (this.ctrl[team] === 'cpu') {
        this.planner = SC.AI.createPlanner(this.bodies, team, this.opts.difficulty[team]);
        this.cpuPhase = 'think';
      }
    }

    tickClock(dt) {
      if (this.overtime || this.timeUp) return;
      this.clock = Math.max(0, this.clock - dt);
      if (this.clock === 0) this.timeUp = true;
    }

    update(dt) {
      if (this.paused || this.state === 'over') return;
      this.stateT += dt;
      this.updateParticles(dt);

      switch (this.state) {
        case 'intro':
          if (this.stateT > 1.3) this.startTurn(this.turn);
          break;
        case 'aim':
          this.tickClock(dt);
          if (this.timeUp && !this.overtime) { this.finishOrOvertime(); break; }
          if (this.ctrl[this.turn] === 'cpu') this.updateCpu(dt);
          else {
            const before = Math.ceil(this.turnTimer);
            this.turnTimer -= dt;
            if (this.turnTimer <= 3 && Math.ceil(this.turnTimer) !== before && this.turnTimer > 0) this.sfx('tick');
            if (this.turnTimer <= 0) {
              this.drag = null;
              this.showBanner('Tempo esgotado!', { dur: 1.1, color: '#ffd23f' });
              this.startTurn(1 - this.turn);
            }
          }
          break;
        case 'moving':
          this.tickClock(dt);
          this.physics(dt, true);
          if (this.state === 'moving' && (SC.Phys.allStopped(this.bodies) || this.stateT > 15)) this.afterMove();
          break;
        case 'goal':
          this.physics(dt, false);
          if (this.stateT > 2.8) {
            if (this.overtime || this.timeUp) this.endMatch();
            else this.kickoff(1 - this.lastScorer);
          }
          break;
        case 'fulltime':
          this.physics(dt, false);
          if (this.stateT > 2.2) {
            this.state = 'over';
            const s = this.score;
            this.opts.onEnd && this.opts.onEnd({
              score: s.slice(), winner: s[0] > s[1] ? 0 : s[1] > s[0] ? 1 : -1, overtime: this.overtime,
            });
          }
          break;
      }
    }

    physics(dt, detect) {
      this.accum += Math.min(dt, 0.05);
      const ball = this.bodies[0];
      while (this.accum >= STEP) {
        this.accum -= STEP;
        this.events.length = 0;
        const g = SC.Phys.stepWorld(this.bodies, STEP, this.events, detect && this.state === 'moving');
        for (const ev of this.events) this.sfx('hit', ev);
        if (g >= 0 && this.state === 'moving') this.onGoal(g);
      }
      const sp = Math.hypot(ball.vx, ball.vy);
      ball.rot += (sp * dt) / ball.r * (ball.vx >= 0 ? 1 : -1);
      if (sp > 250) this.trail.push({ x: ball.x, y: ball.y });
      if (this.trail.length > 14 || (sp <= 250 && this.trail.length)) this.trail.shift();
    }

    afterMove() {
      if (this.timeUp && !this.overtime) this.finishOrOvertime();
      else this.startTurn(1 - this.turn);
    }

    finishOrOvertime() {
      if (this.score[0] === this.score[1] && this.opts.goldenGoal && !this.overtime) {
        this.overtime = true;
        this.sfx('whistle', false);
        this.showBanner('MORTE SÚBITA', { sub: 'Quem marcar primeiro vence!', dur: 2, color: '#ffd23f' });
        this.startTurn(1 - this.turn);
      } else {
        this.endMatch();
      }
    }

    endMatch() {
      this.drag = null;
      this.setState('fulltime');
      this.sfx('whistle', true);
      this.showBanner('FIM DE JOGO', { sub: `${this.teams[0].name} ${this.score[0]} x ${this.score[1]} ${this.teams[1].name}`, dur: 2.2 });
    }

    onGoal(team) {
      this.score[team]++;
      this.lastScorer = team;
      this.drag = null;
      this.setState('goal');
      this.sfx('goal');
      this.showBanner('GOOOL!', { sub: this.teams[team].name, dur: 2.6, big: true, color: '#ffd23f' });
      this.confetti(team);
    }

    confetti(team) {
      const f = this.teams[team].flag;
      const cols = f.colors || [f.bg || '#ffdf00', f.fg || '#009c3b', '#ffffff'];
      if (f.type === 'brazil') cols.push('#ffdf00', '#009c3b', '#002776');
      const gx = team === 0 ? F.right : F.left;
      for (let i = 0; i < 140; i++) {
        const a = (team === 0 ? Math.PI : 0) + (Math.random() - 0.5) * 2.2;
        const sp = 200 + Math.random() * 600;
        this.particles.push({
          x: gx, y: F.cy + (Math.random() - 0.5) * 120,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
          w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
          c: cols[(Math.random() * cols.length) | 0], life: 2 + Math.random() * 1.2,
        });
      }
    }

    updateParticles(dt) {
      for (const p of this.particles) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 1 - 1.8 * dt; p.vy *= 1 - 1.8 * dt;
        p.rot += p.vr * dt; p.life -= dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    updateCpu(dt) {
      if (this.cpuPhase === 'think') {
        this.planner.step(28);
        if (this.planner.done && this.stateT > 0.7) {
          this.cpuShot = this.planner.choose();
          this.cpuPhase = 'aim';
          this.cpuT = 0;
        }
      } else if (this.cpuPhase === 'aim') {
        this.cpuT += dt;
        const s = this.cpuShot;
        const k = Math.min(1, this.cpuT / 0.45);
        this.drag = { disc: this.bodies[s.i], dx: s.dx, dy: s.dy, power: s.p * k, px: null };
        if (this.cpuT > 0.7) this.shoot(this.bodies[s.i], s.dx, s.dy, s.p);
      }
    }

    shoot(disc, dx, dy, power) {
      const sp = power * P.maxShot;
      disc.vx = dx * sp; disc.vy = dy * sp;
      this.drag = null;
      this.accum = 0;
      this.setState('moving');
      this.sfx('kick', power);
    }

    // ---------- Entrada (coordenadas lógicas) ----------
    pointerDown(x, y) {
      if (this.paused || this.state !== 'aim' || !this.isHumanTurn()) return;
      let best = null, bd = Infinity;
      for (let i = 1; i < this.bodies.length; i++) {
        const b = this.bodies[i];
        if (b.team !== this.turn) continue;
        const d = Math.hypot(b.x - x, b.y - y);
        if (d < b.r + 24 && d < bd) { bd = d; best = b; }
      }
      if (best) {
        this.drag = { disc: best, px: x, py: y, dx: 0, dy: 0, power: 0 };
        this.pointerMove(x, y);
      }
    }

    pointerMove(x, y) {
      const d = this.drag;
      if (!d || d.px === null) return;
      d.px = x; d.py = y;
      const vx = d.disc.x - x, vy = d.disc.y - y;
      const len = Math.hypot(vx, vy);
      const dead = d.disc.r * 0.6;
      d.power = Math.max(0, Math.min(1, (len - dead) / MAX_DRAG));
      if (len > 0) { d.dx = vx / len; d.dy = vy / len; }
    }

    pointerUp() {
      const d = this.drag;
      if (!d || d.px === null) return;
      this.drag = null;
      if (this.state === 'aim' && d.power > 0.04) this.shoot(d.disc, d.dx, d.dy, d.power);
    }

    cancelDrag() {
      if (this.drag && this.drag.px !== null) this.drag = null;
    }
  }

  SC.Match = Match;
  SC.TURN_TIME = TURN_TIME;
})();
