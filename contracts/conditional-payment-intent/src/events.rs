use soroban_sdk::{contractevent, Address, BytesN};

use crate::types::Resolution;

#[contractevent]
pub struct IntentCreated {
    #[topic]
    pub id: BytesN<32>,
    pub institution: Address,
    pub student: Address,
}

#[contractevent]
pub struct IntentFunded {
    #[topic]
    pub id: BytesN<32>,
    pub student: Address,
    pub amount: i128,
}

#[contractevent]
pub struct IntentReleased {
    #[topic]
    pub id: BytesN<32>,
    pub institution: Address,
    pub amount: i128,
}

#[contractevent]
pub struct IntentRefunded {
    #[topic]
    pub id: BytesN<32>,
    pub student: Address,
    pub amount: i128,
    pub resolution: Resolution,
}
