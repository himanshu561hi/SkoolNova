import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { changeUserPassword } from "@/features/auth/services/auth.service";
import { ROUTE_PATHS } from "@/app/router/routePaths";
import {
  School,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  LogOut,
  Sparkles,
  ExternalLink,
  Award,
} from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Safety redirect if accessed when not needed
  if (!user || !user.mustChangePassword) {
    navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await changeUserPassword(password);
      updateUser({ mustChangePassword: false });
      toast.success("Password changed successfully!");
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password. Please try again."
      );
      toast.error("Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeLabel = () => {
    switch (user.role as string) {
      case "SUPER_ADMIN":
        return "Super Administrator";
      case "MANAGER":
      case "SCHOOL_MANAGER":
      case "PRINCIPAL":
      case "DIRECTOR":
        return "School Principal / Manager";
      case "TEACHER":
        return "Faculty Member";
      case "STUDENT":
        return "Student";
      default:
        return "Campus User";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      {/* Top Header / Branding Bar */}
      <header className="w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to={ROUTE_PATHS.HOME}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-950/10 group-hover:scale-105 transition-transform">
              <School className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-950 tracking-tight text-lg leading-tight">
                  SkoolNova
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/70 uppercase tracking-wider">
                  ERP
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-600">
                A Product of Code-A-Nova
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancel & Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Security & Context Showcase */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-7 text-left pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mandatory Security Configuration</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
                Secure Your Institutional Access
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Welcome to <strong>SkoolNova ERP</strong>. For institutional compliance and data safety, initial or temporary passwords must be updated before accessing your campus dashboard.
              </p>
            </div>

            {/* Institutional Security Highlights */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Argon2id Cryptographic Protection
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your new credentials are hash-encrypted using memory-hard Argon2id standards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    One-Time Credential Initialization
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Replacing your default password marks your user account as fully activated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Role-Governed Campus Portal
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configuring your password grants direct access to your verified role workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Compliant with Code-A-Nova institutional security policies.</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Change Password Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-7 sm:p-9 relative overflow-hidden">
              {/* Card Header */}
              <div className="mb-7 text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>First-Time Security Setup</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  Change Password Required
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Hello, <strong className="text-slate-800">{user.firstName} {user.lastName}</strong> ({getRoleBadgeLabel()}). Please set your new password to proceed.
                </p>
              </div>

              {/* Form */}
              <form noValidate className="space-y-4" onSubmit={handleSubmit}>
                {/* New Password Field */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-slate-950 focus:ring-slate-950/10 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-slate-950 focus:ring-slate-950/10 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {error}
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 text-sm font-bold shadow-md shadow-slate-950/10 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password & Enter Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Cancel & Logout */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cancel and sign out of account</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} SkoolNova ERP.</span>
            <span>•</span>
            <a
              href="https://code-a-nova.online"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-slate-950 transition hover:underline"
            >
              <span>A Product of Code-A-Nova</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="mailto:codeanova26@gmail.com"
              className="hover:text-slate-900 transition"
            >
              Support: codeanova26@gmail.com
            </a>
            <span>•</span>
            <Link to={ROUTE_PATHS.HOME} className="hover:text-slate-900 transition">
              Campus Platform
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
