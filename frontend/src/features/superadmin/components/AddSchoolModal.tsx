import { useState } from "react";
import { X, Building2, User, Mail, Lock, Copy, CheckCircle2 } from "lucide-react";
import { createSchool } from "../services/school.service";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddSchoolModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: "",
    managerFirstName: "",
    managerLastName: "",
    managerEmail: "",
    managerPassword: "Manager@123", // Default suggested password
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createSchool(formData);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to create school");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = () => {
    const text = `School: ${formData.schoolName}\nLogin URL: ${window.location.origin}/login\nEmail: ${formData.managerEmail}\nPassword: ${formData.managerPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFinish = () => {
    setStep(1);
    setFormData({
      schoolName: "",
      managerFirstName: "",
      managerLastName: "",
      managerEmail: "",
      managerPassword: "Manager@123",
    });
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={step === 1 ? onClose : undefined} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {step === 1 ? "Register New School" : "School Registered!"}
          </h2>
          {step === 1 && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <form id="add-school-form" onSubmit={handleCreate} className="space-y-6">
              {/* School Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">1. School Information</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    School Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-slate-800 dark:text-slate-200"
                      placeholder="e.g. Delhi Public School"
                      value={formData.schoolName}
                      onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Manager / Principal Info */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">2. Principal / Director Account</h3>
                <p className="text-xs text-slate-500">This account will be the institution's Principal/Director with full administrative campus control.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-slate-800 dark:text-slate-200"
                        placeholder="e.g. Aman"
                        value={formData.managerFirstName}
                        onChange={e => setFormData({ ...formData, managerFirstName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-slate-800 dark:text-slate-200"
                      placeholder="e.g. Gupta"
                      value={formData.managerLastName}
                      onChange={e => setFormData({ ...formData, managerLastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required
                      type="email"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-slate-800 dark:text-slate-200"
                      placeholder="principal@school.edu"
                      value={formData.managerEmail}
                      onChange={e => setFormData({ ...formData, managerEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Temporary Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-slate-800 dark:text-slate-200"
                      value={formData.managerPassword}
                      onChange={e => setFormData({ ...formData, managerPassword: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">They will be forced to change this upon first login.</p>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center space-y-6 py-4">
              <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{formData.schoolName} Created!</h3>
                <p className="text-sm text-slate-500">The school and its manager account are now active. Please deliver these credentials securely to the manager.</p>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-left relative group">
                <button 
                  onClick={copyCredentials}
                  className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 transition"
                  title="Copy Credentials"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-500" />}
                </button>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Login URL</p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{window.location.origin}/login</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manager Email</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formData.managerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temporary Password</p>
                    <p className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{formData.managerPassword}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
          {step === 1 ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-school-form"
                className="flex-1 px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-600 transition shadow-lg shadow-primary/20"
              >
                Register School
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-600 transition shadow-lg shadow-primary/20"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
