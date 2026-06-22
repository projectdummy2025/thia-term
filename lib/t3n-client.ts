import {
  T3nClient,
  TenantClient,
  setEnvironment,
  loadWasmComponent,
  createEthAuthInput,
  eth_get_address,
  metamask_sign,
  getNodeUrl,
  getScriptVersion as t3nGetScriptVersion,
  type WasmComponent,
} from "@terminal3/t3n-sdk"

const env = process.env.T3N_ENVIRONMENT || "testnet"
setEnvironment(env as "testnet" | "production")

let wasmComponent: WasmComponent | null = null
let t3nClient: T3nClient | null = null
let tenantClient: TenantClient | null = null
let tenantDid: string | null = null

export async function getT3nClient(): Promise<T3nClient> {
  if (t3nClient) return t3nClient

  const apiKey = process.env.T3N_API_KEY
  if (!apiKey) throw new Error("T3N_API_KEY not set")

  if (!wasmComponent) {
    wasmComponent = await loadWasmComponent()
  }

  const address = eth_get_address(apiKey)

  t3nClient = new T3nClient({
    wasmComponent,
    handlers: {
      EthSign: metamask_sign(address, undefined, apiKey),
    },
  })

  return t3nClient
}

export async function getTenantClient(): Promise<{ tenant: TenantClient; did: string }> {
  if (tenantClient && tenantDid) return { tenant: tenantClient, did: tenantDid }

  const t3n = await getT3nClient()
  await t3n.handshake()
  const did = await t3n.authenticate(createEthAuthInput(eth_get_address(process.env.T3N_API_KEY!)))
  tenantDid = did.value

  tenantClient = new TenantClient({
    t3n,
    baseUrl: getNodeUrl(),
    tenantDid,
  })

  return { tenant: tenantClient, did: tenantDid }
}

export async function destroyT3nSession(): Promise<void> {
  t3nClient = null
  tenantClient = null
  tenantDid = null
}

export { getNodeUrl }

/**
 * Wraps T3N's getScriptVersion to sanitize the version string into valid semver.
 * T3N testnet sometimes returns `0.1.<timestamp>` where the patch is a full
 * epoch millisecond (e.g. `0.1.1781951928847`) — not valid semver (max 9 digits).
 */
export async function getScriptVersion(nodeUrl: string, scriptName: string): Promise<string> {
  const raw = await t3nGetScriptVersion(nodeUrl, scriptName)
  // Sanitize to valid semver: split on '.', clamp each numeric part to valid range
  const parts = raw.split('.').map(p => {
    const n = parseInt(p, 10)
    if (isNaN(n)) return p
    // semver versions are uint32 max 2147483647 — clamp
    return String(Math.min(n, 2147483647))
  })
  return parts.join('.')
}
