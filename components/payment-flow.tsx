"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, CheckCircle, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PaymentLinkInfo {
  id: string
  code: string
  name: string
  network: string
  sourceToken: string
  amountMin: number
  amountMax: number
  recipientAddress: string
  ownerName: string
}

interface PaymentFlowProps {
  paymentLink: PaymentLinkInfo
}

export function PaymentFlow({ paymentLink }: PaymentFlowProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [amount, setAmount] = useState(paymentLink.amountMin.toString())
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [payerAddress, setPayerAddress] = useState("")
  const [payerName, setPayerName] = useState("")

  const networkName = paymentLink.network
  const tokenSymbol = paymentLink.sourceToken

  const handlePay = async () => {
    if (!payerAddress || !payerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid wallet address")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/payment-links/${paymentLink.code}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerAddress,
          payerName: payerName || undefined,
          amount: parseFloat(amount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTxHash(data.data?.txHash || null)
        setDone(true)
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
        <p className="text-lg font-semibold text-slate-900">Payment Successful!</p>
        <p className="text-sm text-slate-500">Your payment has been processed via T3N TEE.</p>
        {txHash && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Transaction Hash</p>
            <p className="text-xs font-mono text-slate-700 break-all">{txHash}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Pay with T3N Wallet</p>
        <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Secured
        </span>
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
        <div>
          <Label className="text-sm font-medium text-slate-700">Amount ({tokenSymbol})</Label>
          <Input
            type="number"
            step="0.01"
            min={paymentLink.amountMin}
            max={paymentLink.amountMax}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 text-lg font-semibold"
          />
        </div>
        <div className="text-xs text-slate-500 space-y-1">
          <p>Network: {networkName}</p>
          <p>Recipient: {paymentLink.recipientAddress.slice(0, 10)}...{paymentLink.recipientAddress.slice(-6)}</p>
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
          <><ArrowRight className="mr-2 h-4 w-4" /> Pay with T3N</>
        )}
      </Button>
    </div>
  )
}
