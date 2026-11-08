import {
  ROLE_PERMISSIONS,
} from "@/config/permissions";

import type {
  UserRole,
} from "@/constants/roles";

export function hasPermission(
  role: UserRole,
  permission: string,
) {
  if (!role) {
    return false;
  }

  let effectiveRole = role.trim().toUpperCase() as string;
  if (effectiveRole === 'PRINCIPAL' || effectiveRole === 'DIRECTOR' || effectiveRole === 'MANAGER') {
    effectiveRole = 'SCHOOL_MANAGER';
  }
  const permissions = ROLE_PERMISSIONS[effectiveRole as UserRole] || ROLE_PERMISSIONS.SCHOOL_MANAGER;

  if (!Array.isArray(permissions)) {
    return false;
  }

  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(
    permission,
  );
}