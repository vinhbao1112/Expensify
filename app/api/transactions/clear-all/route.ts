import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as any
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { spreadsheetId } = await request.json()
  if (!spreadsheetId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const service = new GoogleSheetsService(session.accessToken as string)
    await service.clearAllData(spreadsheetId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error clearing all data:", error)
    return NextResponse.json({ 
      error: error.message || "Internal Server Error",
      details: error.response?.data || null 
    }, { status: 500 })
  }
}
