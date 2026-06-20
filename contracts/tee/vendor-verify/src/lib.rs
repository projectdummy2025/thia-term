#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

extern crate alloc;

wit_bindgen::generate!({
    world: "vendor-verify",
    path: "wit",
    additional_derives: [serde::Deserialize, serde::Serialize],
    generate_all,
});

mod verify;
mod payment;

struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::z::vendor_verify::contracts::Guest for Component {
    fn verify_vendor(req: exports::z::vendor_verify::contracts::GenericInput) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("verify-vendor: missing input")?;
        verify::verify_vendor(&input)
    }

    fn process_payment(req: exports::z::vendor_verify::contracts::GenericInput) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("process-payment: missing input")?;
        payment::process_payment(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
