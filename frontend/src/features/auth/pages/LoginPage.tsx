import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  School,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ROUTE_PATHS } from "@/app/router/routePaths";
import { useAuthStore } from "../store/authStore";
import { loginUser } from "../services/auth.service";
import { loginSchema, type LoginFormValues } from "../schemas/loginSchema";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await loginUser(values);
      login(response.user, response.accessToken);
      toast.success(`Welcome back, ${response.user.firstName}!`);
      navigate(ROUTE_PATHS.DASHBOARD);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid email or password";
      setError("root", { message: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-slate-900 selection:text-white">
      {/* =====================================================================
          TOP NAVIGATION BAR (Cohesive with Website)
          ===================================================================== */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo link */}
          <Link to={ROUTE_PATHS.HOME} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <School className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-950">SkoolNova</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                ERP
              </span>
            </div>
          </Link>

          {/* Return to home link */}
          <Link
            to={ROUTE_PATHS.HOME}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-full hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Homepage</span>
          </Link>
        </div>
      </header>

      {/* =====================================================================
          MAIN SPLIT-SCREEN AUTH SECTION
          ===================================================================== */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Campus Highlights & Institutional Assurance */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-4">
            {/* Security Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold shadow-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Secure 256-Bit Encrypted Portal</span>
            </div>

            {/* Headings */}
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
                Single Sign-On for Campus Governance
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect directly to your institution's central workspace. Super Admins, School Principals, Teachers, and Students access role-governed data in real time.
              </p>
            </div>

            {/* Institutional Benefits Badges */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Period Attendance & 15-Day Lock</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Strict timestamped registers prevent backdated modification and ensure audit validity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Conflict-Free Timetable Engine</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mathematical collision prevention guarantees zero faculty or classroom double-booking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Fee-Cleared Admit Cards</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated administrative dues clearance before students can download examination hall tickets.
                  </p>
                </div>
              </div>
            </div>

            {/* Mini Footer note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Multi-tenant architecture with strict campus data privacy.</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Sign In Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-7 sm:p-9 relative overflow-hidden">
              {/* Card Header */}
              <div className="mb-7 text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  <span>Institutional Portal</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  Sign in to your account
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Enter your verified credentials to access your dashboard.
                </p>
              </div>

              {/* Form */}
              <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                {/* Email Field */}
                <div className="space-y-1.5 text-left">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. admin@digischool.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                        errors.email
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                      }`}
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                        errors.password
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                          : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                      }`}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Root Error Message Banner */}
                {errors.root && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {errors.root.message}
                  </div>
                )}

                {/* Remember & Assistance */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                    />
                    <span>Remember this device</span>
                  </label>
                  <Link
                    to={ROUTE_PATHS.FORGOT_PASSWORD}
                    className="text-slate-600 hover:text-slate-950 font-medium transition underline-offset-2 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying credentials...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Footnote */}
              <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Argon2id Hash Protected • Multi-Branch Security</span>
              </div>
            </div>

            {/* School Inquiries / Assistance banner */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                Need your school integrated into SkoolNova?{" "}
                <Link
                  to="/#inquiry"
                  className="text-slate-900 font-semibold underline decoration-slate-300 hover:decoration-slate-900 transition"
                >
                  Request School Integration
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          PAGE FOOTER (Code-A-Nova Attribution)
          ===================================================================== */}
      <footer className="w-full py-6 border-t border-slate-200/80 bg-white/50 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SkoolNova ERP. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>A Product of</span>
            <a
              href="https://code-a-nova.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              <span>Code-A-Nova</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
