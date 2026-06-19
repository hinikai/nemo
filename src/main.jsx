import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const games = [
  {
    id: "air",
    name: "防空炮手",
    description: "左右移动炮台，发射导弹击落飞机。",
    tag: "动作射击"
  },
  {
    id: "melon",
    name: "鸽子吃西瓜",
    description: "吃好西瓜加分，碰到坏西瓜扣分，超过 100 分获胜。",
    tag: "反应收集"
  },
  {
    id: "mine",
    name: "小明踩地雷",
    description: "控制小明从起点走到终点，10 分开始，踩雷扣 1 分。",
    tag: "路线冒险"
  }
];

const gameIcons = {
  air: "✈",
  melon: "🍉",
  mine: "💣"
};

const MINE_ROWS = 9;
const MINE_COLS = 12;
const MINE_START = { row: 8, col: 0 };
const MINE_GOAL = { row: 0, col: 11 };

function App() {
  const [activeGame, setActiveGame] = useState("manager");
  const currentGame = games.find((game) => game.id === activeGame);

  return (
    <main className="app">
      <header className="topbar">
        <button className="ghost-button" onClick={() => setActiveGame("manager")}>
          游戏管理
        </button>
        <div>
          <strong>{currentGame?.name ?? "NEMO小游戏世界"}</strong>
          <span>{currentGame?.tag ?? "选择一个游戏开始"}</span>
        </div>
      </header>

      {activeGame === "manager" && <GameManager onSelect={setActiveGame} />}
      {activeGame === "air" && <AirDefenseGame />}
      {activeGame === "melon" && <MelonPigeonGame />}
      {activeGame === "mine" && <MineMingGame />}
    </main>
  );
}

