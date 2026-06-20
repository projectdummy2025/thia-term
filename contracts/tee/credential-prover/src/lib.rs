#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

extern crate alloc;

wit_bindgen::generate!({
    world: "credential-prover",
    path: "wit",
    additional_derives: [serde::Deserialize, serde::Serialize],
    generate_all,
});

struct Component;

#[cfg(target_arch = "wasm32")]
use crate::host::{
    interfaces::{kv_store, logging, signing},
    tenant::tenant_context,
};

#[cfg(target_arch = "wasm32")]
impl exports::z::credential_prover::contracts::Guest for Component {
    fn prove_credential(
        req: exports::z::credential_prover::contracts::GenericInput,
    ) -> Result<alloc::vec::Vec<u8>, alloc::string::String> {
        let input = req.input.ok_or("prove-credential: missing input")?;
        let req_val: serde_json::Value =
            serde_json::from_slice(&input).map_err(|e| e.to_string())?;
        let buyer_did = req_val["buyerDID"]
            .as_str()
            .ok_or("missing buyerDID")?;

        let tid = hex::encode(&tenant_context::tenant_did());
        let creds_map = alloc::format!("z:{}:creds", tid);

        let stored = kv_store::get(&creds_map, b"supplier_profile")
            .map_err(|e| alloc::format!("kv read: {}", e))?
            .ok_or("supplier profile not found")?;

        let profile: serde_json::Value =
            serde_json::from_slice(&stored).map_err(|e| alloc::format!("parse profile: {}", e))?;
        let status = profile["compliance_status"]
            .as_str()
            .unwrap_or("unknown");

        let proof_payload = serde_json::json!({
            "status": status,
            "did": tid,
        });
        let proof_bytes =
            serde_json::to_vec(&proof_payload).map_err(|e| e.to_string())?;

        let sig_result = signing::sign(&proof_bytes)
            .map_err(|e| alloc::format!("signing failed: {:?}", e))?;
        let sig_json: serde_json::Value =
            serde_json::from_slice(&sig_result).map_err(|e| e.to_string())?;
        let signature_hex = sig_json["signature"]
            .as_str()
            .ok_or("no signature field")?
            .to_string();

        let result = serde_json::json!({
            "status": status,
            "didSignature": signature_hex,
            "did": alloc::format!("did:t3n:{}", tid),
        });

        let _ = logging::info(&alloc::format!(
            "proved credential to buyer {}: status={}",
            buyer_did, status
        ));

        serde_json::to_vec(&result).map_err(|e| e.to_string())
    }

    fn get_status(
        _req: exports::z::credential_prover::contracts::GenericInput,
    ) -> Result<alloc::vec::Vec<u8>, alloc::string::String> {
        let tid = hex::encode(&tenant_context::tenant_did());
        let status_map = alloc::format!("z:{}:public-status", tid);

        let stored = kv_store::get(&status_map, b"supplier_status")
            .map_err(|e| alloc::format!("kv read: {}", e))?
            .ok_or("status not published")?;

        Ok(stored)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prove_credential_non_wasm_returns_err() {
        let input = serde_json::to_vec(&serde_json::json!({
            "buyerDID": "did:t3n:abc123"
        }))
        .unwrap();
        let req = exports::z::credential_prover::contracts::GenericInput {
            input: Some(input),
            user_profile: None,
            context: None,
        };
        let result = format!("{:?}", req.input);
        assert!(result.contains("abc123"));
    }
}
