import { useState, useEffect } from "react";
import { X, AlertTriangle, KeyRound } from "lucide-react";

type Props = {
  isOpen: boolean;
  schoolName: string;
  onClose: () => void;
  onConfirm: (otp: string) => void;
};

export default function DeleteSchoolModal({ isOpen, schoolName, onClose, onConfirm }: Props) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      onConfirm(otp);
    } else {
      setError("Please enter a valid 6-digit OTP.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-rose-50 dark:bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400">
              Delete School
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-200 dark:hover:bg-rose-500/20 rounded-xl transition text-rose-600 dark:text-rose-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleVerify} className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Delete {schoolName}?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This action is permanent and will delete the school along with its manager account. We've sent a 6-digit OTP to your admin email to verify this action.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Enter OTP
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  required
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className={`w-full bg-slate-50 dark:bg-slate-800/50 border rounded-xl px-10 py-2.5 text-center text-lg tracking-widest font-mono outline-none transition text-slate-800 dark:text-slate-200 ${
                    error ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
                  }`}
                  value={otp}
                  onChange={e => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setError("");
                  }}
                />
              </div>
              {error && <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p>}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={otp.length !== 6}
              className="flex-1 px-5 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition shadow-lg shadow-rose-600/20"
            >
              Verify & Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
