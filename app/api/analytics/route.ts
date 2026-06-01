import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"
import { requireAccess } from "@/lib/access-control"

export async function GET(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const spreadsheetId = searchParams.get("spreadsheetId")
  const email = (session as any)?.user?.email

  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  const service = new GoogleSheetsService(session.accessToken)

  try {
    const role = await requireAccess(spreadsheetId, service, email, "viewer")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const transactions = await service.getAllTransactions(spreadsheetId)
    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error("GOOGLE API ANALYTICS ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
