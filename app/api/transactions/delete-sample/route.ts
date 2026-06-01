import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { requireAccess } from "@/lib/access-control"

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { spreadsheetId } = await request.json()
  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 })
  }

  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: "Missing user email" }, { status: 401 })
  }

  try {
    const service = new GoogleSheetsService(session.accessToken as string)
    const role = await requireAccess(spreadsheetId, service, email, "admin")
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await service.deleteSampleTransactions(spreadsheetId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting sample data:", error)
    return NextResponse.json(
      {
        error: error.message || "Internal Server Error",
        details: error.response?.data || null,
      },
      { status: 500 },
    )
  }
}
