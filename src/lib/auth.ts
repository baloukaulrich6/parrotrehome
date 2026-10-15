import { audit } from "./audit";
import { verifyMfaTokenStep } from "./mfa";
import { mfaKeyId, readMfaSecret } from "./mfa-storage";
import { sessionAllowsAccess } from "./session-policy";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// ============================================================
// ParrotRehome — NextAuth configuration
// Cahier p.09: hashed passwords, MFA for staff, server-side
// roles, expiring sessions.
// ============================================================

const SESSION_MAX_AGE_CLIENT = 60 * 60 * 24 * 30; // 30 days for client

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      status: string;
      authAt?: number;
      mfaKeyId?: string;
      mfaEnabled?: boolean;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    status: string;
    authAt?: number;
    mfaKeyId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: string;
    authAt?: number;
    mfaKeyId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_CLIENT, // default; tightened per-role below
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        try {
          const user = await db.user.findUnique({ where: { email } });
          if (!user) return null;
          if (user.status !== "ACTIVE") return null;
          const ok = await bcrypt.compare(credentials.password as string, user.passwordHash);
          if (!ok) {
            await audit({ actorId: user.id, actorRole: user.role, objectType: "User", objectId: user.id, action: "LOGIN_FAILED", metadata: { reason: "INVALID_CREDENTIALS" } });
            return null;
          }
          let verifiedKey = "";
          if (user.role !== "CLIENT" && user.mfaEnabled) {
            if (!user.mfaSecret) return null;
            const step = await verifyMfaTokenStep(credentials.totp || "", readMfaSecret(user.mfaSecret).secret);
            if (step === null) {
              await audit({ actorId: user.id, actorRole: user.role, objectType: "User", objectId: user.id, action: "LOGIN_FAILED", metadata: { reason: "INVALID_AUTHENTICATOR" } });
              return null;
            }
            verifiedKey = mfaKeyId(user.mfaSecret);
            // Unique server-side claim prevents reuse of the same authenticator code.
            await db.sessionToken.deleteMany({ where: { token: { startsWith: "mfa:" }, expiresAt: { lt: new Date() } } });
            try {
              await db.sessionToken.create({ data: { userId: user.id,
                token: `mfa:${mfaKeyId(`${user.id}:${verifiedKey}:${step}`)}`,
                expiresAt: new Date((step + 3) * 30_000),
              } });
            } catch (error) {
              if ((error as { code?: string }).code === "P2002") {
                await audit({ actorId: user.id, actorRole: user.role, objectType: "User", objectId: user.id, action: "LOGIN_FAILED", metadata: { reason: "AUTHENTICATOR_CODE_ALREADY_USED" } });
                return null;
              }
              throw error;
            }
          }
          await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
          // Audit login (non-blocking — wrapped to avoid auth failure)
          try {
            await db.auditLog.create({
              data: {
                actorId: user.id,
                actorRole: user.role,
                objectType: "User",
                objectId: user.id,
                action: "LOGIN",
                metadata: JSON.stringify({ mfaVerified: !!verifiedKey, setupRequired: user.role !== "CLIENT" && !user.mfaEnabled }),
                timestamp: new Date(),
              },
            });
          } catch (auditErr) {
            console.error("[auth] audit log failed:", auditErr);
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            role: user.role,
            status: user.status,
            authAt: Date.now(),
            mfaKeyId: verifiedKey,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as Role) ?? "CLIENT";
        token.status = user.status as string;
        token.authAt = user.authAt;
        token.mfaKeyId = user.mfaKeyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.authAt = token.authAt;
        session.user.mfaKeyId = token.mfaKeyId;
      }
      return session;
    },
  },
};

// Server-side helper to fetch the current user with role
export async function getServerUser(options: { allowMfaSetup?: boolean } = {}) {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: {
    id: true, email: true, name: true, role: true, status: true, mfaEnabled: true, mfaSecret: true,
  } });
  if (!user || !sessionAllowsAccess(user, session.user, user.mfaSecret ? mfaKeyId(user.mfaSecret) : "", options.allowMfaSetup)) return null;
  // Do not return stored authenticator secrets to callers or client components.
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, mfaEnabled: user.mfaEnabled };
}

// Hash helper for new accounts (sign-up) — uses bcrypt with cost 10
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
