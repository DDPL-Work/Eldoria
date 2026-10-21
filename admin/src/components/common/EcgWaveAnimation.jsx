import { useEffect, useRef, useState } from "react";
import {
  FaHeart,
  FaHeartbeat,
  FaStethoscope,
  FaSyringe,
  FaPills,
  FaThermometerHalf,
  FaMicroscope,
  FaAmbulance,
  FaBriefcaseMedical,
  FaFirstAid,
  FaHospital,
} from "react-icons/fa";

const ECG_PATH =
  "M0 32 H120 L130 25 L139 32 H200 L209 6 L220 58 L231 18 L240 32 H330 L340 25 L349 32 H430 L439 6 L450 58 L461 18 L470 32 H600";

const ANIMATION_DURATION = 5000; // slower wave (was 3400)

// Tailwind yellow-500
const YELLOW = "#EAB308";

// Height of the animation area in px (matches h-64 below)
const HEIGHT = 256;

// Each icon rises from below the bottom edge to above the top edge, then loops.
// left: horizontal start, size: icon px, dur: seconds per full rise,
// offset: seconds into its journey at time 0 (so they're spread out on load),
// sway: side-to-side wobble in px, wobbles: wobble cycles per rise.
const BUBBLES = [
  { Icon: FaHeart, left: "5%", size: 30, dur: 9, offset: 1, sway: 14, wobbles: 3, beat: true },
  { Icon: FaFirstAid, left: "14%", size: 26, dur: 7, offset: 5, sway: 10, wobbles: 2.5 },
  { Icon: FaStethoscope, left: "23%", size: 34, dur: 11, offset: 8, sway: 16, wobbles: 3.5 },
  { Icon: FaPills, left: "32%", size: 24, dur: 8, offset: 3, sway: 12, wobbles: 3 },
  { Icon: FaHospital, left: "41%", size: 28, dur: 10, offset: 6, sway: 14, wobbles: 2 },
  { Icon: FaBriefcaseMedical, left: "50%", size: 28, dur: 6.5, offset: 2, sway: 8, wobbles: 3 },
  { Icon: FaSyringe, left: "58%", size: 28, dur: 9.5, offset: 7, sway: 15, wobbles: 2.5 },
  { Icon: FaHeartbeat, left: "67%", size: 32, dur: 10.5, offset: 4, sway: 12, wobbles: 3.5 },
  { Icon: FaThermometerHalf, left: "76%", size: 28, dur: 8.5, offset: 9, sway: 14, wobbles: 2 },
  { Icon: FaHeart, left: "84%", size: 20, dur: 7.5, offset: 2.5, sway: 10, wobbles: 3, beat: true },
  { Icon: FaMicroscope, left: "91%", size: 30, dur: 11, offset: 5.5, sway: 16, wobbles: 3 },
  { Icon: FaAmbulance, left: "96%", size: 30, dur: 6, offset: 1.5, sway: 8, wobbles: 2.5 },
];

const EcgWaveAnimation = () => {
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(0); // seconds since mount
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(760);

  // Measure the real path length
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  // One animation loop drives both the ECG line and the rising icons.
  // It is JavaScript-driven, so it always runs, whatever the OS motion setting.
  useEffect(() => {
    let animationFrame;
    let startTime = null;

    const animate = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsedMs = timestamp - startTime;
      setProgress((elapsedMs % ANIMATION_DURATION) / ANIMATION_DURATION);
      setTime(elapsedMs / 1000);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Draw the line for the first 72% of the animation, fade in the last 28%.
  const drawProgress = progress <= 0.72 ? progress / 0.72 : 1;
  const opacity =
    progress <= 0.72 ? 1 : Math.max(0, 1 - (progress - 0.72) / 0.28);

  const strokeDashoffset = pathLength * (1 - drawProgress);

  // Spark follows the actual ECG path
  let spark = { x: 0, y: 32 };
  if (pathRef.current) {
    const pt = pathRef.current.getPointAtLength(pathLength * drawProgress);
    spark = { x: pt.x, y: pt.y };
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: HEIGHT }}>
      <style>{`
        @keyframes ecg-beat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.2); }
          30% { transform: scale(1); }
          45% { transform: scale(1.12); }
        }
        .ecg-beat { animation: ecg-beat 1.4s ease-in-out infinite; }
      `}</style>

      {/* Rising icons, like air bubbles going from the bottom to the surface */}
      {BUBBLES.map(
        ({ Icon, left, size, dur, offset, sway, wobbles, beat }, i) => {
          // p: 0 = just below the bottom edge, 1 = just above the top edge
          const p = ((time + offset) / dur) % 1;

          // Rise a little faster as it goes up, like a real bubble
          const eased = p * (0.85 + 0.3 * p);
          const y = HEIGHT - eased * (HEIGHT + size * 2);

          // Side-to-side wobble
          const x = Math.sin(p * Math.PI * 2 * wobbles) * sway;

          // Fade in at the bottom, fade out at the top
          const fade = Math.min(1, p / 0.12, (1 - p) / 0.15);

          // Grow slightly as it rises
          const scale = 0.8 + 0.35 * p;

          return (
            <div
              key={i}
              className="pointer-events-none absolute"
              style={{
                top: 0,
                left,
                color: YELLOW,
                opacity: Math.max(0, fade) * 0.8,
                transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                willChange: "transform, opacity",
              }}
              aria-hidden="true"
            >
              <Icon size={size} className={beat ? "ecg-beat" : ""} />
            </div>
          );
        }
      )}

      {/* ECG wave */}
      <div className="absolute inset-x-0 top-1/2 h-28 -translate-y-1/2">
        <svg
          viewBox="0 0 600 64"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <filter id="ecg-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="2.8" />
            </filter>
            <filter
              id="ecg-spark-glow"
              x="-300%"
              y="-300%"
              width="700%"
              height="700%"
            >
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* 1. Background guide line */}
          <path
            ref={pathRef}
            d={ECG_PATH}
            fill="none"
            stroke={YELLOW}
            strokeOpacity="0.2"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. Glowing animated line */}
          <path
            d={ECG_PATH}
            fill="none"
            stroke={YELLOW}
            strokeOpacity={0.6 * opacity}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
            filter="url(#ecg-glow)"
          />

          {/* 3. Crisp foreground line */}
          <path
            d={ECG_PATH}
            fill="none"
            stroke={YELLOW}
            strokeOpacity={opacity}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLength}
            strokeDashoffset={strokeDashoffset}
          />

          {/* 4. Moving spark, following the path */}
          {drawProgress > 0.01 && drawProgress < 0.99 && opacity > 0.1 && (
            <g transform={`translate(${spark.x}, ${spark.y})`} opacity={opacity}>
              <circle
                r="8"
                fill={YELLOW}
                opacity="0.5"
                filter="url(#ecg-spark-glow)"
              />
              <circle r="1.8" fill={YELLOW} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default EcgWaveAnimation;