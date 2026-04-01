import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, getUser, createUserFromOAuth } from "@/lib/db/queries";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

export type UserPlan = "free" | "premium";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      plan: UserPlan;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    plan?: UserPlan;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    plan: UserPlan;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "");
        const password = String(credentials.password ?? "");
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        return { ...user, type: "regular", plan: (user as any).plan ?? "free" };
      },
    }),
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existing = await getUser(user.email);
          if (existing.length === 0) {
            const [created] = await createUserFromOAuth(user.email, user.name ?? "");
            user.id = created.id;
          } else {
            user.id = existing[0].id;
            (user as any).plan = existing[0].plan ?? "free";
          }
          (user as any).type = "regular";
        } catch (e) {
          console.error("Google signIn error:", e);
          return false;
        }
      }
      return true;
    },
    jwt({ token, user, account, profile }) {
      if (user) {
        token.id = (user.id ?? token.sub) as string;
        token.type = (user as any).type ?? "regular";
        token.plan = (user as any).plan ?? "free";
      }
      if (account) {
        token.id = (token.sub ?? user?.id) as string;
        token.type = "regular";
      }
      if (profile) {
        token.picture = (profile as any).picture ?? token.picture;
        token.name = profile.name ?? token.name;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.image = token.picture as string;
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.plan = token.plan;
      }

      return session;
    },
  },
});
