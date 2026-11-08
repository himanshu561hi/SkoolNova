import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { UserRole } from "@/features/auth/types/auth.types";

// ─── Types ─────────────────────────────────────────────────────────
type ParticleShape = "rect" | "circle" | "streamer";

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rot: number;
  rotSpeed: number;
  gravity: number;
  opacity: number;
  decay: number;
  shape: ParticleShape;
  wobble: number;
  wobbleSpeed: number;
};

type RoleConfig = {
  roleBadge: string;
  subtitle: string;
  features: { icon: string; label: string }[];
  trophyIcon: React.ReactNode;
  trophyGradient: string;
  trophyShadow: string;
};

// ─── Constants ─────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#FF577F",
  "#FF884B",
  "#FFD384",
  "#FFF9B0",
  "#7EB5FF",
  "#B983FF",
  "#94FFD8",
  "#FF6B6B",
  "#4ECDC4",
  "#FFE66D",
  "#A8E6CF",
  "#FFB7B2",
  "#FFDAC1",
  "#C7CEEA",
  "#E2F0CB",
  "#FF85A2",
  "#F72585",
  "#7209B7",
  "#3A0CA3",
  "#4361EE",
  "#4CC9F0",
  "#06D6A0",
  "#FFD166",
  "#EF476F",
];

