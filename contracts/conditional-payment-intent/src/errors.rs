use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// An intent with this id already exists (`create_intent` ids are
    /// caller-supplied so this is reachable, not just defensive).
    AlreadyExists = 1,
    NotFound = 2,
    InvalidAmount = 3,
    InvalidDeadline = 4,
    /// The call is not valid for the intent's current status (e.g.
    /// approving one that is not `Funded`, or funding one already funded).
    WrongState = 5,
    /// `fund_intent` / `approve_intent` after the deadline has passed.
    DeadlinePassed = 6,
    /// `claim_timeout_refund` before the deadline has been reached.
    DeadlineNotReached = 7,
}
