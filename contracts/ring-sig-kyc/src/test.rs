#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialization() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RingSigContract);
    let client = RingSigContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    env.mock_all_auths();

    client.initialize(&admin);

    assert_eq!(client.get_admin(), Some(admin));
}

#[test]
fn test_register_issuer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RingSigContract);
    let client = RingSigContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    env.mock_all_auths();

    client.initialize(&admin);

    let issuer_pub = BytesN::from_array(&env, &[1u8; 96]);
    client.register_issuer(&issuer_pub);

    let issuers = client.get_issuers();
    assert_eq!(issuers.len(), 1);
    assert_eq!(issuers.get_unchecked(0), issuer_pub);
}

#[test]
fn test_attribute_ring() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RingSigContract);
    let client = RingSigContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    env.mock_all_auths();

    client.initialize(&admin);

    let attribute = symbol_short!("over_18");
    let mut users = Vec::new(&env);
    users.push_back(BytesN::from_array(&env, &[1u8; 96]));
    users.push_back(BytesN::from_array(&env, &[2u8; 96]));

    client.create_ring_for_attribute(&issuer, &attribute, &users);

    let retrieved_ring = client.get_ring_for_attribute(&attribute);
    assert_eq!(retrieved_ring, Some(users));
}
