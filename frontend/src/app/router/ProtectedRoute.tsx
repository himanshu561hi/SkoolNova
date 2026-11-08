import { Navigate, useLocation } from "react-router-dom";

import type { PropsWithChildren } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";

import { ROUTE_PATHS } from "./routePaths";

type ProtectedRouteProps = PropsWithChildren & {
  allowedRoles?: string[];
};

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  /*
   =========================
   AUTH STORE
   =========================
  */

  const { isAuthenticated, user } = useAuthStore();

  /*
   =========================
   NOT AUTHENTICATED
   =========================
  */

  if (!isAuthenticated) {
    return <Navigate replace to={ROUTE_PATHS.LOGIN} />;
  }

  /*
   =========================
   MUST CHANGE PASSWORD
   =========================
  */

  const location = useLocation();

  if (user?.mustChangePassword && location.pathname !== ROUTE_PATHS.CHANGE_PASSWORD) {
    return <Navigate replace to={ROUTE_PATHS.CHANGE_PASSWORD} />;
  }

  /*
   =========================
   ROLE CHECK
   =========================
  */

  if (allowedRoles && user?.role) {
    const normalizedRole = user.role.trim().toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map((r) => r.trim().toUpperCase());
    const isAllowed =
      normalizedAllowedRoles.includes(normalizedRole) ||
      (normalizedRole === "SCHOOL_MANAGER" && normalizedAllowedRoles.includes("MANAGER")) ||
      (normalizedRole === "MANAGER" && normalizedAllowedRoles.includes("SCHOOL_MANAGER"));

    if (!isAllowed) {
      return <Navigate replace to={ROUTE_PATHS.LOGIN} />;
    }
  }

  return children;
}

export default ProtectedRoute;
