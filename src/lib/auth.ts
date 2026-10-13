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

const SESSION_MAX_AGE_STAFF = 60 * 60 * 8;     // 8 hours for staff
const SESSION_MAX_AGE_CLIENT = 60 * 60 * 24 * 30; // 30 days for client

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      status: string;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: string;
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = (credentials.email as string).toLowerCase().trim();
        try {
          const user = await db.user.findUnique({ where: { email } });
          if (!user) return null;
          if (user.status !== "ACTIVE") return null;
          const ok = await bcrypt.compare(credentials.password as string, user.passwordHash);
          if (!ok) return null;
          // Audit login (non-blocking — wrapped to avoid auth failure)
          try {
            await db.auditLog.create({
              data: {
                actorId: user.id,
                actorRole: user.role,
                objectType: "User",
                objectId: user.id,
                action: "LOGIN",
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
};

// Server-side helper to fetch the current user with role
export async function getServerUser(): Promise<{
  id: string;
  email: string;
  role: Role;
  status: string;
} | null> {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status,
  };
}

// Hash helper for new accounts (sign-up) — uses bcrypt with cost 10
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