function GameManager({ onSelect }) {
  return (
    <section className="manager">
      <div className="manager-title">
        <h1>NEMO小游戏世界</h1>
        <p>选一个游戏开始玩，后面新增游戏也可以继续放在这里。</p>
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <article className="game-card" key={game.id}>
            <div className={`game-art game-art-${game.id}`} aria-hidden="true">
              {gameIcons[game.id]}
            </div>
            <div>
              <span className="tag">{game.tag}</span>
              <h2>{game.name}</h2>
              <p>{game.description}</p>
            </div>
            <button onClick={() => onSelect(game.id)}>开始</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AirDefenseGame() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const keysRef = useRef(new Set());
  const stateRef = useRef(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, phase: "ready" });

  function holdKey(key) {
    return {
      onPointerDown: (event) => {
        event.preventDefault();
        keysRef.current.add(key);
      },
      onPointerUp: (event) => {
        event.preventDefault();
        keysRef.current.delete(key);
      },
      onPointerCancel: () => keysRef.current.delete(key),
      onPointerLeave: () => keysRef.current.delete(key)
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const state = stateRef.current;
      if (state) {
        state.width = rect.width;
        state.height = rect.height;
        state.cannon.y = rect.height - 58;
      }
      draw();
    }

    function reset() {
      const rect = canvas.getBoundingClientRect();
      stateRef.current = {
        width: rect.width,
        height: rect.height,
        cannon: { x: rect.width / 2, y: rect.height - 58, width: 76, speed: 430 },
        missiles: [],
        planes: [],
        sparks: [],
        score: 0,
        lives: 3,
        level: 1,
        lastShot: -999,
        spawn: 0,
        last: performance.now(),
        phase: "ready"
      };
      setHud({ score: 0, lives: 3, level: 1, phase: "ready" });
      draw();
    }

    function start() {
      reset();
      stateRef.current.phase = "playing";
      setHud({ score: 0, lives: 3, level: 1, phase: "playing" });
      stateRef.current.last = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    }

    function fire(now) {
      const state = stateRef.current;
      if (!state || state.phase !== "playing" || now - state.lastShot < 180) return;
      state.lastShot = now;
      state.missiles.push({ x: state.cannon.x, y: state.cannon.y - 34, speed: 630 });
    }

    function boom(x, y, color, count = 14) {
      const state = stateRef.current;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 170;
        state.sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.55,
          color
        });
      }
    }

    function spawnPlane() {
      const state = stateRef.current;
      const size = 42 + Math.random() * 26;
      state.planes.push({
        x: size + Math.random() * (state.width - size * 2),
        y: -size,
        w: size * 1.35,
        h: size,
        speed: 90 + state.level * 20 + Math.random() * 40,
        wave: Math.random() * 2 + 0.5
      });
    }

    function update(dt, now) {
      const state = stateRef.current;
      const keys = keysRef.current;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) state.cannon.x -= state.cannon.speed * dt;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) state.cannon.x += state.cannon.speed * dt;
      if (keys.has(" ") || keys.has("ArrowUp") || keys.has("w") || keys.has("W")) fire(now);

      state.cannon.x = clamp(state.cannon.x, state.cannon.width / 2, state.width - state.cannon.width / 2);
      state.level = Math.floor(state.score / 120) + 1;
      state.spawn -= dt;
      if (state.spawn <= 0) {
        spawnPlane();
        state.spawn = Math.max(0.34, 1.08 - state.level * 0.08);
      }

      state.missiles.forEach((m) => (m.y -= m.speed * dt));
      state.planes.forEach((p) => {
        p.y += p.speed * dt;
        p.x += Math.sin(now / 360 + p.y / 40) * p.wave;
      });
      state.sparks.forEach((s) => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 190 * dt;
        s.life -= dt;
      });

      state.missiles = state.missiles.filter((m) => m.y > -30);
      state.sparks = state.sparks.filter((s) => s.life > 0);

      for (let i = state.planes.length - 1; i >= 0; i -= 1) {
        const plane = state.planes[i];
        if (plane.y - plane.h / 2 > state.height) {
          state.planes.splice(i, 1);
          state.lives -= 1;
          boom(plane.x, state.height - 22, "#ff5f56", 10);
          if (state.lives <= 0) state.phase = "over";
        }
      }

      for (let i = state.planes.length - 1; i >= 0; i -= 1) {
        const plane = state.planes[i];
        for (let j = state.missiles.length - 1; j >= 0; j -= 1) {
          const missile = state.missiles[j];
          if (missile.x > plane.x - plane.w / 2 && missile.x < plane.x + plane.w / 2 && missile.y > plane.y - plane.h / 2 && missile.y < plane.y + plane.h / 2) {
            state.planes.splice(i, 1);
            state.missiles.splice(j, 1);
            state.score += 10;
            boom(plane.x, plane.y, "#ffcc4d", 22);
            break;
          }
        }
      }

      setHud({ score: state.score, lives: state.lives, level: state.level, phase: state.phase });
    }

    function drawPlane(plane) {
      ctx.save();
      ctx.translate(plane.x, plane.y);
      ctx.fillStyle = "#e8eef8";
      ctx.beginPath();
      ctx.moveTo(0, -plane.h / 2);
      ctx.lineTo(plane.w / 2, plane.h * 0.18);
      ctx.lineTo(plane.w * 0.12, plane.h * 0.12);
      ctx.lineTo(0, plane.h * 0.38);
      ctx.lineTo(-plane.w * 0.12, plane.h * 0.12);
      ctx.lineTo(-plane.w / 2, plane.h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#50637a";
      ctx.fillRect(-7, -plane.h * 0.25, 14, plane.h * 0.45);
      ctx.restore();
    }

    function draw() {
      const state = stateRef.current;
      if (!state) return;
      ctx.clearRect(0, 0, state.width, state.height);
      const bg = ctx.createLinearGradient(0, 0, 0, state.height);
      bg.addColorStop(0, "#081326");
      bg.addColorStop(0.65, "#102337");
      bg.addColorStop(1, "#1b2a22");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, state.width, state.height);

      ctx.fillStyle = "rgba(255,255,255,.65)";
      for (let i = 0; i < 80; i += 1) {
        const x = (i * 113) % state.width;
        const y = (i * 79 + performance.now() * 0.02) % state.height;
        ctx.fillRect(x, y, 2, 2);
      }

      state.missiles.forEach((m) => {
        ctx.fillStyle = "#ffcc4d";
        ctx.fillRect(m.x - 3, m.y + 10, 6, 26);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.roundRect(m.x - 4, m.y - 9, 8, 28, 4);
        ctx.fill();
      });
      state.planes.forEach(drawPlane);
      state.sparks.forEach((s) => {
        ctx.globalAlpha = Math.max(0, s.life / 0.55);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(state.cannon.x, state.cannon.y);
      ctx.fillStyle = "#39485b";
      ctx.beginPath();
      ctx.roundRect(-38, 0, 76, 34, 7);
      ctx.fill();
      ctx.fillStyle = "#6e819a";
      ctx.beginPath();
      ctx.roundRect(-10, -42, 20, 50, 6);
      ctx.fill();
      ctx.fillStyle = "#ffcc4d";
      ctx.beginPath();
      ctx.arc(0, 15, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function loop(now) {
      const state = stateRef.current;
      if (!state || state.phase !== "playing") {
        draw();
        return;
      }
      const dt = Math.min(0.033, (now - state.last) / 1000);
      state.last = now;
      update(dt, now);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    function onKeyDown(event) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "a", "A", "d", "D", "w", "W"].includes(event.key)) event.preventDefault();
      if ((event.key === "Enter" || event.key === " ") && stateRef.current?.phase !== "playing") start();
      keysRef.current.add(event.key);
    }

    function onKeyUp(event) {
      keysRef.current.delete(event.key);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    resize();
    reset();

    canvas.startAirGame = start;
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <section className="playfield">
      <GameHud items={[["分数", hud.score], ["生命", hud.lives], ["等级", hud.level]]} />
      <canvas ref={canvasRef} className="game-canvas" />
      {hud.phase !== "playing" && (
        <div className="overlay">
          <div className="dialog">
            <h1>{hud.phase === "over" ? "游戏结束" : "防空炮手"}</h1>
            <p>{hud.phase === "over" ? `最终得分 ${hud.score}` : "方向键或 A/D 移动，空格或上箭头发射导弹。"}</p>
            <button onClick={() => canvasRef.current.startAirGame()}>{hud.phase === "over" ? "再玩一次" : "开始游戏"}</button>
          </div>
        </div>
      )}
      <div className="air-controls">
        <button {...holdKey("ArrowLeft")}>左</button>
        <button {...holdKey("ArrowRight")}>右</button>
        <button className="fire-button" {...holdKey(" ")}>发射</button>
      </div>
    </section>
  );
}

function MelonPigeonGame() {
  const [score, setScore] = useState(10);
  const [phase, setPhase] = useState("playing");
  const [pigeon, setPigeon] = useState({ x: 48, y: 48 });
  const [melons, setMelons] = useState(() => createMelons());
  const [pecking, setPecking] = useState(false);
  const peckTimerRef = useRef(0);

  const message = useMemo(() => {
    if (phase === "win") return "你赢了";
    if (phase === "lose") return "分数太低了";
    return "移动到西瓜旁边，按空格啄一下再吃。";
  }, [phase]);

  useEffect(() => {
    function onKeyDown(event) {
      if (phase !== "playing") return;
      const step = 7;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "A", "d", "D", "w", "W", "s", "S"].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === " ") {
        peck();
        return;
      }
      setPigeon((current) => {
        let next = { ...current };
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") next.x -= step;
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") next.x += step;
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") next.y -= step;
        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") next.y += step;
        next.x = clamp(next.x, 4, 92);
        next.y = clamp(next.y, 8, 88);
        return next;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, pigeon, melons, score]);

  useEffect(() => {
    return () => window.clearTimeout(peckTimerRef.current);
  }, []);

  function reset() {
    setScore(10);
    setPhase("playing");
    setPigeon({ x: 48, y: 48 });
    setMelons(createMelons());
    setPecking(false);
  }

  function moveBy(dx, dy) {
    if (phase !== "playing") return;
    setPigeon((current) => ({
      x: clamp(current.x + dx, 4, 92),
      y: clamp(current.y + dy, 8, 88)
    }));
  }

  function peck() {
    if (phase !== "playing") return;
    setPecking(true);
    window.clearTimeout(peckTimerRef.current);
    peckTimerRef.current = window.setTimeout(() => setPecking(false), 180);

    const eaten = melons.find((melon) => distance(pigeon, melon) < 7);
    if (!eaten) return;

    const nextScore = score + (eaten.good ? 10 : -10);
    setScore(nextScore);
    setMelons((current) => current.filter((melon) => melon.id !== eaten.id));
    if (nextScore > 100) setPhase("win");
    if (nextScore <= 0) setPhase("lose");
  }

  return (
    <section className="playfield melon-field">
      <GameHud items={[["分数", score], ["目标", "> 100"], ["状态", message]]} />
      <div className="melon-board">
        {melons.map((melon) => (
          <button
            className={`melon ${melon.good ? "good" : "bad"}`}
            key={melon.id}
            style={{ left: `${melon.x}%`, top: `${melon.y}%` }}
            onClick={() => setPigeon({ x: melon.x, y: melon.y })}
            aria-label={melon.good ? "好西瓜" : "坏西瓜"}
          >
            <span>🍉</span>
          </button>
        ))}
        <div className={`pigeon ${pecking ? "pecking" : ""}`} style={{ left: `${pigeon.x}%`, top: `${pigeon.y}%` }} aria-label="鸽子">
          <span>🐦</span>
        </div>
        {phase !== "playing" && (
          <div className="overlay">
            <div className="dialog">
              <h1>{phase === "win" ? "胜利" : "失败"}</h1>
              <p>最终分数 {score}</p>
              <button onClick={reset}>再玩一次</button>
            </div>
          </div>
        )}
      </div>
      <div className="dpad">
        <button onClick={() => moveBy(0, -6)}>上</button>
        <button onClick={() => moveBy(-6, 0)}>左</button>
        <button onClick={() => moveBy(6, 0)}>右</button>
        <button onClick={() => moveBy(0, 6)}>下</button>
      </div>
      <button className="peck-button" onClick={peck}>啄</button>
    </section>
  );
}

function MineMingGame() {
  const [player, setPlayer] = useState(MINE_START);
  const [score, setScore] = useState(10);
  const [phase, setPhase] = useState("ready");
  const [mines, setMines] = useState(() => createMineLayout());
  const [revealedMines, setRevealedMines] = useState(() => new Set());
  const [blasts, setBlasts] = useState([]);
  const audioRef = useRef(null);
  const blastTimersRef = useRef([]);

  const cells = useMemo(
    () =>
      Array.from({ length: MINE_ROWS * MINE_COLS }, (_, index) => ({
        row: Math.floor(index / MINE_COLS),
        col: index % MINE_COLS
      })),
    []
  );

  const message = useMemo(() => {
    if (phase === "win") return "抵达终点";
    if (phase === "lose") return "分数归零";
    if (phase === "ready") return "准备出发";
    return score <= 3 ? "谨慎前进" : "前往终点";
  }, [phase, score]);

  useEffect(() => {
    function onKeyDown(event) {
      const movement = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        w: [-1, 0],
        W: [-1, 0],
        s: [1, 0],
        S: [1, 0],
        a: [0, -1],
        A: [0, -1],
        d: [0, 1],
        D: [0, 1]
      };

      if (event.key === "Enter" && phase !== "playing") {
        event.preventDefault();
        reset();
        return;
      }

      const direction = movement[event.key];
      if (!direction) return;
      event.preventDefault();
      moveBy(direction[0], direction[1]);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, player, score, mines, revealedMines]);

  useEffect(() => {
    return () => {
      blastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      audioRef.current?.close?.();
    };
  }, []);

  function reset() {
    blastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    blastTimersRef.current = [];
    setPlayer(MINE_START);
    setScore(10);
    setPhase("playing");
    setMines(createMineLayout());
    setRevealedMines(new Set());
    setBlasts([]);
  }

  function moveBy(rowDelta, colDelta) {
    if (phase !== "playing") return;

    const next = {
      row: clamp(player.row + rowDelta, 0, MINE_ROWS - 1),
      col: clamp(player.col + colDelta, 0, MINE_COLS - 1)
    };
    if (next.row === player.row && next.col === player.col) return;

    setPlayer(next);

    const key = mineKey(next);
    const isNewMine = mines.has(key) && !revealedMines.has(key);
    if (isNewMine) {
      const nextScore = Math.max(0, score - 1);
      setScore(nextScore);
      setRevealedMines((current) => {
        const nextRevealed = new Set(current);
        nextRevealed.add(key);
        return nextRevealed;
      });
      triggerBlast(next);
      playMineSound();
      if (nextScore <= 0) {
        setPhase("lose");
        return;
      }
    }

    if (next.row === MINE_GOAL.row && next.col === MINE_GOAL.col) {
      setPhase("win");
    }
  }

  function moveToCell(cell) {
    if (phase !== "playing") return;
    const rowDelta = cell.row - player.row;
    const colDelta = cell.col - player.col;
    if (Math.abs(rowDelta) + Math.abs(colDelta) !== 1) return;
    moveBy(rowDelta, colDelta);
  }

  function triggerBlast(cell) {
    const id = `${mineKey(cell)}-${Date.now()}-${Math.random()}`;
    setBlasts((current) => [...current, { id, ...cell }]);
    const timer = window.setTimeout(() => {
      setBlasts((current) => current.filter((blast) => blast.id !== id));
    }, 620);
    blastTimersRef.current.push(timer);
  }

  function playMineSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    if (context.state === "suspended") context.resume();

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(118, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.28);
  }

  return (
    <section className="playfield mine-field">
      <GameHud items={[["分数", score], ["地雷", `${revealedMines.size}/${mines.size}`], ["状态", message]]} />
      <div className="mine-board">
        <div className="mine-grid" role="grid" aria-label="小明踩地雷地图">
          {cells.map((cell) => {
            const key = mineKey(cell);
            const isStart = cell.row === MINE_START.row && cell.col === MINE_START.col;
            const isGoal = cell.row === MINE_GOAL.row && cell.col === MINE_GOAL.col;
            const isPlayer = cell.row === player.row && cell.col === player.col;
            const isRevealed = revealedMines.has(key);
            const shouldShowMine = isRevealed || ((phase === "win" || phase === "lose") && mines.has(key));
            const hasBlast = blasts.some((blast) => blast.row === cell.row && blast.col === cell.col);
            const isNearPlayer = Math.abs(cell.row - player.row) + Math.abs(cell.col - player.col) === 1;
            const cellLabel = isPlayer ? "小明当前位置" : isGoal ? "终点" : isStart ? "起点" : shouldShowMine ? "地雷" : "地面";

            return (
              <button
                type="button"
                className={[
                  "mine-cell",
                  isStart ? "start" : "",
                  isGoal ? "goal" : "",
                  isPlayer ? "current" : "",
                  isNearPlayer ? "near" : "",
                  isRevealed ? "revealed" : "",
                  shouldShowMine ? "show-mine" : "",
                  hasBlast ? "exploding" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={key}
                onClick={() => moveToCell(cell)}
                aria-label={cellLabel}
              >
                {isStart && !isPlayer && <span className="mine-label">起</span>}
                {isGoal && !isPlayer && <span className="mine-label">终</span>}
                {shouldShowMine && <span className="mine-mark" aria-hidden="true" />}
                {hasBlast && (
                  <span className="mine-blast" aria-hidden="true">
                    <i />
                  </span>
                )}
                {isPlayer && <span className="ming-token" aria-hidden="true">明</span>}
              </button>
            );
          })}
        </div>
      </div>
      {phase !== "playing" && (
        <div className="overlay">
          <div className="dialog">
            <h1>{phase === "win" ? "胜利" : phase === "lose" ? "失败" : "小明踩地雷"}</h1>
            <p>{phase === "win" ? `到达终点，最终分数 ${score}` : phase === "lose" ? "分数归零，游戏结束。" : "10 分起步，抵达终点。"}</p>
            <button onClick={reset}>{phase === "ready" ? "开始游戏" : "再玩一次"}</button>
          </div>
        </div>
      )}
      <div className="dpad mine-dpad">
        <button onClick={() => moveBy(-1, 0)}>上</button>
        <button onClick={() => moveBy(0, -1)}>左</button>
        <button onClick={() => moveBy(0, 1)}>右</button>
        <button onClick={() => moveBy(1, 0)}>下</button>
      </div>
    </section>
  );
}

function GameHud({ items }) {
  return (
    <div className="hud">
      {items.map(([label, value]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function createMelons() {
  return Array.from({ length: 36 }, (_, index) => ({
    id: index,
    x: 7 + Math.random() * 84,
    y: 13 + Math.random() * 74,
    good: Math.random() > 0.42
  })).sort(() => Math.random() - 0.5);
}

function createMineLayout() {
  const candidates = [];
  for (let row = 0; row < MINE_ROWS; row += 1) {
    for (let col = 0; col < MINE_COLS; col += 1) {
      const nearStart = Math.abs(row - MINE_START.row) + Math.abs(col - MINE_START.col) <= 1;
      const nearGoal = Math.abs(row - MINE_GOAL.row) + Math.abs(col - MINE_GOAL.col) <= 1;
      if (!nearStart && !nearGoal) candidates.push(mineKey({ row, col }));
    }
  }

  return new Set(candidates.sort(() => Math.random() - 0.5).slice(0, 20));
}

function mineKey(cell) {
  return `${cell.row}:${cell.col}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

createRoot(document.getElementById("root")).render(<App />);
