# bun-argon2 - Project Plan

## Overview

A high-performance Argon2 password hashing library for Bun and Node.js, built with Rust and napi-rs.

**Why?** The popular `argon2` npm package has broken native bindings when installed with Bun. We'll build a Bun-first alternative that's faster, safer, and fully typed.

---

## Project Structure

```
bun-argon2/
├── src/                      # TypeScript source
│   ├── index.ts              # Main entry point & API
│   └── types.ts              # TypeScript types
├── rust/                     # Rust source
│   ├── src/
│   │   └── lib.rs            # Argon2 implementation
│   └── Cargo.toml            # Rust dependencies
├── npm/                      # Prebuilt binaries (auto-generated)
│   ├── darwin-arm64/         # macOS Apple Silicon
│   ├── darwin-x64/           # macOS Intel
│   ├── linux-x64-gnu/        # Linux x64
│   ├── linux-arm64-gnu/      # Linux ARM64
│   └── win32-x64-msvc/       # Windows x64
├── tests/
│   └── argon2.test.ts        # Unit tests
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── README.md
├── EXAMPLES.md
├── CHANGELOG.md
└── LICENSE
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Core | Rust |
| Argon2 | `argon2` crate (pure Rust) |
| Bindings | `napi-rs` |
| Types | TypeScript |
| Runtime | Bun & Node.js |
| Build | GitHub Actions (cross-compile) |

---

## API Design

### Basic Usage

```typescript
import { hash, verify } from 'bun-argon2';

// Hash a password
const hashed = await hash('myPassword123');
// $argon2id$v=19$m=65536,t=3,p=4$...

// Verify a password
const isValid = await verify(hashed, 'myPassword123');
// true
```

### Advanced Usage

```typescript
import { hash, verify, hashSync, verifySync, Argon2Options } from 'bun-argon2';

// Custom options
const options: Argon2Options = {
  type: 'argon2id',      // 'argon2d' | 'argon2i' | 'argon2id'
  memoryCost: 65536,     // Memory in KB (default: 64MB)
  timeCost: 3,           // Iterations (default: 3)
  parallelism: 4,        // Threads (default: 4)
  hashLength: 32,        // Output length in bytes
  saltLength: 16,        // Salt length in bytes
};

// Async (recommended)
const hashed = await hash('password', options);
const isValid = await verify(hashed, 'password');

// Sync (blocking)
const hashedSync = hashSync('password', options);
const isValidSync = verifySync(hashedSync, 'password');
```

### Raw Hash (for custom storage)

```typescript
import { hashRaw } from 'bun-argon2';

// Get raw hash + salt (not encoded)
const { hash, salt } = await hashRaw('password', options);
// hash: Buffer, salt: Buffer
```

---

## TypeScript Types

```typescript
/** Argon2 algorithm variant */
export type Argon2Type = 'argon2d' | 'argon2i' | 'argon2id';

/** Argon2 hashing options */
export interface Argon2Options {
  /** Algorithm type (default: 'argon2id') */
  type?: Argon2Type;

  /** Memory cost in KB (default: 65536 = 64MB) */
  memoryCost?: number;

  /** Time cost / iterations (default: 3) */
  timeCost?: number;

  /** Parallelism / threads (default: 4) */
  parallelism?: number;

  /** Hash output length in bytes (default: 32) */
  hashLength?: number;

  /** Salt length in bytes (default: 16) */
  saltLength?: number;

  /** Custom salt (optional, auto-generated if not provided) */
  salt?: Buffer;
}

/** Raw hash result */
export interface RawHashResult {
  /** Raw hash bytes */
  hash: Buffer;

  /** Salt used */
  salt: Buffer;
}

/** Hash a password (async) */
export function hash(password: string, options?: Argon2Options): Promise<string>;

/** Verify a password against a hash (async) */
export function verify(encoded: string, password: string): Promise<boolean>;

/** Hash a password (sync) */
export function hashSync(password: string, options?: Argon2Options): string;

/** Verify a password (sync) */
export function verifySync(encoded: string, password: string): boolean;

/** Get raw hash and salt */
export function hashRaw(password: string, options?: Argon2Options): Promise<RawHashResult>;
```

---

## Rust Implementation

```rust
// rust/src/lib.rs
use napi::bindgen_prelude::*;
use napi_derive::napi;
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2, Algorithm, Params, Version
};

#[napi(object)]
pub struct Argon2Options {
    pub algorithm: Option<String>,      // argon2d, argon2i, argon2id
    pub memory_cost: Option<u32>,        // KB
    pub time_cost: Option<u32>,          // iterations
    pub parallelism: Option<u32>,        // threads
    pub hash_length: Option<u32>,        // bytes
    pub salt_length: Option<u32>,        // bytes
    pub salt: Option<Buffer>,            // custom salt
}

