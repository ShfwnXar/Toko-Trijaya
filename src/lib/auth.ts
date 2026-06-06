import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"
import { checkLockout, incrementFailedLogins, resetFailedLogins } from "./utils/auth-helpers"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        // Check lockout using helper
        const lockoutStatus = await checkLockout(email)
        if (lockoutStatus.isLocked) {
          return null
        }

        const isValid = await compare(password, user.password)

        if (!isValid) {
          // Increment failed logins using helper
          await incrementFailedLogins(user.id, user.failedLogins)
          return null
        }

        // Reset failed logins on successful authentication using helper
        if (user.failedLogins > 0) {
          await resetFailedLogins(user.id)
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
})
