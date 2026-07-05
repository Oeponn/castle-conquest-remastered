import { useCallback, useEffect, useRef, useState } from "react";
import { GameEngine, HudState } from "./game/engine";
import { CASTLES } from "./game/castles";
import { renderCastleThumbnail } from "./game/thumbnails";
import { Hud } from "./ui/Hud";
import { STAGE_W, STAGE_H } from "./game/constants";

const IMG = (n: string) => `${import.meta.env.BASE_URL}games/castle-conquest/images/${n}.png`;

type Screen = "menu" | "instructions" | "castleSelect" | "castleSelectP2" | "game" | "tally" | "gameOver";

// The original instructions text (cast member instructions_txt), updated only
// where the controls differ in this port.
const INSTRUCTIONS: Array<{ h: string; lines: string[] }> = [
  { h: "Objective", lines: ["To knock down all enemy flags."] },
  {
    h: "How To Play",
    lines: [
      '- Select "Start Game" from the main menu.',
      "- Select the castle you want to play with by clicking on its image. Some castles will be locked until you earn enough gold to unlock them.",
      "- Use the arrow keys to aim your cannon (or drag on the view on touch screens).",
      "- Next you must set the cannon's power. To start the power meter moving, tap the spacebar (or FIRE button) once.",
      "- Tap a second time to set the power level and launch the cannonball.",
      "- While the ball is in flight, the left/right arrow keys nudge it slightly.",
    ],
  },
  {
    h: "Camera Control",
    lines: ["You can choose to look through different cameras in the game by pressing the numbers 0 - 9 on your keyboard."],
  },
  {
    h: "Scoring Explained",
    lines: [
      "- 'Castle Damage' is rewarded by how many castle pieces have been destroyed.",
      "- 'Rubble Reward' is given when an excessive amount of pieces have been destroyed.",
      "- 'Flag Protect Bonus' is rewarded for how many flags you have left undamaged on your castle.",
      "- 'Flag Capture Bonus' is rewarded for how many enemy flags you have knocked down.",
    ],
  },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState<HudState | null>(null);
  const [scale, setScale] = useState(1);
  const [isTouch, setIsTouch] = useState(false);
  const [hoverCastle, setHoverCastle] = useState<{ name: string; price: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const onResize = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    onResize();
    window.addEventListener("resize", onResize);
    setIsTouch("ontouchstart" in window);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const getEngine = useCallback((): GameEngine | null => {
    if (!engineRef.current && canvasRef.current) {
      const eng = new GameEngine(canvasRef.current);
      eng.onHud(setHud);
      eng.onRoundFlow = (next) => {
        if (next === "tally") setScreen("tally");
        else if (next === "castleSelect") setScreen("castleSelect");
        else setScreen("gameOver");
      };
      eng.start();
      engineRef.current = eng;
      if (import.meta.env.DEV) (window as unknown as { __engine?: GameEngine }).__engine = eng;
    }
    return engineRef.current;
  }, []);

  // keyboard: arrows aim, space = fire, digits = cameras (original keymap)
  useEffect(() => {
    const eng = () => engineRef.current;
    const down = (e: KeyboardEvent) => {
      const g = eng();
      if (!g || screen !== "game") return;
      if (e.key === "ArrowLeft") g.setKeys({ left: true });
      if (e.key === "ArrowRight") g.setKeys({ right: true });
      if (e.key === "ArrowUp") g.setKeys({ up: true });
      if (e.key === "ArrowDown") g.setKeys({ down: true });
      if (e.key === " ") {
        e.preventDefault();
        g.firePressed();
      }
      const cams: Record<string, string> = {
        "1": "front1", "2": "castle1", "3": "side1", "4": "top1",
        "5": "castle2", "6": "front2", "7": "side2", "9": "start", "0": "aim",
      };
      if (cams[e.key]) g.pickCam(cams[e.key]);
    };
    const up = (e: KeyboardEvent) => {
      const g = eng();
      if (!g) return;
      if (e.key === "ArrowLeft") g.setKeys({ left: false });
      if (e.key === "ArrowRight") g.setKeys({ right: false });
      if (e.key === "ArrowUp") g.setKeys({ up: false });
      if (e.key === "ArrowDown") g.setKeys({ down: false });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [screen]);

  const startGame = (twoPlayer: boolean) => {
    const g = getEngine();
    if (!g) return;
    g.startGame(twoPlayer);
    setScreen("castleSelect");
  };

  const pickCastle = (num: number) => {
    const g = engineRef.current;
    if (!g) return;
    if (g.twoPlayer && screen === "castleSelect") {
      g.selectCastle(num, 1);
      setScreen("castleSelectP2");
      return;
    }
    g.selectCastle(num, screen === "castleSelectP2" ? 2 : 1);
    g.nextRoundInit();
    setScreen("game");
  };

  const gold = hud?.gold ?? engineRef.current?.player1Gold ?? 0;

  return (
    <div className={`stage-wrap ${isTouch ? "touch" : ""}`}>
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {/* the engine canvas stays mounted once created */}
        <div className="viewport" style={{ visibility: screen === "game" ? "visible" : "hidden" }}>
          <canvas ref={canvasRef} width={427} height={305} />
          <img className="frame" src={IMG("gameWorldOverlay")} alt="" />
        </div>

        {screen === "game" && hud && (
          <Hud
            hud={hud}
            onFire={() => engineRef.current?.firePressed()}
            onAim={(dx, dy) => engineRef.current?.setKeys({
              left: dx < -2, right: dx > 2, up: dy < -2, down: dy > 2,
            })}
            onAimEnd={() => engineRef.current?.setKeys({ left: false, right: false, up: false, down: false })}
            onToggleSound={() => engineRef.current?.toggleSound() ?? true}
          />
        )}

        {screen === "menu" && (
          <div className="screen">
            <img className="bg" src={IMG("mainMenu_04")} alt="Castle Conquest main menu" />
            {/* invisible hotspots over the baked-in button art (boxes at
                x 48-257, tops 148/207/265, 59px pitch) */}
            <button className="menu-btn" style={{ top: 148 }} onClick={() => startGame(false)} aria-label="Start Game" />
            <button className="menu-btn" style={{ top: 207 }} onClick={() => setScreen("instructions")} aria-label="Instructions" />
            {/* extra slot below the baked-in boxes, drawn to match them */}
            <button
              className="menu-btn gold-text"
              style={{ top: 324, fontSize: 17, fontFamily: "inherit", fontStyle: "italic", border: "2px solid #825f0e" }}
              onClick={() => startGame(true)}
            >
              Two Player
            </button>
          </div>
        )}

        {screen === "instructions" && (
          <div className="screen">
            <img className="bg" src={IMG("main_23")} alt="" />
            <div className="instructions-body">
              {INSTRUCTIONS.map((s) => (
                <div key={s.h}>
                  <h3>{s.h}</h3>
                  {s.lines.map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </div>
              ))}
            </div>
            <button className="back-btn" onClick={() => setScreen("menu")}>Back</button>
          </div>
        )}

        {(screen === "castleSelect" || screen === "castleSelectP2") && (
          <div className="screen">
            <img className="bg" src={IMG("main_23")} alt="" />
            <div className="hud-text" style={{ left: 24, top: 16, fontSize: 20 }}>
              {screen === "castleSelectP2" ? "Player 2: Select Your Castle" : "Select Your Castle"}
            </div>
            <div className="hud-text" style={{ right: 24, top: 16 }}>
              Level {(engineRef.current?.roundCount ?? 3) + 1}
            </div>
            <div className="gold-shield">
              <div className="label">Gold</div>
              <div className="value">{gold}</div>
            </div>
            <div className="castle-grid">
              {CASTLES.map((c) => {
                const locked = c.price > gold && !(engineRef.current?.twoPlayer ?? false);
                const priceText = locked ? `Unlocks at ${c.price} gold` : c.price > 0 ? `${c.price} gold` : "Free";
                return (
                  <div
                    key={c.num}
                    className={`castle-card ${locked ? "locked" : ""}`}
                    style={{ backgroundImage: `url(${renderCastleThumbnail(c.num)})` }}
                    onClick={() => !locked && pickCastle(c.num)}
                    onMouseEnter={() => setHoverCastle({ name: c.name, price: priceText })}
                    onMouseLeave={() => setHoverCastle(null)}
                  />
                );
              })}
            </div>
            <div className="castle-name-bar">
              {hoverCastle && (
                <>
                  <span>{hoverCastle.name}</span>
                  <span className="price">{hoverCastle.price}</span>
                </>
              )}
            </div>
            <div className="hint">Castles unlock as you earn gold. Gold carries over between games.</div>
          </div>
        )}

        {screen === "tally" && hud?.tally && (
          <div className="screen">
            <img className="bg" src={IMG("main_23")} alt="" />
            <div className="tally-panel">
              <h2>Round Tally</h2>
              <div className="tally-row"><span>Castle Damage</span><span>{hud.tally.castleDamage}</span></div>
              <div className="tally-row"><span>Rubble Reward</span><span>{hud.tally.rubbleReward}</span></div>
              <div className="tally-row"><span>Flag Protect Bonus</span><span>{hud.tally.flagProtect}</span></div>
              <div className="tally-row"><span>Flag Capture Bonus</span><span>{hud.tally.flagDamage}</span></div>
              <div className="tally-row tally-total"><span>Total</span><span>{hud.tally.total}</span></div>
              <button onClick={() => setScreen("castleSelect")}>Next Round</button>
            </div>
          </div>
        )}

        {screen === "gameOver" && (
          <div className="screen">
            <img className="bg" src={IMG("main_23")} alt="" />
            <div className="panel">
              <h2>Game Over</h2>
              <p>Final Score: {hud?.score ?? 0}</p>
              <p>Gold banked: {gold}</p>
              <button onClick={() => setScreen("menu")}>Main Menu</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