#[napi]
pub async fn hash(password: String, options: Option<Argon2Options>) -> Result<String> {
    // Implementation
}

#[napi]
pub async fn verify(encoded: String, password: String) -> Result<bool> {
    // Implementation
}

#[napi]
pub fn hash_sync(password: String, options: Option<Argon2Options>) -> Result<String> {
    // Implementation
}

#[napi]
pub fn verify_sync(encoded: String, password: String) -> Result<bool> {
    // Implementation
}
```

---

## Build Matrix (GitHub Actions)

| Platform | Architecture | Target |
|----------|--------------|--------|
| macOS | ARM64 (M1/M2/M3) | aarch64-apple-darwin |
| macOS | x64 (Intel) | x86_64-apple-darwin |
| Linux | x64 | x86_64-unknown-linux-gnu |
| Linux | ARM64 | aarch64-unknown-linux-gnu |
| Windows | x64 | x86_64-pc-windows-msvc |

---

## Comparison with Existing Libraries

| Feature | bun-argon2 | argon2 (npm) | @node-rs/argon2 |
|---------|------------|--------------|-----------------|
| Bun Support | ✅ Native | ❌ Broken | ⚠️ Partial |
| Node.js Support | ✅ | ✅ | ✅ |
| Async API | ✅ | ✅ | ✅ |
| Sync API | ✅ | ✅ | ✅ |
| TypeScript | ✅ Full | ⚠️ Basic | ✅ |
| Argon2id | ✅ | ✅ | ✅ |
| Argon2i | ✅ | ✅ | ✅ |
| Argon2d | ✅ | ✅ | ✅ |
| Pure Rust | ✅ | ❌ C | ✅ |
| Prebuilt Binaries | ✅ | ✅ | ✅ |

---

## Development Steps

### Phase 1: Setup (Day 1)
- [x] Create project structure
- [ ] Initialize Rust workspace with napi-rs
- [ ] Configure TypeScript
- [ ] Setup build scripts

### Phase 2: Implementation (Day 1-2)
- [ ] Implement hash function in Rust
- [ ] Implement verify function in Rust
- [ ] Add sync variants
- [ ] Add raw hash function
- [ ] Create TypeScript bindings

### Phase 3: Testing (Day 2)
- [ ] Write unit tests
- [ ] Test with Bun
- [ ] Test with Node.js
- [ ] Benchmark vs argon2 npm

### Phase 4: Documentation (Day 2)
- [ ] Write README.md
- [ ] Write EXAMPLES.md
- [ ] Write CHANGELOG.md
- [ ] Add JSDoc comments

### Phase 5: Release (Day 2-3)
- [ ] Setup GitHub Actions for cross-compilation
- [ ] Build for all platforms
- [ ] Publish to npm
- [ ] Create GitHub release

---

## Package.json Structure

```json
{
  "name": "bun-argon2",
  "version": "1.0.0",
  "description": "High-performance Argon2 password hashing for Bun and Node.js",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "npm"
  ],
  "napi": {
    "name": "argon2",
    "triples": {
      "defaults": true,
      "additional": [
        "aarch64-apple-darwin",
        "aarch64-unknown-linux-gnu"
      ]
    }
  },
  "scripts": {
    "build": "napi build --platform --release",
    "build:ts": "bun build ./src/index.ts --outdir ./dist",
    "test": "bun test",
    "prepublishOnly": "napi prepublish -t npm"
  },
  "keywords": [
    "argon2",
    "password",
    "hash",
    "hashing",
    "bun",
    "nodejs",
    "rust",
    "napi"
  ],
  "author": "Aissam Irhir <aissamirhir@gmail.com>",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  },
  "peerDependencies": {},
  "devDependencies": {
    "@napi-rs/cli": "^2.18.0",
    "bun-types": "latest",
    "typescript": "^5.9.0"
  }
}
```

---

## Success Metrics

1. **Works with Bun** - `bun add bun-argon2` just works
2. **Works with Node.js** - `npm install bun-argon2` just works
3. **Fully typed** - Complete TypeScript definitions
4. **Fast** - Same or faster than argon2 npm package
5. **Secure** - Uses proven argon2 Rust crate
6. **Well documented** - README, examples, API docs

---

## Timeline

| Day | Tasks |
|-----|-------|
| Day 1 | Setup + Rust implementation |
| Day 2 | TypeScript bindings + Tests + Docs |
| Day 3 | GitHub Actions + Publish |

**Total: 2-3 days**

---

## Next Steps

1. Initialize Rust workspace with napi-rs
2. Implement core argon2 functions
3. Create TypeScript wrapper
4. Write tests
5. Document everything
6. Publish!
