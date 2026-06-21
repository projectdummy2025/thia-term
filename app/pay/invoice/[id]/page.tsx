import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { InvoicePayClient } from "./client"

interface Props {
  params: { id: string }
}

export default async function InvoicePayPage({ params }: Props) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, walletAddress: true } },
    },
  })

  if (!invoice) notFound()

  const recipientAddress = invoice.user.walletAddress ?? ""
  const senderName = invoice.user.name ?? invoice.user.email ?? "Thia-Term User"

  return (
    <InvoicePayClient
      invoiceId={invoice.id}
      amount={invoice.amount}
      currency={invoice.currency}
      network={invoice.network}
      recipientAddress={recipientAddress}
    />
  )
}
