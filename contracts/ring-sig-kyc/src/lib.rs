#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Symbol, Vec,
};
use soroban_sdk::crypto::bls12_381::{Fr, G1Affine};

const G1_GENERATOR: [u8; 96] = [
    0x17, 0xf1, 0xd3, 0xa7, 0x31, 0x97, 0xd7, 0x94, 0x26, 0x95, 0x63, 0x8c, 0x4f, 0xa9, 0xac, 0x0f,
    0xc3, 0x68, 0x8c, 0x4f, 0x97, 0x74, 0xb9, 0x05, 0xa1, 0x4e, 0x3a, 0x3f, 0x17, 0x1b, 0xac, 0x58,
    0x6c, 0x55, 0xe8, 0x3f, 0xf9, 0x7a, 0x1a, 0xef, 0xfb, 0x3a, 0xf0, 0x0a, 0xdb, 0x22, 0xc6, 0xbb,
    0x11, 0x4d, 0x1d, 0x68, 0x55, 0xd5, 0x45, 0xa8, 0xaa, 0x7d, 0x76, 0xc8, 0xcf, 0x2e, 0x21, 0xf2,
    0x67, 0x81, 0x6a, 0xef, 0x1d, 0xb5, 0x07, 0xc9, 0x66, 0x55, 0xb9, 0xd5, 0xca, 0xac, 0x42, 0x36,
    0x4e, 0x6f, 0x38, 0xba, 0x0e, 0xcb, 0x75, 0x1b, 0xad, 0x54, 0xdc, 0xd6, 0xb9, 0x39, 0xc2, 0xca,
];

#[derive(Clone)]
#[contracttype]
pub struct RingSignature {
    pub challenge: BytesN<32>,
    pub responses: Vec<BytesN<32>>,
}

#[contracttype]
pub struct KeyRingResult {
    pub secret_keys: Vec<BytesN<32>>,
    pub ring: Vec<BytesN<96>>,
}

#[contracttype]
pub enum DataKey {
    Ring,
    LoginCount,
    RingByAttribute(Symbol),
    Issuers,
    Admin,
}

#[contract]
pub struct RingSigContract;

