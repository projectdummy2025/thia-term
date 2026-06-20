import { getT3nClient, getTenantClient, getScriptVersion, getNodeUrl } from "./t3n-client"

export interface VendorVerifyRequest {
  supplierDid: string
  poAmount: number
  token: string
}

export interface CredentialProof {
  status: string
  didSignature: string
  did: string
}

export interface VendorVerifyResult {
  verified: boolean
  supplierDid: string
  score: number
  timestamp: string
  receipt: string
  supplierProof?: CredentialProof
}

export interface VendorPayRequest {
  supplierDid: string
  toAddress: string
  amount: number
  token: "HSK" | "USDC" | "USDT"
  memo?: string
}

export interface VendorPayResult {
  success: boolean
  txHash: string
  txUrl: string
  receipt: string
}

const CONTRACT_TAIL = "vendor-contracts"
const CREDENTIAL_CONTRACT_TAIL = "credential-contracts"

function extractTid(did: string): string {
  return did.slice("did:t3n:".length)
}

export async function verifyVendor(
  tenantDid: string,
  req: VendorVerifyRequest
): Promise<VendorVerifyResult> {
  const t3n = await getT3nClient()
  const { tenant } = await getTenantClient()
  const tenantId = extractTid(tenantDid)

  let supplierProof: CredentialProof | undefined

  try {
    const supplierTid = extractTid(req.supplierDid)
    const supplierScriptName = `z:${supplierTid}:${CREDENTIAL_CONTRACT_TAIL}`

    const proofRaw = await tenant.executeBusinessContract(t3n, {
      tenant: req.supplierDid,
      contract: CREDENTIAL_CONTRACT_TAIL,
      functionName: "prove-credential",
      input: { buyerDID: tenantDid },
    })

    supplierProof = proofRaw as CredentialProof
  } catch (err) {
    console.warn("supplier credential-prover call failed (cross-tenant):", err)
  }

  const scriptName = `z:${tenantId}:${CONTRACT_TAIL}`
  const scriptVersion = await getScriptVersion(getNodeUrl(), scriptName)

  const result = await t3n.executeAndDecode({
    script_name: scriptName,
    script_version: scriptVersion,
    function_name: "verify-vendor",
    input: {
      supplierDid: req.supplierDid,
      poAmount: req.poAmount,
      token: req.token,
      supplierStatus: supplierProof?.status ?? null,
      supplierSignature: supplierProof?.didSignature ?? null,
    },
  })

  return { ...(result as VendorVerifyResult), supplierProof }
}

export async function processVendorPayment(
  tenantDid: string,
  req: VendorPayRequest
): Promise<VendorPayResult> {
  const t3n = await getT3nClient()
  const tenantId = extractTid(tenantDid)
  const scriptName = `z:${tenantId}:${CONTRACT_TAIL}`
  const scriptVersion = await getScriptVersion(getNodeUrl(), scriptName)

  const result = await t3n.executeAndDecode({
    script_name: scriptName,
    script_version: scriptVersion,
    function_name: "process-payment",
    input: {
      toAddress: req.toAddress,
      amount: req.amount,
      token: req.token,
      memo: req.memo || "",
    },
  })

  return result as VendorPayResult
}
