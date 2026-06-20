import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { getT3nClient } from "@/lib/t3n-client"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const t3n = await getT3nClient()
    const usage = await t3n.getUsage()
    return NextResponse.json({ success: true, data: usage })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch T3N usage" },
      { status: 500 },
    )
  }
}
