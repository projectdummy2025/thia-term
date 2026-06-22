import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      walletAddress?: string | null
      walletType?: string | null
      isDemo?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    walletAddress?: string | null
    walletType?: string | null
    isDemo?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    walletAddress?: string | null
    walletType?: string | null
    isDemo?: boolean
  }
}
