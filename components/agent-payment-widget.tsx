"use client"
import { useState } from "react"
import { Bot, CheckCircle, ExternalLink, User } from "lucide-react"

interface AgentPaymentWidgetProps {
  agents: { id: string; name: string; walletAddress?: string | null }[]
}

export function AgentPaymentWidget({ agents }: AgentPaymentWidgetProps) {
  const [fromAgent, setFromAgent] = useState('')
  const [toType, setToType] = useState<'human' | 'agent'>('human')
  const [toAddress, setToAddress] = useState('')
  const [toAgent, setToAgent] = useState('')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState('HSK')
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ txHash: string; txUrl: string } | null>(null)
  const [error, setError] = useState('')

  async function handlePay() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/agents/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: fromAgent,
          toAddress: toType === 'human' ? toAddress : undefined,
          toAgentId: toType === 'agent' ? toAgent : undefined,
          amount: parseFloat(amount),
          token,
          memo,
          paymentType: toType === 'agent' ? 'agent-to-agent' : 'agent-to-human',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment failed')
      setResult({ txHash: data.txHash, txUrl: data.txUrl })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-white">Agent Payments</h3>
        <p className="text-sm text-slate-500">Autonomous settlements via T3N</p>
      </div>

      <div className="space-y-4">
        {/* From Agent */}
        <div>
          <label className="text-sm font-medium text-slate-400 mb-1 block">From Agent</label>
          <select
            value={fromAgent}
            onChange={(e) => setFromAgent(e.target.value)}
            className="w-full border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white appearance-none cursor-pointer bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239b9ba5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4 6 8 10 12 6'/%3E%3C/svg%3E")` }}
          >
            <option value="" className="bg-[#0f172a] text-slate-400">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#0f172a]">
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setToType('human')}
            className={`flex-1 py-2.5 text-sm rounded-xl border font-medium transition-colors ${
              toType === 'human'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:border-sky-500/40 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 inline mr-1.5" /> Human
          </button>
          <button
            onClick={() => setToType('agent')}
            className={`flex-1 py-2.5 text-sm rounded-xl border font-medium transition-colors ${
              toType === 'agent'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:border-sky-500/40 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 inline mr-1.5" /> Agent
          </button>
        </div>

        {/* Destination */}
        {toType === 'human' ? (
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="Recipient wallet 0x..."
            className="w-full border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white placeholder:text-slate-600"
          />
        ) : (
          <select
            value={toAgent}
            onChange={(e) => setToAgent(e.target.value)}
            className="w-full border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white appearance-none cursor-pointer bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239b9ba5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4 6 8 10 12 6'/%3E%3C/svg%3E")` }}
          >
            <option value="" className="bg-[#0f172a] text-slate-400">Select destination agent...</option>
            {agents
              .filter((a) => a.id !== fromAgent)
              .map((a) => (
                <option key={a.id} value={a.id} className="bg-[#0f172a]">
                  {a.name}
                </option>
              ))}
          </select>
        )}

        {/* Amount + Token */}
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            type="number"
            min="0"
            step="any"
            className="flex-1 border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white placeholder:text-slate-600"
          />
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-28 border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white appearance-none cursor-pointer bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%239b9ba5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4 6 8 10 12 6'/%3E%3C/svg%3E")` }}
          >
            <option className="bg-[#1e293b]">HSK</option>
            <option className="bg-[#1e293b]">USDC</option>
            <option className="bg-[#1e293b]">USDT</option>
          </select>
        </div>

        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Memo (optional)"
          className="w-full border border-white/[0.08] rounded-xl px-4 py-3 text-sm bg-white/[0.04] text-white placeholder:text-slate-600"
        />

        <button
          onClick={handlePay}
          disabled={loading || !fromAgent || !amount}
          className="w-full bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30"
        >
          {loading ? (
            'Sending via T3N...'
          ) : (
            <>
              <Bot className="w-4 h-4" /> Execute Payment
            </>
          )}
        </button>

        {result && (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-sky-400">Payment sent via T3N</p>
              <a
                href={result.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400/70 flex items-center gap-1 mt-1 hover:text-sky-400"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
