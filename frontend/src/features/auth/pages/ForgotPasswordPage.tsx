import { useState, useEffect } from "react";
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
  Sparkles,
  ExternalLink,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { ROUTE_PATHS } from "@/app/router/routePaths";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
} from "../services/auth.service";
import {
  requestOtpSchema,
  resetPasswordWithOtpSchema,
  type RequestOtpFormValues,
  type ResetPasswordWithOtpFormValues,
} from "../schemas/forgotPasswordSchema";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = enter email, 2 = enter otp & new pwd, 3 = success
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form 1: Request OTP
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    setError: setEmailError,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
  } = useForm<RequestOtpFormValues>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: "" },
  });

  // Form 2: Reset with OTP
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    setValue: setResetValue,
    setError: setResetError,
    formState: { errors: resetErrors, isSubmitting: isSubmittingReset },
  } = useForm<ResetPasswordWithOtpFormValues>({
    resolver: zodResolver(resetPasswordWithOtpSchema),
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1 Submit: Request OTP
  const onSendOtp = async (values: RequestOtpFormValues) => {
    try {
      const res = await requestPasswordResetOtp(values.email);
      setSubmittedEmail(values.email);
      setResetValue("email", values.email);
      setResendCooldown(60);
      setStep(2);
      toast.success(res.message || "OTP code sent to your email address!");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Could not send reset code. Please check your email address and try again.";
      setEmailError("root", { message: msg });
      toast.error(msg);
    }
  };

  // Resend OTP
  const onResendOtp = async () => {
    if (resendCooldown > 0 || !submittedEmail) return;
    try {
      const res = await requestPasswordResetOtp(submittedEmail);
      setResendCooldown(60);
      toast.success(res.message || "New OTP sent to your email!");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to resend code. Please wait a moment."
      );
    }
  };

  // Step 2 Submit: Reset Password
  const onResetPassword = async (values: ResetPasswordWithOtpFormValues) => {
    try {
      const res = await resetPasswordWithOtp({
        email: values.email,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      setStep(3);
      toast.success(res.message || "Password reset successfully!");
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate(ROUTE_PATHS.LOGIN);
      }, 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to reset password. Please verify your OTP code.";
      setResetError("root", { message: msg });
      toast.error(msg);
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform">
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

          <Link
            to={ROUTE_PATHS.LOGIN}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Security & Workflow Information */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-7 text-left pr-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Factor Institutional Recovery</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
                Self-Service Campus Password Recovery
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Securely reset your access credentials across the SkoolNova institutional cluster using our one-time verification protocol.
              </p>
            </div>

            {/* Security Badges */}
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Encrypted Email OTP Verification</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    A cryptographic 6-digit challenge is sent directly to your institutional email address.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">10-Minute Dynamic Expiry</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    One-time codes automatically expire and clear from our datastore to prevent replay attacks.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Instant Multi-Device Session Invalidation</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Completing password reset immediately revokes legacy refresh tokens across all active sessions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Compliant with Code-A-Nova institutional security policies.</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Form Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-7 sm:p-9 relative overflow-hidden">
              {/* STEP 1: Email Form */}
              {step === 1 && (
                <div>
                  <div className="mb-7 text-left space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                      <span>Password Recovery</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                      Forgot Password?
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-normal">
                      Enter your institutional email address to receive a 6-digit verification code.
                    </p>
                  </div>

                  <form
                    noValidate
                    className="space-y-4"
                    onSubmit={handleSubmitEmail(onSendOtp)}
                  >
                    <div className="space-y-1.5 text-left">
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold text-slate-700"
                      >
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
                          placeholder="e.g. admin@skoolnova.edu or your registered email"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                            emailErrors.email
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                          }`}
                          {...registerEmail("email")}
                        />
                      </div>
                      {emailErrors.email && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          {emailErrors.email.message}
                        </p>
                      )}
                    </div>

                    {emailErrors.root && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                        {emailErrors.root.message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingEmail}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 text-sm font-bold shadow-md shadow-slate-950/10 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmittingEmail ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center">
                      <Link
                        to={ROUTE_PATHS.LOGIN}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-950 font-medium transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Return to Sign In</span>
                      </Link>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 2: Enter OTP & New Password Form */}
              {step === 2 && (
                <div>
                  <div className="mb-6 text-left space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Code Sent</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                      Verify & Reset
                    </h1>
                    <div className="text-xs sm:text-sm text-slate-600 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="truncate mr-2">
                        <span className="text-slate-400">Target: </span>
                        <strong className="text-slate-800">{submittedEmail}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs text-slate-900 font-semibold hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <form
                    noValidate
                    className="space-y-4"
                    onSubmit={handleSubmitReset(onResetPassword)}
                  >
                    {/* OTP Input */}
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="otp"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          6-Digit Verification OTP
                        </label>
                        <button
                          type="button"
                          onClick={onResendOtp}
                          disabled={resendCooldown > 0}
                          className="text-xs text-slate-600 hover:text-slate-950 disabled:text-slate-400 font-medium flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>
                            {resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : "Resend Code"}
                          </span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="otp"
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          autoComplete="one-time-code"
                          className={`w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 transition ${
                            resetErrors.otp
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                          }`}
                          {...registerReset("otp")}
                        />
                      </div>
                      {resetErrors.otp && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          {resetErrors.otp.message}
                        </p>
                      )}
                    </div>

                    {/* New Password Input */}
                    <div className="space-y-1.5 text-left">
                      <label
                        htmlFor="newPassword"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                            resetErrors.newPassword
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                          }`}
                          {...registerReset("newPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {resetErrors.newPassword && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          {resetErrors.newPassword.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password Input */}
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
                          placeholder="Re-enter your new password"
                          className={`w-full pl-10 pr-11 py-2.5 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                            resetErrors.confirmPassword
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-slate-950 focus:ring-slate-950/10"
                          }`}
                          {...registerReset("confirmPassword")}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {resetErrors.confirmPassword && (
                        <p className="text-xs text-rose-500 font-medium mt-1">
                          {resetErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {resetErrors.root && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                        {resetErrors.root.message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReset}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 text-sm font-bold shadow-md shadow-slate-950/10 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmittingReset ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Reset Password</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-950 font-medium transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Use a different email address</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3: Success Screen */}
              {step === 3 && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                      Password Reset Complete!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
                      Your password has been securely updated. You can now log in with your new credentials.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                    Redirecting to Sign In page in a few seconds...
                  </div>

                  <Link
                    to={ROUTE_PATHS.LOGIN}
                    className="w-full py-3 px-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 text-sm font-bold shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
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

