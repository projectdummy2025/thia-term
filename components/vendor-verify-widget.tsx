"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface VendorVerifyWidgetProps {
  onViewDetails?: () => void
}

export function VendorVerifyWidget({ onViewDetails }: VendorVerifyWidgetProps) {
  const [supplierDid, setSupplierDid] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{
    verified: boolean
    score: number
    timestamp: string
  } | null>(null)

  const handleVerify = async () => {
    if (!supplierDid) {
      toast.error("Please enter a supplier DID")
      return
    }

    // Validate DID format
    if (!supplierDid.startsWith("did:t3n:")) {
      toast.error("Invalid DID format. Must start with 'did:t3n:'")
      return
    }

    setVerifying(true)
    setResult(null)

    try {
      const res = await fetch("/api/vendor-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierDid,
          poAmount: 100,
          token: "USDC"
        }),
      })
      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || "Verification failed")
      }

      setResult({
        verified: json.data.verified,
        score: json.data.score,
        timestamp: json.data.timestamp,
      })

      if (json.data.verified) {
        toast.success("Vendor verified successfully!")
      } else {
        toast.error("Vendor verification failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed")
      setResult({ verified: false, score: 0, timestamp: new Date().toISOString() })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card-surface p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Vendor Verification</h3>
            <p className="text-xs text-slate-400">Verify suppliers via T3N TEE</p>
          </div>
        </div>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 text-xs"
          >
            View All
            <ExternalLink className="w-3 h-3 ml-1.5" />
          </Button>
        )}
      </div>

      {/* Input Form */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-400">Supplier DID</Label>
          <Input
            placeholder="did:t3n:0x..."
            value={supplierDid}
            onChange={(e) => setSupplierDid(e.target.value)}
            disabled={verifying}
            className="bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 focus:border-sky-500/50 font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Enter T3N DID (not wallet address)
          </p>
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || !supplierDid}
          className="w-full bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-xl shadow-lg shadow-sky-900/30"
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying via TEE...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify Vendor
            </>
          )}
        </Button>
      </div>

      {/* Result Display */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "rounded-xl p-4 border",
              result.verified
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            )}
          >
            <div className="flex items-start gap-3">
              {result.verified ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <p className={cn(
                    "font-semibold text-sm",
                    result.verified ? "text-emerald-300" : "text-red-300"
                  )}>
                    {result.verified ? "Verification Successful" : "Verification Failed"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Compliance Score: <span className="font-bold text-white">{result.score}/100</span>
                  </p>
                </div>
                {result.verified && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Verified at {new Date(result.timestamp).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
        <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-sky-400 font-medium">T3N TEE Verification:</span> Cross-tenant credential check executed in Intel TDX enclave for maximum security.
        </p>
      </div>
    </motion.div>
  )
}
