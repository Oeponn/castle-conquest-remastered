// In-game HUD composed from the original toolbar art: launchControls_02 is
// the left toolbar (sword slot, rotation dial, angle protractor); the sword
// blade rises as the power meter; the dial needles rotate with the aim
// angles, mirroring sprite rotations in applyVelToAimCam.
//
// Toolbar geometry measured from launchControls_02.png (105x346): the sword
// slot is a transparent window at x 45-62, y 12-156 — the blade sprite slides
// up BEHIND the art and shows through it (original Director z-order). Dial
// circle center (52,239); protractor vertex (37,336).

import { useRef, useState } from "react";
import { HudState } from "../game/engine";
import { ACCURACY_MARKER_PERC } from "../game/constants";

const IMG = (n: string) =>
  `${import.meta.env.BASE_URL}games/castle-conquest/images/${n}.png`;

export function Hud(props: {
  hud: HudState;
  onFire: () => void;
  onAim: (dx: number, dy: number) => void;
  onAimEnd: () => void;
  onToggleSound: () => boolean;
  onRestart: () => void;
}) {
  const { hud } = props;
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const soundOnRef = useRef(true);
  const [confirmRestart, setConfirmRestart] = useState(false);

  // original: rotationDial.rotation = angleZ * -2.5 ; angleDial = angleY*1.7 - 25
  const rotDial = hud.angleZ * -2.5;
  const angDial = hud.angleY * 1.7 - 25;

  const aiming =
    hud.state === "setPower" ||
    hud.state === "setAccuracy" ||
    hud.state === "throwBall";

  const aimStart = (e: React.PointerEvent) => {
    if (!aiming) return;
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
      {/* aim by dragging on the viewport (mobile + mouse); geometry is driven
          by the --vp-* CSS vars on .stage so it tracks the viewport rect */}
      <div
        className="aim-area"
        onPointerDown={aimStart}
        onPointerMove={aimMove}
        onPointerUp={aimEnd}
        onPointerCancel={aimEnd}
      />
      {aiming && (hud.playerTurn === 1 || hud.twoPlayer) && (
        <img className="crosshair" src={IMG("crosshair")} alt="" />
      )}

      <div className="toolbar">
        {/* power: sword blade slides up behind the slot window in the art */}
        <img
          src={IMG("sword_blade_01")}
          style={{
            position: "absolute",
            left: 44,
            width: 20,
            height: 160,
            top: 0,
            // top: 156 - hud.meterPerc * 145,
          }}
          alt=""
        />
        <div
          style={{
            position: "absolute",
            left: 44,
            width: 20,
            height: 146,
            top: 156 - hud.meterPerc * 145,
            background: "#ffdd00",
          }}
        />
        {/* accuracy sweep: the cyan bar (accuracyMeter_bmp, rgb 00DDFF) rises
            in the same slot; the third tap must hit the fixed marker notch */}
        <div
          style={{
            position: "absolute",
            left: 44,
            width: 20,
            top: 156 - (hud.accuracyPerc ?? 0) * 145,
            height: Math.max(2, (hud.accuracyPerc ?? 0) * 145),
            background: "#00ddff",
          }}
        />
        <img className="tb" src={IMG("launchControls_02")} alt="" />
        {/* the accuracy marker: a FIXED notch on the track (original sprite 32,
            an 18x4 bar 31px up the 146px container — never moved by code) */}
        {aiming && (
          <div
            style={{
              position: "absolute",
              left: 45,
              width: 18,
              height: 4,
              top: 154 - ACCURACY_MARKER_PERC * 145,
              background: "#a81200",
            }}
          />
        )}
        {/* range arrows bracket the slot (slot center y = 84) */}
        <img
          src={IMG("powermeterArrows_01")}
          style={{
            position: "absolute",
            left: 17,
            top: 6,
            width: 27,
            height: 123,
          }}
          alt=""
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 40,
            top: 34,
            fontSize: 9,
            textAlign: "center",
            color: "#f5d76a",
          }}
        >
          Full Power
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            width: 40,
            top: 84,
            fontSize: 9,
            textAlign: "center",
            color: "#f5d76a",
          }}
        >
          Aim Marker
        </div>
        {/* rotation dial needle, pivots on the dial center */}
        <div
          className="dial"
          style={{
            left: 37,
            top: 237,
            width: 30,
            height: 4,
            background: "#f5d76a",
            transform: `rotate(${rotDial}deg)`,
            position: "absolute",
          }}
        />
        {/* elevation needle pivots on the protractor vertex; drawn in CSS
            because yellowLine_bmp decoded with a broken palette */}
        <div
          className="dial"
          style={{
            left: 36,
            top: 307,
            width: 2,
            height: 29,
            background: "#f5d76a",
            position: "absolute",
            transformOrigin: "50% 100%",
            transform: `rotate(${angDial}deg)`,
          }}
        />
      </div>

      <div className="hud-text" style={{ left: 265, bottom: 38 }}>
        {hud.flagsText}
      </div>
      <div
        className="hud-text"
        style={{
          left: 360,
          bottom: 38,
          pointerEvents: "auto",
          cursor: "pointer",
        }}
        onClick={() => setConfirmRestart(true)}
      >
        Restart
      </div>
      <div className="hud-text" style={{ left: 460, bottom: 38 }}>
        Level {hud.level}
      </div>
      {!hud.twoPlayer ? (
        <>
          <div className="gold-shield">
            <div className="label">Gold</div>
            <div className="value">{hud.gold}</div>
            <div className="label">Score</div>
            <div className="value">{hud.score}</div>
          </div>
        </>
      ) : (
        <div className="hud-text" style={{ right: 80, top: 50 }}>
          Player {hud.playerTurn}
        </div>
      )}

      <div className="hint">{hud.hint}</div>
      <div className="cam-tip">cameras: 0-9</div>

      <button
        className="sound-btn"
        style={{ pointerEvents: "auto" }}
        onClick={() => (soundOnRef.current = props.onToggleSound())}
        aria-label="toggle sound"
      >
        <img
          src={IMG(soundOnRef.current ? "soundOn_bmp" : "soundOff_bmp")}
          alt=""
        />
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

      {confirmRestart && (
        <div
          className="panel restart-confirm"
          style={{ pointerEvents: "auto" }}
        >
          <h2>Restart Level {hud.level}?</h2>
          <p>Your progress on this level will be lost.</p>
          <div className="restart-confirm-buttons">
            <button
              onClick={() => {
                setConfirmRestart(false);
                props.onRestart();
              }}
            >
              Restart
            </button>
            <button onClick={() => setConfirmRestart(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
