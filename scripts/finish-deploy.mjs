// Create remaining maps that failed due to credit exhaustion
// Usage: T3N_API_KEY=0x... node scripts/finish-deploy.mjs

const {
  T3nClient, TenantClient, setEnvironment,
  loadWasmComponent, createEthAuthInput, eth_get_address,
  metamask_sign, getNodeUrl,
} = await import("@terminal3/t3n-sdk")

async function main() {
  const apiKey = process.env.T3N_API_KEY
  if (!apiKey) throw new Error("T3N_API_KEY not set")
  setEnvironment(process.env.T3N_ENVIRONMENT || "testnet")

  const wasmComponent = await loadWasmComponent()
  const address = eth_get_address(apiKey)
  const t3n = new T3nClient({ wasmComponent, handlers: { EthSign: metamask_sign(address, undefined, apiKey) } })
  await t3n.handshake()
  const did = await t3n.authenticate(createEthAuthInput(address))
  const tenantDid = did.value
  console.log("Authenticated as:", tenantDid)

  const tenant = new TenantClient({ t3n, baseUrl: getNodeUrl(), tenantDid })

  // Use the last known working contract IDs
  // From previous successful runs:
  //   vendor-contracts: 299 (or 301 from partial run)
  //   credential-prover: 300
  const vendorContractId = 301
  const credContractId = 300

  async function createMap(opts) {
    try {
      await tenant.maps.create(opts)
      console.log("Created map:", opts.tail)
    } catch (e) {
      if (e.message && e.message.includes("map already exists")) {
        console.log("Map already exists, skipping:", opts.tail)
      } else {
        throw e
      }
    }
  }

  // Try creating remaining maps
  await createMap({
    tail: "creds",
    visibility: "private",
    writers: { only: [credContractId] },
    readers: { only: [credContractId] },
  })

  await createMap({
    tail: "public-status",
    visibility: "public",
    writers: "all",
  })

  console.log("\n✅ Remaining maps created!")
}

main().catch(e => {
  console.error("Failed:", e.message || e)
  if (e.response) console.error(e.response)
})
