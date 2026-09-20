use soroban_sdk::{contracttype, Address, BytesN, Env, Vec};

use crate::types::PaymentIntent;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Intent(BytesN<32>),
    StudentIndex(Address),
    InstitutionIndex(Address),
}

// Ledgers close roughly every 5s on Testnet; these are conservative
// approximations, not a precision timing guarantee. An intent is extended
// on every read/write so an active deposit's storage does not expire out
// from under an in-progress enrollment window.
const LEDGER_THRESHOLD: u32 = 17_280 * 30; // ~30 days
const LEDGER_BUMP: u32 = 17_280 * 60; // ~60 days

pub fn has_intent(env: &Env, id: &BytesN<32>) -> bool {
    env.storage().persistent().has(&DataKey::Intent(id.clone()))
}

pub fn read_intent(env: &Env, id: &BytesN<32>) -> Option<PaymentIntent> {
    let key = DataKey::Intent(id.clone());
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
    }
    value
}

pub fn write_intent(env: &Env, id: &BytesN<32>, intent: &PaymentIntent) {
    let key = DataKey::Intent(id.clone());
    env.storage().persistent().set(&key, intent);
    env.storage()
        .persistent()
        .extend_ttl(&key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

fn append_index(env: &Env, key: &DataKey, id: &BytesN<32>) {
    let mut list: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(key)
        .unwrap_or_else(|| Vec::new(env));
    list.push_back(id.clone());
    env.storage().persistent().set(key, &list);
    env.storage()
        .persistent()
        .extend_ttl(key, LEDGER_THRESHOLD, LEDGER_BUMP);
}

fn read_index(env: &Env, key: &DataKey) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(key)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn append_student_index(env: &Env, student: &Address, id: &BytesN<32>) {
    append_index(env, &DataKey::StudentIndex(student.clone()), id);
}

pub fn append_institution_index(env: &Env, institution: &Address, id: &BytesN<32>) {
    append_index(env, &DataKey::InstitutionIndex(institution.clone()), id);
}

pub fn read_student_index(env: &Env, student: &Address) -> Vec<BytesN<32>> {
    read_index(env, &DataKey::StudentIndex(student.clone()))
}

pub fn read_institution_index(env: &Env, institution: &Address) -> Vec<BytesN<32>> {
    read_index(env, &DataKey::InstitutionIndex(institution.clone()))
}
