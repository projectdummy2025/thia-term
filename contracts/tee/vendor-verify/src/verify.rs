use crate::host::{
    interfaces::{kv_store, logging, http_with_placeholders as hwp},
    tenant::tenant_context,
};

fn get_tid_hex() -> String {
    let tid = tenant_context::tenant_did();
    hex::encode(&tid)
}

pub fn verify_vendor(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: serde_json::Value = serde_json::from_slice(input).map_err(|e| e.to_string())?;
    let supplier_did = req["supplierDid"].as_str().ok_or("missing supplierDid")?;

    let tid = get_tid_hex();
    let ofac_map = format!("z:{}:public-ofac-list", tid);

    let _ = logging::info(&format!("verifying vendor: {}", supplier_did));

    let ofac_list_raw = kv_store::get(&ofac_map, b"sanctioned_addresses")
        .map_err(|e| format!("kv read ofac: {}", e))?
        .ok_or("ofac list not found")?;
    let ofac_json: Vec<String> = serde_json::from_slice(&ofac_list_raw)
        .map_err(|e| format!("parse ofac: {}", e))?;

    let has_sanctions = ofac_json.iter().any(|addr| addr.contains(supplier_did));
    if has_sanctions {
        return Err("supplier is on sanctions list".to_string());
    }

    if let Some(status) = req["supplierStatus"].as_str() {
        if status != "compliant" {
            return Err(format!("supplier cross-tenant status is '{}', expected 'compliant'", status));
        }
        let _ = logging::info(&format!("cross-tenant proof validated for {}", supplier_did));
    } else {
        let _ = logging::info(&format!("no cross-tenant proof provided for {}", supplier_did));
    }

    let cred_map = format!("z:{}:supplier-creds", tid);
    let stored_creds = kv_store::get(&cred_map, supplier_did.as_bytes())
        .map_err(|e| format!("kv read creds: {}", e))?
        .ok_or("supplier credentials not found")?;

    let creds: serde_json::Value = serde_json::from_slice(&stored_creds)
        .map_err(|e| format!("parse creds: {}", e))?;

    let tax_id = creds["tax_id"].as_str().ok_or("missing tax_id in creds")?;

    let verify_body = serde_json::json!({
        "tax_id": format!("{{{{profile.{}}}}}", tax_id),
    });

    let resp = hwp::call(&hwp::Request {
        method: hwp::Verb::Post,
        url: "https://api.verify.example/check".to_string(),
        headers: Some(vec![("Content-Type".to_string(), "application/json".to_string())]),
        payload: Some(serde_json::to_vec(&verify_body).map_err(|e| e.to_string())?),
    })
    .map_err(|e| format!("verification call failed: {:?}", e))?;

    if resp.code != 200 {
        return Err(format!("verification rejected: HTTP {}", resp.code));
    }

    let result: serde_json::Value = serde_json::from_slice(&resp.payload)
        .map_err(|e| format!("parse verification response: {}", e))?;
    let verified = result["verified"].as_bool().unwrap_or(false);
    let score = result["score"].as_i64().unwrap_or(0);

    if !verified || score < 60 {
        return Err(format!("vendor verification failed: score={}", score));
    }

    let receipt = serde_json::json!({
        "verified": true,
        "supplierDid": supplier_did,
        "score": score,
        "timestamp": chrono_now(),
    });

    let _ = logging::info(&format!("vendor {} verified with score {}", supplier_did, score));

    serde_json::to_vec(&receipt).map_err(|e| e.to_string())
}

fn chrono_now() -> String {
    "2026-06-20T00:00:00Z".to_string()
}
