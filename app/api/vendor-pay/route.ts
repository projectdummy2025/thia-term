import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/prisma"
import { processVendorPayment } from "@/lib/vendor-verify"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const paySchema = z.object({
  supplierDid: z.string().min(1),
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().positive(),
  token: z.enum(["HSK", "USDC", "USDT"]).default("USDC"),
  memo: z.string().max(500).optional().default(""),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const raw = await req.json()
  const parsed = paySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 })
  }

  const { supplierDid, toAddress, amount, token, memo } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.t3nDid) {
    return NextResponse.json({ error: "User has no T3N DID" }, { status: 400 })
  }

  try {
    const result = await processVendorPayment(user.t3nDid, {
      supplierDid, toAddress, amount, token, memo,
    })

    await logAudit({
      userId,
      action: "vendor.payment.executed",
      entityId: result.txHash,
      entityType: "Payment",
      metadata: { supplierDid, amount, token, ...result },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error("[vendor-pay] TEE call failed:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Payment failed" },
      { status: 500 },
    )
  }
}
