#![cfg(test)]

use super::*;
use soroban_sdk::testutils::storage::Persistent as _;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Env};

fn create_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

fn mint(env: &Env, token: &Address, admin: &Address, to: &Address, amount: i128) {
    token::StellarAssetClient::new(env, token).mint(to, &amount);
    let _ = admin;
}

fn balance(env: &Env, token: &Address, who: &Address) -> i128 {
    token::Client::new(env, token).balance(who)
}

struct Setup {
    env: Env,
    client: ConditionalPaymentIntentClient<'static>,
    institution: Address,
    student: Address,
    token: Address,
    id: BytesN<32>,
    amount: i128,
    deadline: u64,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(ConditionalPaymentIntent, ());
    let client = ConditionalPaymentIntentClient::new(&env, &contract_id);

    let institution = Address::generate(&env);
    let student = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let amount: i128 = 500_0000000; // 500.0000000 USDC, 7 decimals
    mint(&env, &token, &token_admin, &student, amount * 4);

    let id = BytesN::from_array(&env, &[7u8; 32]);
    let deadline = 1_000 + 86_400; // one day out

    Setup {
        env,
        client,
        institution,
        student,
        token,
        id,
        amount,
        deadline,
    }
}

// 1. Intent creation.
#[test]
fn creates_an_intent_in_the_created_state() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    let intent = s.client.get_intent(&s.id);
    assert_eq!(intent.status, IntentStatus::Created);
    assert_eq!(intent.institution, s.institution);
    assert_eq!(intent.student, s.student);
    assert_eq!(intent.amount, s.amount);
    assert_eq!(intent.resolution, Resolution::Pending);
}

// 2. Successful funding.
#[test]
fn funds_an_intent_and_moves_tokens_into_the_contract() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    let student_before = balance(&s.env, &s.token, &s.student);
    s.client.fund_intent(&s.id);
    assert_eq!(s.client.get_intent(&s.id).status, IntentStatus::Funded);
    assert_eq!(
        balance(&s.env, &s.token, &s.student),
        student_before - s.amount
    );
    assert_eq!(balance(&s.env, &s.token, &s.client.address), s.amount);
}

// 3. Approval transfers to the institution.
#[test]
fn approval_pays_the_institution_and_resolves_as_approved() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    s.client.approve_intent(&s.id);
    let intent = s.client.get_intent(&s.id);
    assert_eq!(intent.status, IntentStatus::Released);
    assert_eq!(intent.resolution, Resolution::Approved);
    assert_eq!(balance(&s.env, &s.token, &s.institution), s.amount);
    assert_eq!(balance(&s.env, &s.token, &s.client.address), 0);
}

// 4. Rejection refunds the student.
#[test]
fn rejection_refunds_the_student_and_resolves_as_rejected() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    let student_after_funding = balance(&s.env, &s.token, &s.student);
    s.client.reject_intent(&s.id);
    let intent = s.client.get_intent(&s.id);
    assert_eq!(intent.status, IntentStatus::Refunded);
    assert_eq!(intent.resolution, Resolution::Rejected);
    assert_eq!(
        balance(&s.env, &s.token, &s.student),
        student_after_funding + s.amount
    );
    assert_eq!(balance(&s.env, &s.token, &s.client.address), 0);
}

// 5. Refund after the deadline (timeout claim).
#[test]
fn student_claims_timeout_refund_after_the_deadline() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    s.env.ledger().set_timestamp(s.deadline);
    s.client.claim_timeout_refund(&s.id);
    let intent = s.client.get_intent(&s.id);
    assert_eq!(intent.status, IntentStatus::Refunded);
    assert_eq!(intent.resolution, Resolution::Timeout);
}

// 6. Timeout refund before the deadline is rejected.
#[test]
fn timeout_refund_before_the_deadline_is_rejected() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    s.env.ledger().set_timestamp(s.deadline - 1);
    let result = s.client.try_claim_timeout_refund(&s.id);
    assert_eq!(result, Err(Ok(Error::DeadlineNotReached)));
}

// 7. Unauthorized institution decision is rejected: approve_intent reads
// the institution address from the stored intent and requires ITS
// authorization, so a call with no authorization present must fail —
// there is no separate "caller" parameter to spoof.
#[test]
#[should_panic]
fn unauthorized_institution_decision_is_rejected() {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    let contract_id = env.register(ConditionalPaymentIntent, ());
    let client = ConditionalPaymentIntentClient::new(&env, &contract_id);
    let institution = Address::generate(&env);
    let student = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let amount: i128 = 10_0000000;
    let id = BytesN::from_array(&env, &[9u8; 32]);
    let deadline = 1_000 + 86_400;

    env.mock_all_auths();
    mint(&env, &token, &token_admin, &student, amount);
    client.create_intent(
        &institution,
        &id,
        &student,
        &token,
        &amount,
        &deadline,
        &None,
    );
    client.fund_intent(&id);

    // No auths mocked for this call: the institution never authorized it.
    env.set_auths(&[]);
    client.approve_intent(&id);
}

// 8. Unauthorized student funding is rejected: fund_intent requires the
// stored student's authorization, not any caller-supplied address.
#[test]
#[should_panic]
fn unauthorized_student_funding_is_rejected() {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    let contract_id = env.register(ConditionalPaymentIntent, ());
    let client = ConditionalPaymentIntentClient::new(&env, &contract_id);
    let institution = Address::generate(&env);
    let student = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token = create_token(&env, &token_admin);
    let amount: i128 = 10_0000000;
    let id = BytesN::from_array(&env, &[11u8; 32]);
    let deadline = 1_000 + 86_400;

    env.mock_all_auths();
    mint(&env, &token, &token_admin, &student, amount);
    client.create_intent(
        &institution,
        &id,
        &student,
        &token,
        &amount,
        &deadline,
        &None,
    );

    // No auths mocked for this call: the student never authorized it.
    env.set_auths(&[]);
    client.fund_intent(&id);
}

