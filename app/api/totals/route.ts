import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession(authOptions) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const spreadsheetId = searchParams.get("spreadsheetId")

  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 })
  }

  const service = new GoogleSheetsService(session.accessToken)
  
  try {
    const totals = await service.getAllTimeTotals(spreadsheetId)
    return NextResponse.json(totals)
  } catch (error: any) {
    console.error("GOOGLE API TOTALS ERROR:", error.response?.data || error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