const ROLE_CONFIGS: Partial<Record<UserRole, RoleConfig>> = {
  SUPER_ADMIN: {
    roleBadge: "Super Admin Role Activated",
    subtitle: "Welcome to the control center of your school ecosystem.",
    features: [
      { icon: "🛠️", label: "System Overview" },
      { icon: "🏫", label: "Manage Schools" },
      { icon: "📊", label: "Analytics" },
      { icon: "🔐", label: "Access Management" },
    ],
    trophyIcon: (
      <svg
        className="w-10 h-10 text-white drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
    trophyGradient: "from-violet-400 via-fuchsia-500 to-pink-600",
    trophyShadow: "shadow-violet-500/30",
  },
  MANAGER: {
    roleBadge: "Principal / Director Role Activated",
    subtitle:
      "Welcome aboard! You now have full administrative control over your school.",
    features: [
      { icon: "🏫", label: "Manage School" },
      { icon: "👨‍🏫", label: "Manage Teachers" },
      { icon: "📊", label: "View Reports" },
      { icon: "📅", label: "Schedule Exams" },
    ],
    trophyIcon: (
      <svg
        className="w-10 h-10 text-white drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
    trophyGradient: "from-emerald-400 via-teal-500 to-cyan-600",
    trophyShadow: "shadow-emerald-500/30",
  },
  SCHOOL_MANAGER: {
    roleBadge: "Principal / Director Role Activated",
    subtitle:
      "Welcome aboard! You now have full administrative control over your school.",
    features: [
      { icon: "🏫", label: "Manage School" },
      { icon: "👨‍🏫", label: "Manage Teachers" },
      { icon: "📊", label: "View Reports" },
      { icon: "📅", label: "Schedule Exams" },
    ],
    trophyIcon: (
      <svg
        className="w-10 h-10 text-white drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
    trophyGradient: "from-emerald-400 via-teal-500 to-cyan-600",
    trophyShadow: "shadow-emerald-500/30",
  },
  TEACHER: {
    roleBadge: "Teacher Role Activated",
    subtitle:
      "Welcome to our school family! We are absolutely thrilled to have you on board.",
    features: [
      { icon: "📋", label: "Mark Attendance" },
      { icon: "📚", label: "Manage Lectures" },
      { icon: "📝", label: "Track Assignments" },
      { icon: "📊", label: "Student Progress" },
    ],
    trophyIcon: (
      <svg
        className="w-10 h-10 text-white drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M5 3h14c.55 0 1 .45 1 1v2c0 2.76-2.24 5-5 5h-.06c-.44 1.73-1.72 3.09-3.44 3.56V17h3v2H8.5v-2h3v-2.44c-1.72-.47-3-1.83-3.44-3.56H8c-2.76 0-5-2.24-5-5V4c0-.55.45-1 1-1zm0 3v1c0 1.65 1.35 3 3 3h.5V6H5zm14 0h-3.5v4H16c1.65 0 3-1.35 3-3V6zM7 21h10v1H7v-1z" />
      </svg>
    ),
    trophyGradient: "from-amber-400 via-yellow-500 to-orange-500",
    trophyShadow: "shadow-amber-500/30",
  },
  STUDENT: {
    roleBadge: "Student Profile Activated",
    subtitle:
      "Welcome to your learning journey! Your academic dashboard is ready.",
    features: [
      { icon: "📖", label: "View Classes" },
      { icon: "📝", label: "Assignments" },
      { icon: "📊", label: "My Progress" },
      { icon: "📅", label: "Exam Schedule" },
    ],
    trophyIcon: (
      <svg
        className="w-10 h-10 text-white drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
      </svg>
    ),
    trophyGradient: "from-blue-400 via-indigo-500 to-purple-600",
    trophyShadow: "shadow-blue-500/30",
  },
};

// ─── Confetti Helpers ──────────────────────────────────────────────
function createParticle(
  cx: number,
  cy: number,
  spread: number,
  speedMin: number,
  speedMax: number,
): ConfettiParticle {
  const angle = Math.random() * Math.PI * 2;
  const speed = speedMin + Math.random() * (speedMax - speedMin);
  const shapes: ParticleShape[] = ["rect", "rect", "circle", "streamer"];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  return {
    x: cx + (Math.random() - 0.5) * spread,
    y: cy + (Math.random() - 0.5) * spread * 0.5,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 4 - Math.random() * 4,
    w: shape === "streamer" ? 3 + Math.random() * 2 : 5 + Math.random() * 8,
    h: shape === "streamer" ? 14 + Math.random() * 18 : 4 + Math.random() * 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rot: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 15,
    gravity: 0.08 + Math.random() * 0.06,
    opacity: 1,
    decay: 0.0015 + Math.random() * 0.002,
    shape,
    wobble: Math.random() * 10,
    wobbleSpeed: 0.03 + Math.random() * 0.05,
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: ConfettiParticle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((p.rot * Math.PI) / 180);
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;

  if (p.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === "streamer") {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.globalAlpha = p.opacity * 0.3;
    ctx.fillStyle = "#fff";
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w * 0.4, p.h);
  } else {
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }

  ctx.restore();
}

// ─── CSS Keyframes (injected once) ─────────────────────────────────
const CONGRATS_STYLE_ID = "first-login-congrats-keyframes";
function injectCongratsStyles() {
  if (document.getElementById(CONGRATS_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = CONGRATS_STYLE_ID;
  style.textContent = `
    @keyframes congrats-gradient {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes congrats-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%      { transform: translateY(-12px) rotate(8deg); }
    }
    @keyframes congrats-float-alt {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50%      { transform: translateY(-8px) rotate(-6deg); }
    }
    @keyframes congrats-scale-in {
      0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
      60%  { transform: scale(1.15) rotate(4deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes congrats-slide-up {
      0%   { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes congrats-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes congrats-pulse-ring {
      0%   { transform: scale(0.8); opacity: 0.6; }
      50%  { transform: scale(1.1); opacity: 0.2; }
      100% { transform: scale(0.8); opacity: 0.6; }
    }
    @keyframes congrats-star-twinkle {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50%      { opacity: 1; transform: scale(1.2); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ─────────────────────────────────────────────────────
type FirstLoginCongratsProps = {
  role: UserRole;
};

export default function FirstLoginCongrats({ role }: FirstLoginCongratsProps) {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.MANAGER!;

  // ── Launch confetti ──
  const launchConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width;
    const H = canvas.height;

    particlesRef.current = [];

    const addBurst = (
      cx: number,
      cy: number,
      count: number,
      spread: number,
      sMin: number,
      sMax: number,
    ) => {
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(cx, cy, spread, sMin, sMax));
      }
    };

    // Wave 1 — big center explosion
    addBurst(W / 2, H * 0.35, 200, W * 0.4, 6, 14);

    // Wave 2 — left corner burst
    timeoutsRef.current.push(
      setTimeout(() => {
        if (!canvasRef.current) return;
        addBurst(W * 0.1, H * 0.1, 100, 80, 5, 12);
      }, 400),
    );

    // Wave 3 — right corner burst
    timeoutsRef.current.push(
      setTimeout(() => {
        if (!canvasRef.current) return;
        addBurst(W * 0.9, H * 0.1, 100, 80, 5, 12);
      }, 700),
    );

    // Wave 4 — bottom center rain
    timeoutsRef.current.push(
      setTimeout(() => {
        if (!canvasRef.current) return;
        addBurst(W / 2, H * 0.15, 120, W * 0.6, 3, 8);
      }, 1100),
    );

    // Wave 5 — extra sparkle
    timeoutsRef.current.push(
      setTimeout(() => {
        if (!canvasRef.current) return;
        addBurst(W * 0.3, H * 0.2, 60, 120, 4, 10);
        addBurst(W * 0.7, H * 0.2, 60, 120, 4, 10);
      }, 1600),
    );

    const animate = () => {
      if (!canvasRef.current) return;
      ctx.clearRect(0, 0, W, H);
      let alive = false;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot += p.rotSpeed;
        p.opacity -= p.decay;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.5;

        if (p.opacity <= 0) continue;
        alive = true;
        drawParticle(ctx, p);
      }

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };

    animate();
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // ── Inject styles ──
  useEffect(() => {
    injectCongratsStyles();
  }, []);

  // ── Check first login ──
  useEffect(() => {
    if (user && user.role === role) {
      const key = `first_login_congrats_${user.id}`;
      const shown = localStorage.getItem(key);
      if (!shown) {
        setShow(true);
        setTimeout(() => launchConfetti(), 300);
      }
    }
  }, [user, role, launchConfetti]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`first_login_congrats_${user.id}`, "done");
      setShow(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    }
  };

  if (!show || !user) return null;

  return (
    <>
      {/* Full-screen confetti canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />

      {/* Premium Congratulations Card */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)",
          backgroundSize: "400% 400%",
          animation: "congrats-gradient 6s ease infinite",
        }}
        className="relative overflow-hidden rounded-3xl p-1 shadow-2xl"
      >
        {/* Inner glassmorphism card */}
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 md:p-10">
          {/* Floating decorative stars */}
          {[
            {
              top: "8%",
              left: "5%",
              size: 18,
              delay: "0s",
              anim: "congrats-float",
            },
            {
              top: "12%",
              right: "8%",
              size: 14,
              delay: "0.5s",
              anim: "congrats-float-alt",
            },
            {
              bottom: "15%",
              left: "12%",
              size: 12,
              delay: "1s",
              anim: "congrats-float",
            },
            {
              top: "20%",
              right: "20%",
              size: 10,
              delay: "1.5s",
              anim: "congrats-float-alt",
            },
            {
              bottom: "10%",
              right: "6%",
              size: 16,
              delay: "0.8s",
              anim: "congrats-float",
            },
            {
              top: "40%",
              left: "3%",
              size: 8,
              delay: "2s",
              anim: "congrats-star-twinkle",
            },
            {
              top: "60%",
              right: "4%",
              size: 10,
              delay: "0.3s",
              anim: "congrats-star-twinkle",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute pointer-events-none select-none"
              style={{
                ...s,
                width: s.size,
                height: s.size,
                animation: `${s.anim} ${2 + i * 0.3}s ease-in-out ${s.delay} infinite`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path
                  d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z"
                  fill="rgba(255,215,0,0.6)"
                />
              </svg>
            </div>
          ))}

          {/* Pulse ring behind trophy */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-48 h-48 rounded-full border-2 border-amber-400/20"
              style={{
                animation: "congrats-pulse-ring 3s ease-in-out infinite",
              }}
            />
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center text-center gap-5">
            {/* Trophy icon with scale-in animation */}
            <div
              className={`flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${config.trophyGradient} shadow-lg ${config.trophyShadow}`}
              style={{
                animation:
                  "congrats-scale-in 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}
            >
              {config.trophyIcon}
            </div>

            {/* Role Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))",
                border: "1px solid rgba(255,215,0,0.25)",
                color: "#ffd700",
                animation: "congrats-slide-up 0.6s ease 0.3s both",
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
              </svg>
              {config.roleBadge}
            </div>

            {/* Main heading */}
            <div style={{ animation: "congrats-slide-up 0.6s ease 0.5s both" }}>
              <h2
                className="text-3xl md:text-4xl font-black tracking-tight text-white"
                style={{ textShadow: "0 2px 20px rgba(255,255,255,0.15)" }}
              >
                Congratulations, {user.firstName} {user.lastName}!
              </h2>
            </div>

            {/* Subtitle */}
            <p
              className="text-base md:text-lg font-medium text-white/80 max-w-lg leading-relaxed"
              style={{ animation: "congrats-slide-up 0.6s ease 0.7s both" }}
            >
              {config.subtitle}
            </p>

            {/* Feature pills */}
            <div
              className="flex flex-wrap justify-center gap-2.5 mt-1"
              style={{ animation: "congrats-slide-up 0.6s ease 0.9s both" }}
            >
              {config.features.map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/90"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>

            {/* CTA Button with shimmer */}
            <button
              onClick={handleDismiss}
              className="mt-3 relative overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-slate-900 tracking-wide uppercase transition-all hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-amber-500/25"
              style={{
                background:
                  "linear-gradient(135deg, #ffd700, #ffaa00, #ff8c00)",
                animation: "congrats-slide-up 0.6s ease 1.1s both",
              }}
            >
              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "congrats-shimmer 2s linear infinite",
                }}
              />
              <span className="relative">Let's Get Started</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
