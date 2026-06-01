import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { OAuth2Client } from "google-auth-library"
import type { JWT } from "next-auth/jwt"

type GoogleToken = JWT & {
  accessToken?: string
  refreshToken?: string
  accessTokenExpires?: number
  error?: string
}

function createGoogleOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID || "",
    process.env.GOOGLE_CLIENT_SECRET || "",
  )
}

async function refreshGoogleAccessToken(token: GoogleToken): Promise<GoogleToken> {
  try {
    if (!token.refreshToken) {
      throw new Error("Missing Google refresh token")
    }

    const client = createGoogleOAuthClient()
    client.setCredentials({ refresh_token: token.refreshToken })

    const { credentials } = await client.refreshAccessToken()

    return {
      ...token,
      accessToken: credentials.access_token ?? token.accessToken,
      accessTokenExpires: credentials.expiry_date ?? Date.now() + 55 * 60 * 1000,
      refreshToken: credentials.refresh_token ?? token.refreshToken,
      error: undefined,
    }
  } catch (error) {
    console.error("Failed to refresh Google access token:", error)
    return {
      ...token,
      accessToken: undefined,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const googleToken = token as GoogleToken

      if (account) {
        return {
          ...googleToken,
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? googleToken.refreshToken,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 55 * 60 * 1000,
          error: undefined,
        }
      }

      if (
        googleToken.accessTokenExpires &&
        Date.now() < googleToken.accessTokenExpires - 60 * 1000
      ) {
        return googleToken
      }

      if (!googleToken.refreshToken) {
        return {
          ...googleToken,
          accessToken: undefined,
          error: "RefreshAccessTokenError",
        }
      }

      return refreshGoogleAccessToken(googleToken)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken
      session.error = token.error
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
}
