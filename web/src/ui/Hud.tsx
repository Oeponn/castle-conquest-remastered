// In-game HUD composed from the original toolbar art: launchControls_02 is
// the left toolbar (sword slot, rotation dial, angle protractor); the sword
// blade rises as the power meter; yellowLine + dials rotate with the aim
// angles, mirroring sprite rotations in applyVelToAimCam.

import { useRef } from "react";
import { HudState } from "../game/engine";

const IMG = (n: string) => `/games/castle-conquest/images/${n}.png`;

export function Hud(props: {
  hud: HudState;
  onFire: () => void;
  onAim: (dx: number, dy: number) => void;
  onAimEnd: () => void;
  onToggleSound: () => boolean;
}) {
  const { hud } = props;
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const soundOnRef = useRef(true);

  // original: rotationDial.rotation = angleZ * -2.5 ; angleDial = angleY*1.7 - 25
  const rotDial = hud.angleZ * -2.5;
  const angDial = hud.angleY * 1.7 - 25;

  const aimStart = (e: React.PointerEvent) => {
    if (hud.state !== "setPower" && hud.state !== "throwBall") return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const aimMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    props.onAim(e.clientX - dragRef.current.x, e.clientY - dragRef.current.y);
  };
  const aimEnd = () => {
    dragRef.current = null;
    props.onAimEnd();
  };

  return (
    <div className="screen" style={{ pointerEvents: "none" }}>
      {/* aim by dragging on the viewport (mobile + mouse) */}
      <div
        style={{ position: "absolute", left: 145, top: 80, width: 427, height: 305, pointerEvents: "auto" }}
        onPointerDown={aimStart}
        onPointerMove={aimMove}
        onPointerUp={aimEnd}
        onPointerCancel={aimEnd}
      />
      {(hud.state === "setPower" || hud.state === "throwBall") && (hud.playerTurn === 1 || hud.twoPlayer) && (
        <img
          className="crosshair"
          src={IMG("crosshair")}
          style={{ left: 145 + 195, top: 80 + 140 }}
          alt=""
        />
      )}

      <div className="toolbar">
        <img className="tb" src={IMG("launchControls_02")} alt="" />
        {/* power: sword blade rises in its slot */}
        <img
          src={IMG("sword_blade_01")}
          style={{
            position: "absolute", left: 42, width: 20, height: 146,
            top: 30 + (1 - hud.meterPerc) * 0, transform: `translateY(${(1 - hud.meterPerc) * 110 - 110 + 110}px)`,
            clipPath: `inset(${(1 - hud.meterPerc) * 100}% 0 0 0)`,
          }}
          alt=""
        />
        <img
          src={IMG("powermeterArrows_01")}
          style={{ position: "absolute", left: 8, top: 40, width: 27, height: 123 }}
          alt=""
        />
        {/* rotation dial needle */}
        <div
          className="dial"
          style={{
            left: 38, top: 196, width: 30, height: 4, background: "#f5d76a",
            transform: `rotate(${rotDial}deg)`, position: "absolute",
          }}
        />
        {/* elevation needle over the protractor */}
        <img
          src={IMG("yellowLine_bmp")}
          className="dial"
          style={{
            left: 50, top: 268, width: 3, height: 36, position: "absolute",
            transformOrigin: "50% 100%", transform: `rotate(${angDial}deg)`,
          }}
          alt=""
        />
      </div>

      <div className="hud-text" style={{ left: 150, top: 50 }}>Level {hud.level}</div>
      <div className="hud-text" style={{ left: 260, top: 50 }}>{hud.flagsText}</div>
      {!hud.twoPlayer ? (
        <>
          <div className="hud-text" style={{ right: 150, top: 50 }}>Gold: {hud.gold}</div>
          <div className="hud-text" style={{ right: 60, top: 50 }}>Score: {hud.score}</div>
        </>
      ) : (
        <div className="hud-text" style={{ right: 80, top: 50 }}>Player {hud.playerTurn}</div>
      )}

      <div className="hint">{hud.hint}</div>
      <div className="cam-tip">cameras: 0-9</div>

      <button
        className="sound-btn"
        style={{ pointerEvents: "auto" }}
        onClick={() => (soundOnRef.current = props.onToggleSound())}
        aria-label="toggle sound"
      >
        <img src={IMG(soundOnRef.current ? "soundOn_bmp" : "soundOff_bmp")} alt="" />
      </button>

      <button
        className="fire-btn"
        style={{ pointerEvents: "auto" }}
        onPointerDown={(e) => {
          e.preventDefault();
          props.onFire();
        }}
      >
        FIRE
      </button>
    </div>
  );
}
