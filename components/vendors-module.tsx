"use client"

import { useState, useEffect, useCallback } from "react"
import { ShieldCheck, Loader2, ExternalLink, CheckCircle, XCircle, Search } from "lucide-react"

interface Vendor {
  did: string
  status: "unverified" | "verified" | "failed"
  score?: number
  receipt?: string
  verifiedAt?: string
}

export function VendorsModule() {
  const [supplierDid, setSupplierDid] = useState("")
  const [token, setToken] = useState("USDC")
  const [amount, setAmount] = useState(0)
  const [toAddress, setToAddress] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [paying, setPaying] = useState(false)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [payResult, setPayResult] = useState<{ txHash: string; txUrl: string } | null>(null)
  const [error, setError] = useState("")
  const [history, setHistory] = useState<Vendor[]>([])

  const handleVerify = async () => {
    if (!supplierDid) return
    setVerifying(true)
    setError("")
    setVendor(null)

    try {
      const res = await fetch("/api/vendor-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierDid, poAmount: amount || 100, token }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Verification failed")

      const v: Vendor = {
        did: supplierDid,
        status: json.data.verified ? "verified" : "failed",
        score: json.data.score,
        receipt: json.data.receipt,
        verifiedAt: json.data.timestamp,
      }
      setVendor(v)
      setHistory(prev => [v, ...prev])
    } catch (err: any) {
      setError(err.message)
      setVendor({ did: supplierDid, status: "failed" })
    } finally {
      setVerifying(false)
    }
  }

  const handlePay = async () => {
    if (!vendor || !toAddress) return
    setPaying(true)
    setError("")

    try {
      const res = await fetch("/api/vendor-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierDid: vendor.did,
          toAddress,
          amount,
          token,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Payment failed")

      setPayResult(json.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          VendorVerify
        </h2>
        <p className="text-slate-400 mt-1">
          Verify supplier credentials via T3N TEE before processing payments.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] p-6 space-y-5"
        style={{ background: "rgba(10, 18, 32, 0.6)" }}>
        <h3 className="text-lg font-semibold text-white">Verify Supplier</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <label className="text-sm text-slate-400">Supplier DID</label>
            <input
              value={supplierDid}
              onChange={e => setSupplierDid(e.target.value)}
              placeholder="did:t3n:02153a..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="100"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Token</label>
            <select
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="HSK">HSK</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying || !supplierDid}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{
            background: verifying ? "#1e293b" : "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            boxShadow: verifying ? "none" : "0 0 20px rgba(16,185,129,0.25)",
          }}
        >
          {verifying ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying in TEE...
            </span>
          ) : (
            "Verify Supplier"
          )}
        </button>

        {vendor && vendor.status === "verified" && (
          <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Supplier Verified</span>
              {vendor.score && <span className="text-sm ml-auto">Score: {vendor.score}/100</span>}
            </div>
            <p className="text-sm text-slate-400">DID: {vendor.did}</p>
            {vendor.receipt && <p className="text-sm text-slate-500">Receipt: {vendor.receipt}</p>}

            <div className="border-t border-white/[0.06] pt-3 space-y-3">
              <h4 className="text-sm font-medium text-white">Process Payment</h4>
              <input
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                placeholder="0x... recipient address"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handlePay}
                disabled={paying || !toAddress}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                style={{
                  background: paying ? "#1e293b" : "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                  boxShadow: paying ? "none" : "0 0 20px rgba(59,130,246,0.25)",
                }}
              >
                {paying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing & Broadcasting in TEE...
                  </span>
                ) : (
                  `Pay ${amount} ${token} via TEE`
                )}
              </button>

              {payResult && (
                <div className="rounded-xl bg-blue-500/[0.08] border border-blue-500/20 p-3">
                  <p className="text-sm text-emerald-400 font-medium mb-1">✅ Payment Sent</p>
                  <a
                    href={payResult.txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {payResult.txHash.slice(0, 16)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {vendor && vendor.status === "failed" && !verifying && (
          <div className="rounded-xl bg-red-500/[0.08] border border-red-500/20 p-4 flex items-center gap-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error || "Verification failed"}</span>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: "rgba(10, 18, 32, 0.6)" }}>
          <h3 className="text-lg font-semibold text-white mb-4">Verification History</h3>
          <div className="space-y-2">
            {history.map((v, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                {v.status === "verified" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span className="text-sm text-slate-300 font-mono flex-1 truncate">{v.did}</span>
                {v.score && <span className="text-xs text-slate-500">Score: {v.score}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
