//! bun-argon2 - High-performance Argon2 password hashing for Bun and Node.js
//!
//! This library provides async and sync functions for hashing and verifying
//! passwords using the Argon2 algorithm (argon2id, argon2i, argon2d).

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Algorithm, Argon2, Params, Version,
};
use napi::bindgen_prelude::*;
use napi_derive::napi;

/// Argon2 hashing options
#[napi(object)]
#[derive(Default, Clone)]
pub struct Argon2Options {
    /// Algorithm type: "argon2d", "argon2i", or "argon2id" (default: "argon2id")
    pub algorithm: Option<String>,

    /// Memory cost in KB (default: 65536 = 64MB)
    pub memory_cost: Option<u32>,

    /// Time cost / iterations (default: 3)
    pub time_cost: Option<u32>,

    /// Parallelism / threads (default: 4)
    pub parallelism: Option<u32>,

    /// Hash output length in bytes (default: 32)
    pub hash_length: Option<u32>,

    /// Custom salt as Buffer (optional, auto-generated if not provided)
    pub salt: Option<Buffer>,
}

/// Raw hash result containing hash and salt as Buffers
#[napi(object)]
pub struct RawHashResult {
    /// Raw hash bytes
    pub hash: Buffer,

    /// Salt used for hashing
    pub salt: Buffer,
}

/// Parse algorithm string to Argon2 Algorithm enum
fn parse_algorithm(algo: &Option<String>) -> Algorithm {
    match algo.as_deref() {
        Some("argon2d") => Algorithm::Argon2d,
        Some("argon2i") => Algorithm::Argon2i,
        Some("argon2id") | None => Algorithm::Argon2id,
        Some(_) => Algorithm::Argon2id, // Default to argon2id for unknown
    }
}

/// Build Argon2 params from options
fn build_params(options: &Argon2Options) -> Result<Params> {
    let m_cost = options.memory_cost.unwrap_or(65536); // 64MB
    let t_cost = options.time_cost.unwrap_or(3);
    let p_cost = options.parallelism.unwrap_or(4);
    let output_len = options.hash_length.map(|l| l as usize);

    Params::new(m_cost, t_cost, p_cost, output_len)
        .map_err(|e| Error::from_reason(format!("Invalid Argon2 parameters: {}", e)))
}

/// Create Argon2 hasher with given options
fn create_hasher(options: &Argon2Options) -> Result<Argon2<'static>> {
    let algorithm = parse_algorithm(&options.algorithm);
    let params = build_params(options)?;

    Ok(Argon2::new(algorithm, Version::V0x13, params))
}

/// Hash a password asynchronously (recommended)
///
/// Returns a PHC-formatted hash string like:
/// $argon2id$v=19$m=65536,t=3,p=4$...
#[napi]
pub async fn hash(password: String, options: Option<Argon2Options>) -> Result<String> {
    let opts = options.unwrap_or_default();

    // Run in blocking thread pool for CPU-intensive work
    tokio::task::spawn_blocking(move || hash_internal(&password, &opts))
        .await
        .map_err(|e| Error::from_reason(format!("Task join error: {}", e)))?
}

/// Hash a password synchronously (blocking)
///
/// Use this only when async is not available.
/// Returns a PHC-formatted hash string.
#[napi]
pub fn hash_sync(password: String, options: Option<Argon2Options>) -> Result<String> {
    let opts = options.unwrap_or_default();
    hash_internal(&password, &opts)
}

/// Internal hash implementation
fn hash_internal(password: &str, options: &Argon2Options) -> Result<String> {
    let argon2 = create_hasher(options)?;

    // Generate or use provided salt
    let salt = match &options.salt {
        Some(buf) => {
            // Use provided salt - encode as base64 for SaltString
            let salt_bytes = buf.as_ref();
            SaltString::encode_b64(salt_bytes)
                .map_err(|e| Error::from_reason(format!("Invalid salt: {}", e)))?
        }
        None => SaltString::generate(&mut OsRng),
    };

    // Hash the password
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| Error::from_reason(format!("Hashing failed: {}", e)))?;

    Ok(hash.to_string())
}

/// Verify a password against a hash asynchronously (recommended)
///
/// Returns true if the password matches the hash.
#[napi]
pub async fn verify(encoded: String, password: String) -> Result<bool> {
    // Run in blocking thread pool for CPU-intensive work
    tokio::task::spawn_blocking(move || verify_internal(&encoded, &password))
        .await
        .map_err(|e| Error::from_reason(format!("Task join error: {}", e)))?
}

