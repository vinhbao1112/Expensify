import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { spreadsheetId, monthYear } = await request.json()
  if (!spreadsheetId || !monthYear) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const service = new GoogleSheetsService(session.accessToken as string)
    await service.clearMonthData(spreadsheetId, monthYear)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error clearing month data:", error)
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: error.response?.data || null 
    }, { status: 500 })
  }
}
