import { Moon, Sun } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

import { useTheme } from "@/context/ThemeContext";
import NotificationBell from "@/features/notifications/components/NotificationBell";

function Header() {
  const { user, role } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const getRoleDisplayName = (r?: string | null) => {
    switch (r) {
      case "SUPER_ADMIN":
        return "Super Administrator";
      case "MANAGER":
      case "SCHOOL_MANAGER":
      case "PRINCIPAL":
      case "DIRECTOR":
        return "Principal / Director";
      case "TEACHER":
        return "Faculty Member";
      case "STUDENT":
        return "Student";
      default:
        return r || "Campus User";
    }
  };

  return (
    <header className="flex items-center justify-between sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6 sm:py-3 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      {/* LEFT — stacked on mobile, inline on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
        <h2 className="text-sm sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
          Welcome Back
        </h2>
        <span className="text-base sm:text-lg font-bold text-primary tracking-tight truncate">
          {user?.firstName} {user?.lastName}
        </span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* USER INFO — hidden on mobile */}
        <div className="hidden sm:flex text-right flex-col justify-center">
          <p className="text-xs font-bold text-primary tracking-wider uppercase">
            {getRoleDisplayName(role)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
            {user?.schoolName || (role === "SUPER_ADMIN" ? "Central System" : user?.schoolId || "")}
          </p>
        </div>

        {/* NOTIFICATIONS */}
        <NotificationBell />

        {/* THEME TOGGLE */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg sm:rounded-xl border border-slate-200 p-1.5 sm:p-2 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-slate-200" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;