#[contractimpl]
impl RingSigContract {

    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        let issuers: Vec<BytesN<96>> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::Issuers, &issuers);
    }

    /// Get the admin address
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    /// Register a new issuer (admin only)
    pub fn register_issuer(env: Env, issuer_pub: BytesN<96>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();

        let mut issuers: Vec<BytesN<96>> = env.storage().persistent()
            .get(&DataKey::Issuers)
            .unwrap_or(Vec::new(&env));

        // Check if issuer already exists
        for i in 0..issuers.len() {
            if issuers.get_unchecked(i) == issuer_pub {
                return; // Already registered
            }
        }

        issuers.push_back(issuer_pub);
        env.storage().persistent().set(&DataKey::Issuers, &issuers);
    }

    /// Get all registered issuers
    pub fn get_issuers(env: Env) -> Vec<BytesN<96>> {
        env.storage().persistent()
            .get(&DataKey::Issuers)
            .unwrap_or(Vec::new(&env))
    }

    /// Create or update a ring for a specific attribute
    pub fn create_ring_for_attribute(
        env: Env,
        issuer: Address,
        attribute: Symbol,
        users: Vec<BytesN<96>>
    ) {
        issuer.require_auth();

        // Verify issuer is registered (optional - could be enforced)
        // For now, any authenticated address can create rings

        env.storage().persistent().set(&DataKey::RingByAttribute(attribute), &users);
    }

    /// Get the ring for a specific attribute
    pub fn get_ring_for_attribute(env: Env, attribute: Symbol) -> Option<Vec<BytesN<96>>> {
        env.storage().persistent().get(&DataKey::RingByAttribute(attribute))
    }

    /// Legacy init function for backwards compatibility
    pub fn init(env: Env, ring: Vec<BytesN<96>>) {
        // Note this can be overwritten, call once only in production
        env.storage().persistent().set(&DataKey::Ring, &ring);
        env.storage().persistent().set(&DataKey::LoginCount, &0u64);
    }

    pub fn get_ring(env: Env) -> Option<Vec<BytesN<96>>> {
        env.storage().persistent().get(&DataKey::Ring)
    }

    pub fn get_login_count(env: Env) -> u64 {
        env.storage().persistent().get(&DataKey::LoginCount).unwrap_or(0u64)
    }

    /// Create a set of keypairs for a ring
    pub fn create_keys(env: Env, ring_size: u32) -> KeyRingResult {
        let bls = env.crypto().bls12_381();
        let gen_g = G1Affine::from_bytes(BytesN::from_array(&env, &G1_GENERATOR));
        let mut ring: Vec<BytesN<96>> = Vec::new(&env);
        let mut secret_keys: Vec<BytesN<32>> = Vec::new(&env);

        for i in 0..ring_size {
            let random_bytes = env.crypto().sha256(&env.crypto().sha256(&Bytes::from_slice(&env, &[i as u8; 32])).into());
            let sk = Fr::from_bytes(random_bytes.into());
            let pk = bls.g1_mul(&gen_g, &sk).to_bytes();
            secret_keys.push_back(sk.to_bytes());
            ring.push_back(pk);
        }

        KeyRingResult {
            secret_keys,
            ring,
        }
    }

    /// Sign a message using a ring signature
    pub fn sign(
        env: Env,
        msg: Bytes,
        ring: Vec<BytesN<96>>,
        secret_idx: u32,
        sk: BytesN<32>,
    ) -> RingSignature {
        let bls = env.crypto().bls12_381();
        let gen_g = G1Affine::from_bytes(BytesN::from_array(&env, &G1_GENERATOR));
        let secret_key = Fr::from_bytes(sk);
        let mut updated_ring = ring.clone();
        let pk = bls.g1_mul(&gen_g, &secret_key).to_bytes();
        updated_ring.set(secret_idx, pk);
        let n = updated_ring.len() as usize;
        let secret_idx_usize = secret_idx as usize;
        let random_a = env.crypto().sha256(&Bytes::from_slice(&env, &[42u8; 32]));
        let a = Fr::from_bytes(random_a.into());
        let mut responses: Vec<BytesN<32>> = Vec::new(&env);
        for i in 0..n {
            let random_r = env.crypto().sha256(&Bytes::from_slice(&env, &[i as u8 + 100; 32]));
            responses.push_back(random_r.into());
        }
        let mut base = Bytes::new(&env);
        for pk in updated_ring.iter() {
            base.append(&pk.into());
        }
        base.append(&msg);
        let xs = bls.g1_mul(&gen_g, &a);
        let mut pre = base.clone();
        pre.append(&xs.to_bytes().into());
        let mut c: Vec<Fr> = Vec::new(&env);
        for _ in 0..n {
            c.push_back(Fr::from_bytes(BytesN::from_array(&env, &[0u8; 32])));
        }
        let mut idx = (secret_idx_usize + 1) % n;
        c.set(idx as u32, Fr::from_bytes(env.crypto().sha256(&pre).into()));
        while idx != secret_idx_usize {
            let r_i = Fr::from_bytes(responses.get_unchecked(idx as u32));
            let p_i = G1Affine::from_bytes(updated_ring.get_unchecked(idx as u32));
            let x1 = bls.g1_mul(&gen_g, &r_i);
            let x2 = bls.g1_mul(&p_i, &c.get_unchecked(idx as u32));
            let xi = bls.g1_add(&x1, &x2);
            let mut pre2 = base.clone();
            pre2.append(&xi.to_bytes().into());
            let ci1 = Fr::from_bytes(env.crypto().sha256(&pre2).into());
            idx = (idx + 1) % n;
            c.set(idx as u32, ci1);
        }
        let rs = a - c.get_unchecked(secret_idx) * secret_key;
        responses.set(secret_idx, rs.to_bytes());
        RingSignature {
            challenge: c.get_unchecked(0).to_bytes(),
            responses,
        }
    }

    /// Verify a ring signature against a specific attribute ring
    pub fn verify_attribute(
        env: Env,
        msg: Bytes,
        sig: RingSignature,
        attribute: Symbol
    ) -> bool {
        let ring: Vec<BytesN<96>> = match env.storage().persistent().get(&DataKey::RingByAttribute(attribute)) {
            Some(r) => r,
            None => return false,
        };

        Self::verify_ring(env, msg, sig, ring)
    }

    /// Verify a ring signature against the default ring
    pub fn verify(env: Env, msg: Bytes, sig: RingSignature) -> bool {
        let ring: Vec<BytesN<96>> = match env.storage().persistent().get(&DataKey::Ring) {
            Some(r) => r,
            None => return false,
        };

        Self::verify_ring(env, msg, sig, ring)
    }

    /// Internal function to verify a ring signature
    fn verify_ring(env: Env, msg: Bytes, sig: RingSignature, ring: Vec<BytesN<96>>) -> bool {
        if ring.is_empty() || ring.len() != sig.responses.len() {
            return false;
        }
        let bls = env.crypto().bls12_381();
        let gen_g = G1Affine::from_bytes(BytesN::from_array(&env, &G1_GENERATOR));
        let mut base = Bytes::new(&env);
        for pk in ring.iter() {
            base.append(&pk.into());
        }
        base.append(&msg);
        let mut c = Fr::from_bytes(sig.challenge.clone());
        let n = ring.len();
        for j in 0..n {
            let r_j = Fr::from_bytes(sig.responses.get_unchecked(j));
            let p_j = G1Affine::from_bytes(ring.get_unchecked(j));
            let x1 = bls.g1_mul(&gen_g, &r_j);
            let x2 = bls.g1_mul(&p_j, &c);
            let xj = bls.g1_add(&x1, &x2);
            let mut pre = base.clone();
            pre.append(&xj.to_bytes().into());
            c = Fr::from_bytes(env.crypto().sha256(&pre).into());
        }
        let ok = c == Fr::from_bytes(sig.challenge);
        if ok {
            env.storage()
                .persistent()
                .update(&DataKey::LoginCount, |opt: Option<u64>| -> u64 {
                    opt.map(|v| v.saturating_add(1)).unwrap_or(1)
                });
        }
        ok
    }
}

mod test;
