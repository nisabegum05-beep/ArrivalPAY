use soroban_sdk::{contracttype, Address, BytesN};

/// MVP implements only ENROLLMENT_DEPOSIT. The field still exists so a
/// future intent kind can be added without changing the storage shape or
/// forcing a migration of existing intents — see the project roadmap.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IntentKind {
    EnrollmentDeposit = 0,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IntentStatus {
    Created = 0,
    Funded = 1,
    Released = 2,
    Refunded = 3,
}

/// `Pending` (not an `Option`) is the value before an intent resolves — the
/// Soroban contracttype macro does not support `Option<EnumWithData>` as a
/// struct field, and a sentinel variant is the idiomatic workaround.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Resolution {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Timeout = 3,
}

/// The contract never stores personal data or document contents — only a
/// caller-supplied opaque reference (e.g. a hash of an off-chain record).
#[contracttype]
#[derive(Clone, Debug)]
pub struct PaymentIntent {
    pub kind: IntentKind,
    pub student: Address,
    pub institution: Address,
    pub token: Address,
    pub amount: i128,
    pub deadline: u64,
    pub external_reference: Option<BytesN<32>>,
    pub status: IntentStatus,
    pub resolution: Resolution,
}
