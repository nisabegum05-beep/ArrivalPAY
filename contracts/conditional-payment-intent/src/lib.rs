#![no_std]

//! Conditional Payment Intent — the contract behind ArrivalPay's enrollment
//! deposit flow. It does not, and cannot, verify that an institution's
//! admit/reject decision was correct: that judgment stays off-chain. What
//! it guarantees is that once an authorized decision is made, the USDC an
//! intent holds moves exactly according to the rule that decision implies,
//! with no double settlement and no way to bypass the deadline it agreed to.
//!
//! State machine: `Created -> Funded -> Released` (institution approval) or
//! `Funded -> Refunded` (institution rejection, or student timeout claim
//! after the deadline). A resolved intent cannot be resolved again.

mod errors;
mod events;
mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env, Vec};

pub use errors::Error;
pub use types::{IntentKind, IntentStatus, PaymentIntent, Resolution};

#[contract]
pub struct ConditionalPaymentIntent;

#[contractimpl]
impl ConditionalPaymentIntent {
    /// Institution-authored intent. The institution's own signature is
    /// required — a student or a third party cannot create a deposit
    /// request on an institution's behalf.
    pub fn create_intent(
        env: Env,
        institution: Address,
        id: BytesN<32>,
        student: Address,
        token: Address,
        amount: i128,
        deadline: u64,
        external_reference: Option<BytesN<32>>,
    ) -> Result<(), Error> {
        institution.require_auth();

        if storage::has_intent(&env, &id) {
            return Err(Error::AlreadyExists);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if deadline <= env.ledger().timestamp() {
            return Err(Error::InvalidDeadline);
        }

        let intent = PaymentIntent {
            kind: IntentKind::EnrollmentDeposit,
            student: student.clone(),
            institution: institution.clone(),
            token,
            amount,
            deadline,
            external_reference,
            status: IntentStatus::Created,
            resolution: Resolution::Pending,
        };
        storage::write_intent(&env, &id, &intent);
        storage::append_student_index(&env, &student, &id);
        storage::append_institution_index(&env, &institution, &id);
        events::IntentCreated {
            id,
            institution,
            student,
        }
        .publish(&env);
        Ok(())
    }

    /// Moves `amount` of `token` from the intent's own student to the
    /// contract. The student address is read from the stored intent, not
    /// taken as a parameter, so there is no student-supplied value to spoof
    /// — only the wallet the institution named at creation can fund it.
    pub fn fund_intent(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut intent = storage::read_intent(&env, &id).ok_or(Error::NotFound)?;
        intent.student.require_auth();

        if intent.status != IntentStatus::Created {
            return Err(Error::WrongState);
        }
        if env.ledger().timestamp() >= intent.deadline {
            return Err(Error::DeadlinePassed);
        }

        token::Client::new(&env, &intent.token).transfer(
            &intent.student,
            &env.current_contract_address(),
            &intent.amount,
        );

        intent.status = IntentStatus::Funded;
        storage::write_intent(&env, &id, &intent);
        events::IntentFunded {
            id,
            student: intent.student,
            amount: intent.amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Institution approval: pays the held USDC to the institution. Blocked
    /// once the deadline has passed so a late decision cannot race a
    /// student's `claim_timeout_refund` — after the deadline, only a refund
    /// path remains open on a still-funded intent.
    pub fn approve_intent(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut intent = storage::read_intent(&env, &id).ok_or(Error::NotFound)?;
        intent.institution.require_auth();

        if intent.status != IntentStatus::Funded {
            return Err(Error::WrongState);
        }
        if env.ledger().timestamp() >= intent.deadline {
            return Err(Error::DeadlinePassed);
        }

        token::Client::new(&env, &intent.token).transfer(
            &env.current_contract_address(),
            &intent.institution,
            &intent.amount,
        );

        intent.status = IntentStatus::Released;
        intent.resolution = Resolution::Approved;
        storage::write_intent(&env, &id, &intent);
        events::IntentReleased {
            id,
            institution: intent.institution,
            amount: intent.amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Institution rejection: refunds the held USDC to the student. Not
    /// deadline-gated — an institution can still record a rejection and
    /// return funds after its own deadline, the same outcome a timeout
    /// claim would reach.
    pub fn reject_intent(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut intent = storage::read_intent(&env, &id).ok_or(Error::NotFound)?;
        intent.institution.require_auth();

        if intent.status != IntentStatus::Funded {
            return Err(Error::WrongState);
        }

        token::Client::new(&env, &intent.token).transfer(
            &env.current_contract_address(),
            &intent.student,
            &intent.amount,
        );

        intent.status = IntentStatus::Refunded;
        intent.resolution = Resolution::Rejected;
        storage::write_intent(&env, &id, &intent);
        events::IntentRefunded {
            id,
            student: intent.student,
            amount: intent.amount,
            resolution: Resolution::Rejected,
        }
        .publish(&env);
        Ok(())
    }

    /// Student self-service refund once the deadline has passed without an
    /// institution decision. Requires the deadline to have strictly
    /// arrived — `now == deadline` already counts as reached, matching
    /// `fund_intent`/`approve_intent` treating that same instant as passed.
    pub fn claim_timeout_refund(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let mut intent = storage::read_intent(&env, &id).ok_or(Error::NotFound)?;
        intent.student.require_auth();

        if intent.status != IntentStatus::Funded {
            return Err(Error::WrongState);
        }
        if env.ledger().timestamp() < intent.deadline {
            return Err(Error::DeadlineNotReached);
        }

        token::Client::new(&env, &intent.token).transfer(
            &env.current_contract_address(),
            &intent.student,
            &intent.amount,
        );

        intent.status = IntentStatus::Refunded;
        intent.resolution = Resolution::Timeout;
        storage::write_intent(&env, &id, &intent);
        events::IntentRefunded {
            id,
            student: intent.student,
            amount: intent.amount,
            resolution: Resolution::Timeout,
        }
        .publish(&env);
        Ok(())
    }

    /// Read-only. No auth required — intent terms are meant to be visible
    /// to whoever holds the id, matching the UI's intent detail page.
    pub fn get_intent(env: Env, id: BytesN<32>) -> Result<PaymentIntent, Error> {
        storage::read_intent(&env, &id).ok_or(Error::NotFound)
    }

    /// Paginated so a student or institution's intent list can be read from
    /// the contract itself rather than trusted from local storage on one
    /// device — the frontend never has to be the source of truth for what
    /// intents exist.
    pub fn list_by_student(env: Env, student: Address, offset: u32, limit: u32) -> Vec<BytesN<32>> {
        paginate(
            &env,
            &storage::read_student_index(&env, &student),
            offset,
            limit,
        )
    }

    pub fn list_by_institution(
        env: Env,
        institution: Address,
        offset: u32,
        limit: u32,
    ) -> Vec<BytesN<32>> {
        paginate(
            &env,
            &storage::read_institution_index(&env, &institution),
            offset,
            limit,
        )
    }
}

fn paginate(env: &Env, all: &Vec<BytesN<32>>, offset: u32, limit: u32) -> Vec<BytesN<32>> {
    let mut result = Vec::new(env);
    let len = all.len();
    let end = offset.saturating_add(limit).min(len);
    let mut i = offset;
    while i < end {
        if let Some(item) = all.get(i) {
            result.push_back(item);
        }
        i += 1;
    }
    result
}

mod test;
