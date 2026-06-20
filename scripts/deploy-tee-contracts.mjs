// Register TEE contracts with T3N and seed test data
// Usage: T3N_API_KEY=0x... node scripts/deploy-tee-contracts.mjs

import { readFile } from "fs/promises"

const {
  T3nClient, TenantClient, setEnvironment,
  loadWasmComponent, createEthAuthInput, eth_get_address,
  metamask_sign, getNodeUrl,
} = await import("@terminal3/t3n-sdk")

async function registerContract(tenant, tail, version, wasmPath) {
  const wasm = await readFile(wasmPath)
  try {
    const result = await tenant.contracts.register({ tail, version, wasm })
    console.log(`Registered ${tail} contract, id:`, result.contract_id)
    return result.contract_id
  } catch (e) {
    if (e.message && (e.message.includes("already exists") || e.message.includes("not higher"))) {
      // Try to get existing contract ID
      try {
        const info = await tenant.contracts.get({ tail })
        console.log(`${tail} contract already exists, id:`, info.contract_id)
        const fullName = `z:${tenant.tenant_did}:${tail}`
        console.log("Full name:", fullName)
        // Fallback: try listing contracts
        return null
      } catch {
        console.log(`${tail} contract exists (unable to get id), using manual ID lookup needed`)
        return null
      }
    }
    throw e
  }
}

async function createMap(tenant, opts) {
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

async function main() {
  const apiKey = process.env.T3N_API_KEY
  if (!apiKey) throw new Error("T3N_API_KEY not set")

  setEnvironment(process.env.T3N_ENVIRONMENT || "testnet")

  const wasmComponent = await loadWasmComponent()
  const address = eth_get_address(apiKey)

  const t3n = new T3nClient({
    wasmComponent,
    handlers: { EthSign: metamask_sign(address, undefined, apiKey) },
  })

  await t3n.handshake()
  const did = await t3n.authenticate(createEthAuthInput(address))
  const tenantDid = did.value
  console.log("Authenticated as:", tenantDid)

  const tenant = new TenantClient({ t3n, baseUrl: getNodeUrl(), tenantDid })

  // Register contracts (use timestamp-backed version to ensure uniqueness on re-run)
  const ver = `0.1.${Date.now()}`
  const vendorWasm = await readFile("contracts/tee/vendor-verify/target/wasm32-wasip2/release/z_vendor_verify.wasm")
  const credWasm = await readFile("contracts/tee/credential-prover/target/wasm32-wasip2/release/z_credential_prover.wasm")

  const vendorResult = await tenant.contracts.register({
    tail: "vendor-contracts",
    version: ver,
    wasm: vendorWasm,
  })
  const vendorContractId = vendorResult.contract_id
  console.log("Registered vendor-verify contract, id:", vendorContractId)

  const credResult = await tenant.contracts.register({
    tail: "credential-prover",
    version: ver,
    wasm: credWasm,
  })
  const credContractId = credResult.contract_id
  console.log("Registered credential-prover contract, id:", credContractId)

  // Create secrets map
  await createMap(tenant, {
    tail: "secrets",
    visibility: "private",
    writers: { only: [vendorContractId] },
    readers: { only: [vendorContractId] },
  })

  // Seed agent private key into secrets
  if (process.env.TEE_AGENT_PRIVATE_KEY) {
    await tenant.executeControl("map-entry-set", {
      map_name: tenant.canonicalName("secrets"),
      key: "agent_private_key",
      value: process.env.TEE_AGENT_PRIVATE_KEY,
    })
    console.log("Seeded agent private key")
  }

  // Create supplier-creds map
  await createMap(tenant, {
    tail: "supplier-creds",
    visibility: "private",
    writers: { only: [vendorContractId] },
    readers: { only: [vendorContractId] },
  })

  // Create public OFAC list map
  await createMap(tenant, {
    tail: "public-ofac-list",
    visibility: "public",
    writers: "all",
  })

  // Seed default OFAC list
  await tenant.executeControl("map-entry-set", {
    map_name: tenant.canonicalName("public-ofac-list"),
    key: "sanctioned_addresses",
    value: JSON.stringify([]),
  })
  console.log("Seeded OFAC list")

  // Create audit map
  await createMap(tenant, {
    tail: "audit",
    visibility: "private",
    writers: { only: [vendorContractId] },
    readers: { only: [vendorContractId] },
  })

  // Create credential-prover maps (supplier side)
  // try { await tenant.contracts.enable(credContractId) } catch (e) { console.log("enable note:", e.message) }
  await createMap(tenant, {
    tail: "creds",
    visibility: "private",
    writers: { only: [credContractId] },
    readers: { only: [credContractId] },
  })
  await createMap(tenant, {
    tail: "public-status",
    visibility: "public",
    writers: "all",
  })

  console.log("\n✅ Deployment complete!")
  console.log("Tenant DID:", tenantDid)
  console.log("Vendor contract ID:", vendorContractId)
  console.log("Credential prover contract ID:", credContractId)
}

main().catch(console.error)
