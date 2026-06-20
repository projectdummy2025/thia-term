import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { verifyVendor } from "@/lib/vendor-verify"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const verifySchema = z.object({
  supplierDid: z.string().min(1, "supplierDid required"),
  poAmount: z.number().positive(),
  token: z.string().default("USDC"),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const raw = await req.json()
  const parsed = verifySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 })
  }

  const { supplierDid, poAmount, token } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.t3nDid) {
    return NextResponse.json({ error: "User has no T3N DID. Register first." }, { status: 400 })
  }

  try {
    const result = await verifyVendor(user.t3nDid, { supplierDid, poAmount, token })

    await logAudit({
      userId,
      action: "vendor.verify.executed",
      entityId: supplierDid,
      entityType: "Vendor",
      metadata: result,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error("[vendor-verify] TEE call failed:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Verification failed" },
      { status: 500 },
    )
  }
}