/// Verify a password against a hash synchronously (blocking)
///
/// Use this only when async is not available.
#[napi]
pub fn verify_sync(encoded: String, password: String) -> Result<bool> {
    verify_internal(&encoded, &password)
}

/// Internal verify implementation
fn verify_internal(encoded: &str, password: &str) -> Result<bool> {
    // Parse the PHC-formatted hash
    let parsed_hash = PasswordHash::new(encoded)
        .map_err(|e| Error::from_reason(format!("Invalid hash format: {}", e)))?;

    // Determine algorithm from hash
    let algorithm = match parsed_hash.algorithm.as_str() {
        "argon2d" => Algorithm::Argon2d,
        "argon2i" => Algorithm::Argon2i,
        "argon2id" => Algorithm::Argon2id,
        other => return Err(Error::from_reason(format!("Unknown algorithm: {}", other))),
    };

    // Create Argon2 instance with same algorithm
    let argon2 = Argon2::new(algorithm, Version::V0x13, Params::default());

    // Verify
    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(Error::from_reason(format!("Verification failed: {}", e))),
    }
}

/// Get raw hash and salt as Buffers (for custom storage)
///
/// Unlike `hash()` which returns a PHC string, this returns the raw bytes.
#[napi]
pub async fn hash_raw(password: String, options: Option<Argon2Options>) -> Result<RawHashResult> {
    let opts = options.unwrap_or_default();

    tokio::task::spawn_blocking(move || hash_raw_internal(&password, &opts))
        .await
        .map_err(|e| Error::from_reason(format!("Task join error: {}", e)))?
}

/// Get raw hash and salt synchronously
#[napi]
pub fn hash_raw_sync(password: String, options: Option<Argon2Options>) -> Result<RawHashResult> {
    let opts = options.unwrap_or_default();
    hash_raw_internal(&password, &opts)
}

/// Internal raw hash implementation
fn hash_raw_internal(password: &str, options: &Argon2Options) -> Result<RawHashResult> {
    let argon2 = create_hasher(options)?;
    let hash_length = options.hash_length.unwrap_or(32) as usize;

    // Generate or use provided salt
    let salt: Vec<u8> = match &options.salt {
        Some(buf) => buf.as_ref().to_vec(),
        None => {
            let salt_string = SaltString::generate(&mut OsRng);
            // Get the raw bytes from the salt string
            salt_string.as_str().as_bytes().to_vec()
        }
    };

    // Hash to raw bytes
    let mut output = vec![0u8; hash_length];
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut output)
        .map_err(|e| Error::from_reason(format!("Hashing failed: {}", e)))?;

    Ok(RawHashResult {
        hash: Buffer::from(output),
        salt: Buffer::from(salt),
    })
}

/// Check if a hash needs to be rehashed (e.g., after changing parameters)
///
/// Returns true if the hash uses different parameters than specified.
#[napi]
pub fn needs_rehash(encoded: String, options: Option<Argon2Options>) -> Result<bool> {
    let opts = options.unwrap_or_default();

    // Parse the existing hash
    let parsed_hash = PasswordHash::new(&encoded)
        .map_err(|e| Error::from_reason(format!("Invalid hash format: {}", e)))?;

    // Get expected parameters
    let expected_algorithm = parse_algorithm(&opts.algorithm);
    let expected_m_cost = opts.memory_cost.unwrap_or(65536);
    let expected_t_cost = opts.time_cost.unwrap_or(3);
    let expected_p_cost = opts.parallelism.unwrap_or(4);

    // Check algorithm
    let current_algorithm = match parsed_hash.algorithm.as_str() {
        "argon2d" => Algorithm::Argon2d,
        "argon2i" => Algorithm::Argon2i,
        "argon2id" => Algorithm::Argon2id,
        _ => return Ok(true), // Unknown algorithm needs rehash
    };

    if current_algorithm != expected_algorithm {
        return Ok(true);
    }

    // Check parameters from hash string
    // Parse the params section: $argon2id$v=19$m=65536,t=3,p=4$...
    let hash_str = encoded.as_str();

    // Extract m, t, p values from the hash string
    if let Some(params_start) = hash_str.find("$m=") {
        let params_section = &hash_str[params_start + 1..];
        if let Some(params_end) = params_section.find('$') {
            let params = &params_section[..params_end];

            for part in params.split(',') {
                if let Some((key, value)) = part.split_once('=') {
                    if let Ok(val) = value.parse::<u32>() {
                        match key {
                            "m" if val != expected_m_cost => return Ok(true),
                            "t" if val != expected_t_cost => return Ok(true),
                            "p" if val != expected_p_cost => return Ok(true),
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    Ok(false)
}

/// Get version information
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
