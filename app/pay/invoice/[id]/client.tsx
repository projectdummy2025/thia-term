"use client"

import { useState } from "react"
import { CheckCircle, Loader2, ShieldCheck, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InvoicePayClientProps {
  invoiceId: string
  amount: number
  currency: string
  network: string
  recipientAddress: string
}

export function InvoicePayClient({
  invoiceId,
  amount,
  currency,
  network,
  recipientAddress,
}: InvoicePayClientProps) {
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [payerAddress, setPayerAddress] = useState("")
  const [payerName, setPayerName] = useState("")

  const handlePay = async () => {
    if (!payerAddress || !payerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid wallet address")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerAddress,
          payerName: payerName || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        setTxHash(data.data?.txHash || null)
      } else {
        alert(data.error || "Payment failed")
      }
    } catch {
      alert("Network error")
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-8 text-center space-y-3">
        <CheckCircle className="h-12 w-12 text-sky-500 mx-auto" />
        <p className="text-lg font-semibold text-slate-900">Payment Successful</p>
        <p className="text-sm text-slate-500">
          Your payment has been submitted for processing via T3N.
        </p>
        {txHash && (
          <p className="text-xs font-mono text-slate-400 break-all">TX: {txHash}</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Pay with T3N TEE</p>
        <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Secure
        </span>
      </div>

      <div className="space-y-2 pb-4 border-b border-slate-200">
        <p className="text-2xl font-bold text-slate-900">
          {amount} {currency}
        </p>
        <p className="text-xs text-slate-500">Network: {network}</p>
        <p className="text-xs text-slate-500">
          Recipient: {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">Your Name (optional)</Label>
          <Input
            type="text"
            placeholder="John Doe"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-slate-700">Your Wallet Address</Label>
          <Input
            type="text"
            placeholder="0x..."
            value={payerAddress}
            onChange={(e) => setPayerAddress(e.target.value)}
            className="mt-1.5 font-mono text-sm"
          />
        </div>
      </div>

      <Button
        onClick={handlePay}
        disabled={sending || !payerAddress}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white h-11 font-semibold"
      >
        {sending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing via T3N TEE...</>
        ) : (
          <><Lock className="mr-2 h-4 w-4" /> Pay Invoice with T3N</>
        )}
      </Button>
    </div>
  )
}