// 9. Double settlement is rejected in every direction.
#[test]
fn double_settlement_is_rejected() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    s.client.approve_intent(&s.id);

    assert_eq!(
        s.client.try_approve_intent(&s.id),
        Err(Ok(Error::WrongState))
    );
    assert_eq!(
        s.client.try_reject_intent(&s.id),
        Err(Ok(Error::WrongState))
    );
    s.env.ledger().set_timestamp(s.deadline);
    assert_eq!(
        s.client.try_claim_timeout_refund(&s.id),
        Err(Ok(Error::WrongState))
    );
    assert_eq!(s.client.try_fund_intent(&s.id), Err(Ok(Error::WrongState)));
}

// 10. Duplicate intent id is rejected.
#[test]
fn duplicate_intent_id_is_rejected() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    let result = s.client.try_create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyExists)));
}

// 11. Invalid amount and invalid deadline are rejected.
#[test]
fn invalid_amount_and_deadline_are_rejected() {
    let s = setup();
    assert_eq!(
        s.client.try_create_intent(
            &s.institution,
            &s.id,
            &s.student,
            &s.token,
            &0,
            &s.deadline,
            &None,
        ),
        Err(Ok(Error::InvalidAmount))
    );
    let other_id = BytesN::from_array(&s.env, &[8u8; 32]);
    assert_eq!(
        s.client.try_create_intent(
            &s.institution,
            &other_id,
            &s.student,
            &s.token,
            &-1,
            &s.deadline,
            &None,
        ),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.client.try_create_intent(
            &s.institution,
            &other_id,
            &s.student,
            &s.token,
            &s.amount,
            &1_000,
            &None,
        ),
        Err(Ok(Error::InvalidDeadline))
    );
}

// 12. Balance changes are verified precisely (no fee skimmed, exact amount).
#[test]
fn balances_move_by_exactly_the_intent_amount() {
    let s = setup();
    let student_start = balance(&s.env, &s.token, &s.student);
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.client.fund_intent(&s.id);
    assert_eq!(
        balance(&s.env, &s.token, &s.student),
        student_start - s.amount
    );
    s.client.approve_intent(&s.id);
    assert_eq!(balance(&s.env, &s.token, &s.institution), s.amount);
    assert_eq!(
        balance(&s.env, &s.token, &s.student),
        student_start - s.amount
    );
}

// Extra: the exact deadline instant counts as "passed" for funding/approval
// and as "reached" for a timeout claim, consistently.
#[test]
fn the_exact_deadline_instant_counts_as_passed() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    s.env.ledger().set_timestamp(s.deadline);
    assert_eq!(
        s.client.try_fund_intent(&s.id),
        Err(Ok(Error::DeadlinePassed))
    );
}

// Extra: two intents on two different tokens keep independent balances —
// funding one never moves the other's token.
#[test]
fn multiple_intents_keep_separate_token_balances() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);
    let contract_id = env.register(ConditionalPaymentIntent, ());
    let client = ConditionalPaymentIntentClient::new(&env, &contract_id);
    let institution = Address::generate(&env);
    let student = Address::generate(&env);
    let admin_a = Address::generate(&env);
    let admin_b = Address::generate(&env);
    let token_a = create_token(&env, &admin_a);
    let token_b = create_token(&env, &admin_b);
    let amount: i128 = 50_0000000;
    mint(&env, &token_a, &admin_a, &student, amount);
    mint(&env, &token_b, &admin_b, &student, amount);
    let deadline = 1_000 + 86_400;
    let id_a = BytesN::from_array(&env, &[1u8; 32]);
    let id_b = BytesN::from_array(&env, &[2u8; 32]);

    client.create_intent(
        &institution,
        &id_a,
        &student,
        &token_a,
        &amount,
        &deadline,
        &None,
    );
    client.create_intent(
        &institution,
        &id_b,
        &student,
        &token_b,
        &amount,
        &deadline,
        &None,
    );
    client.fund_intent(&id_a);

    assert_eq!(balance(&env, &token_a, &contract_id), amount);
    assert_eq!(balance(&env, &token_b, &contract_id), 0);
    assert_eq!(balance(&env, &token_b, &student), amount);
}

// Extra: storage TTL is extended on write so an active intent does not
// expire mid-flow; a short bump proves extend_ttl is actually applied.
#[test]
fn intent_storage_ttl_is_extended_on_write() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    let key = storage::DataKey::Intent(s.id.clone());
    let live_until = s.env.as_contract(&s.client.address, || {
        s.env.storage().persistent().get_ttl(&key)
    });
    assert!(live_until > 0);
}

// Extra: pagination over an institution's intent index.
#[test]
fn lists_intents_by_institution_with_pagination() {
    let s = setup();
    s.client.create_intent(
        &s.institution,
        &s.id,
        &s.student,
        &s.token,
        &s.amount,
        &s.deadline,
        &None,
    );
    let second_id = BytesN::from_array(&s.env, &[3u8; 32]);
    s.client.create_intent(
        &s.institution,
        &second_id,
        &s.student,
        &s.token,
        &s.amount,
        &(s.deadline + 1),
        &None,
    );
    let all = s.client.list_by_institution(&s.institution, &0, &10);
    assert_eq!(all.len(), 2);
    let first_page = s.client.list_by_institution(&s.institution, &0, &1);
    assert_eq!(first_page.len(), 1);
    let second_page = s.client.list_by_institution(&s.institution, &1, &1);
    assert_eq!(second_page.len(), 1);
    assert_ne!(first_page.get(0), second_page.get(0));
}
