import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

// ============================================================
// ParrotRehome — Role-Based Access Control
// Permission matrix from Cahier Fonctionnel p.09
//
//   Role                | See requests | Payment            | Inventory | Users
//   --------------------|---------------|--------------------|-----------|-------
//   SUPER_ADMIN         | All           | Configure/validate| All       | All
//   MANAGER             | Team          | Validate per rights| Manage    | Agents
//   AGENT               | Assigned      | Prepare/read       | Read       | None
//   STOCK_MANAGER       | Limited       | None               | Manage     | None
//   AVIAN_PROFESSIONAL  | RDV assigned  | Authorized status  | Useful read| None
//   CLIENT              | Own only      | Submit reference   | None       | None
// ============================================================

export type Action =
  | "request:view:all"
  | "request:view:team"
  | "request:view:assigned"
  | "request:view:own"
  | "request:assign"
  | "request:transfer"
  | "request:export"
  | "request:cancel"
  | "payment:configure"
  | "payment:validate"
  | "payment:prepare_instructions"
  | "payment:deposit_reference"
  | "inventory:manage_birds"
  | "inventory:manage_products"
  | "inventory:read"
  | "users:manage"
  | "users:manage_agents"
  | "appointments:manage"
  | "cms:manage"
  | "metrics:view"
  | "audit:view";

const MATRIX: Record<Role, Action[]> = {
  SUPER_ADMIN: [
    "request:view:all",
    "request:assign",
    "request:transfer",
    "request:export",
    "request:cancel",
    "payment:configure",
    "payment:validate",
    "payment:prepare_instructions",
    "inventory:manage_birds",
    "inventory:manage_products",
    "inventory:read",
    "users:manage",
    "appointments:manage",
    "cms:manage",
    "metrics:view",
    "audit:view",
  ],
  MANAGER: [
    "request:view:team",
    "request:assign",
    "request:transfer",
    "request:export",
    "request:cancel",
    "payment:validate",
    "payment:prepare_instructions",
    "inventory:manage_birds",
    "inventory:manage_products",
    "inventory:read",
    "users:manage_agents",
    "appointments:manage",
    "cms:manage",
    "metrics:view",
    "audit:view",
  ],
  AGENT: [
    "request:view:assigned",
    "request:cancel",
    "payment:prepare_instructions",
    "inventory:read",
    "metrics:view",
  ],
  STOCK_MANAGER: [
    "request:view:team",
    "inventory:manage_birds",
    "inventory:manage_products",
    "inventory:read",
  ],
  AVIAN_PROFESSIONAL: [
    "request:view:assigned",
    "appointments:manage",
    "inventory:read",
  ],
  CLIENT: [
    "request:view:own",
    "payment:deposit_reference",
  ],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.includes(action) ?? false;
}

export function isStaff(role: Role): boolean {
  return role !== "CLIENT";
}

export function isAdminRole(role: Role): boolean {
  return ["SUPER_ADMIN", "MANAGER", "AGENT", "STOCK_MANAGER", "AVIAN_PROFESSIONAL"].includes(role);
}

// Throws on unauthorized — for use in API routes / server components
export async function requireAction(
  userRole: Role,
  action: Action
): Promise<void> {
  if (!can(userRole, action)) {
    throw new Error(`Unauthorized: role ${userRole} cannot perform ${action}`);
  }
}

// Guard for admin pages — accepts any staff role
export async function requireStaff(userRole: Role | undefined | null): Promise<void> {
  if (!userRole || !isAdminRole(userRole)) {
    throw new Error("Unauthorized: staff access required");
  }
}

// Server helper: get current user + verify action
export async function getCurrentUserWithAction(action: Action) {
  const { getServerUser } = await import("@/lib/auth");
  const u = await getServerUser();
  if (!u) return { user: null, ok: false as const };
  if (!can(u.role, action)) return { user: u, ok: false as const };
  return { user: u, ok: true as const };
}

// Customer-facing requests visible to this role
export function visibleRequestFilter(role: Role, userId: string): Record<string, unknown> {
  switch (role) {
    case "SUPER_ADMIN":
      return {};
    case "MANAGER":
    case "STOCK_MANAGER":
      return {}; // team-wide view — production may restrict by team
    case "AGENT":
    case "AVIAN_PROFESSIONAL":
      return { agentId: userId };
    case "CLIENT":
      return { customerId: userId };
    default:
      return { id: "never" }; // invisible
  }
}
