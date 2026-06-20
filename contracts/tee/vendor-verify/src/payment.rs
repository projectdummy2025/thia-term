use crate::host::{
    interfaces::{http, kv_store, logging, signing},
    tenant::tenant_context,
};

fn get_tid_hex() -> String {
    let tid = tenant_context::tenant_did();
    hex::encode(&tid)
}

pub fn process_payment(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: serde_json::Value = serde_json::from_slice(input).map_err(|e| e.to_string())?;
    let to_address = req["toAddress"].as_str().ok_or("missing toAddress")?;
    let amount = req["amount"].as_f64().ok_or("missing amount")?;
    let token = req["token"].as_str().ok_or("missing token")?;

    let tid = get_tid_hex();
    let secrets_map = format!("z:{}:secrets", tid);

    let _ = logging::info(&format!("processing payment: {} {} to {}", amount, token, to_address));

    let _private_key = kv_store::get(&secrets_map, b"agent_private_key")
        .map_err(|e| format!("kv read secrets: {}", e))?
        .ok_or("agent private key not found in secrets map")?;

    let tx_payload = serde_json::json!({
        "to": to_address,
        "value": format!("{}", amount),
        "token": token,
        "chainId": 177,
    });

    let message = serde_json::to_vec(&tx_payload).map_err(|e| e.to_string())?;
    let sig_result = signing::sign(&message)
        .map_err(|e| format!("signing failed: {:?}", e))?;
    let sig_json: serde_json::Value = serde_json::from_slice(&sig_result)
        .map_err(|e| format!("parse sig: {}", e))?;
    let signature_hex = sig_json["signature"]
        .as_str()
        .ok_or("no signature field in signing response")?
        .to_string();
    let signature = hex::decode(&signature_hex)
        .map_err(|e| format!("hex decode sig: {}", e))?;

    let rpc_url = "https://mainnet.hsk.xyz";
    let broadcast_body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_sendRawTransaction",
        "params": [hex::encode(&signature)],
        "id": 1,
    });

    let resp = http::call(&http::Request {
        method: http::Verb::Post,
        url: rpc_url.to_string(),
        headers: Some(vec![("Content-Type".to_string(), "application/json".to_string())]),
        payload: Some(serde_json::to_vec(&broadcast_body).map_err(|e| e.to_string())?),
    })
    .map_err(|e| format!("broadcast failed: {:?}", e))?;

    if resp.code != 200 {
        return Err(format!("RPC broadcast failed: HTTP {}", resp.code));
    }

    let rpc_result: serde_json::Value = serde_json::from_slice(&resp.payload)
        .map_err(|e| format!("parse RPC response: {}", e))?;
    let tx_hash = rpc_result["result"].as_str()
        .ok_or("no tx hash in RPC response")?;

    let audit_entry = serde_json::json!({
        "action": "payment",
        "to": to_address,
        "amount": amount,
        "token": token,
        "txHash": tx_hash,
        "timestamp": "2026-06-20T00:00:00Z",
    });

    let audit_map = format!("z:{}:audit", tid);
    let _ = kv_store::put(&audit_map, tx_hash.as_bytes(), &serde_json::to_vec(&audit_entry).map_err(|e| e.to_string())?);

    let _ = logging::info(&format!("payment executed: tx {}", tx_hash));

    let receipt = serde_json::json!({
        "success": true,
        "txHash": tx_hash,
        "txUrl": format!("https://hashkey.blockscout.com/tx/{}", tx_hash),
        "receipt": format!("z:{}:audit:{}", tid, tx_hash),
    });

    serde_json::to_vec(&receipt).map_err(|e| e.to_string())
}
