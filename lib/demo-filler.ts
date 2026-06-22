/**
 * Demo data filler — pre-fill forms with realistic dummy data for quick testing.
 * Each function returns an object you can spread or assign per-form.
 */

const NAMES = [
  'Acme Corp', 'GlobalTech Solutions', 'Pinnacle Ventures',
  'NexGen Digital', 'Apex Innovations', 'Stellar Industries',
  'Quantum Labs', 'Vertex Systems', 'Orion Partners', 'Atlas Group',
]
const SERVICES = [
  'Web Development — Q2 2026', 'UI/UX Design Sprint',
  'Cloud Infrastructure Setup', 'API Integration Services',
  'Security Audit & Penetration Testing', 'Smart Contract Development',
  'Data Pipeline Migration', 'Mobile App MVP Build',
  'DevOps Consulting — Monthly Retainer', 'Brand Identity Package',
]
const TOKENS = ['USDC', 'HSK', 'USDT', 'cUSD', 'DAI']
const NETWORKS_SHORT = ['t3n_testnet', 't3n', 'celo', 'polygon']
const AGENT_NAMES = ['Invoice Bot', 'Payments Agent', 'Billing Assistant', 'Compliance Guard']
const WALLET_6 = '0x' + Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }

// === Payment Link ===
export const paymentLinkDummy = () => ({
  name: pick(NAMES),
  sourceToken: pick(TOKENS),
  amountMin: String(rand(50, 200)),
  amountMax: String(rand(300, 2000)),
})

// === Invoice ===
export const invoiceDummy = () => ({
  recipientName: pick(NAMES),
  recipientEmail: `billing@${pick(NAMES).replace(/ /g, '').toLowerCase()}.com`,
  issuedTo: pick(NAMES),
  issuedToAddress: WALLET_6,
  description: pick(SERVICES),
  currency: pick(TOKENS),
  network: pick(NETWORKS_SHORT),
  dueAt: new Date(Date.now() + (14 + Math.floor(Math.random() * 30)) * 86400000).toISOString().split('T')[0],
  notes: 'Payment due within terms. Thank you for your business!',
  lineItems: [
    { description: pick(SERVICES), quantity: 1, unitPrice: '1500', total: '1500.00' },
    { description: 'Additional revisions & support', quantity: 5, unitPrice: '150', total: '750.00' },
  ],
  kycRequired: Math.random() > 0.3,
})

// === Agent ===
export const agentDummy = () => ({
  name: pick(AGENT_NAMES),
  description: 'Autonomous agent for ' + pick(['invoicing', 'payroll', 'payment collection', 'billing']),
  walletAddress: `0x${Array(40).fill(0).map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
  capabilitiesText: ['invoicing', 'payroll', 'reconciliation', 'reporting', 'payment-collection', 'reminders']
    .sort(() => Math.random() - 0.5).slice(0, 3).join(', '),
})

// === Agent Rule ===
export const ruleDummy = () => ({
  cron: String(Math.floor(Math.random() * 23)).padStart(2, '0') + ' ' +
    String(Math.floor(Math.random() * 59)).padStart(2, '0') + ' * * ' +
    String(Math.floor(Math.random() * 5 + 1)),
  action: pick(['send_invoice_reminder', 'process_pending_invoices', 'sync_payments', 'generate_report']),
  trigger: pick(['invoice_overdue', 'payment_received', 'invoice_created', 'agent_onboarded']),
  condition: pick(['days_overdue > 7', 'amount > 1000', 'status = "pending"']),
  stepCount: String(Math.floor(Math.random() * 3 + 2)),
})

// === Payroll ===
export const payrollDummy = () => ({
  name: pick(['Monthly Payroll', 'Bi-Weekly Disbursement', 'Contractor Payouts', 'Bonus Distribution']) + ' ' +
    new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
  currency: pick(TOKENS),
})

// === Agent Payment ===
export const agentPaymentDummy = (agentId: string) => ({
  fromAgent: agentId,
  amount: String(rand(50, 5000)),
  token: pick(TOKENS),
  memo: pick(['Payment for services rendered', 'Monthly retainer', 'Project milestone payout', 'Revenue share']),
})
