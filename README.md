# bun-argon2

High-performance Argon2 password hashing for Bun and Node.js, built with Rust and napi-rs.

[![npm version](https://badge.fury.io/js/bun-argon2.svg)](https://www.npmjs.com/package/bun-argon2)
[![CI](https://github.com/nexus-aissam/bun-argon2/workflows/CI/badge.svg)](https://github.com/nexus-aissam/bun-argon2/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why bun-argon2?

The popular `argon2` npm package has broken native bindings when installed with Bun. This library provides a Bun-first alternative that's:

- **Fast** - Pure Rust implementation with optimized native bindings
- **Safe** - Uses the battle-tested `argon2` Rust crate
- **Typed** - Full TypeScript support with strict types
- **Compatible** - Works with both Bun and Node.js

## Installation

```bash
# Using Bun (recommended)
bun add bun-argon2

# Using npm
npm install bun-argon2

# Using yarn
yarn add bun-argon2

# Using pnpm
pnpm add bun-argon2
```

## Quick Start

```typescript
import { hash, verify } from 'bun-argon2';

// Hash a password
const hashed = await hash('myPassword123');
// $argon2id$v=19$m=65536,t=3,p=4$...

// Verify a password
const isValid = await verify(hashed, 'myPassword123');
// true
```

## API Reference

### `hash(password, options?)`

Hash a password asynchronously (recommended).

```typescript
import { hash } from 'bun-argon2';

// Basic usage
const hashed = await hash('password');

// With custom options
const hashed = await hash('password', {
  type: 'argon2id',      // 'argon2d' | 'argon2i' | 'argon2id'
  memoryCost: 65536,     // Memory in KB (default: 64MB)
  timeCost: 3,           // Iterations (default: 3)
  parallelism: 4,        // Threads (default: 4)
  hashLength: 32,        // Output length in bytes
  salt: customSalt,      // Custom salt (optional)
});
```

### `verify(hash, password)`

Verify a password against a hash asynchronously.

```typescript
import { verify } from 'bun-argon2';

const isValid = await verify(hash, 'password');
```

### `hashSync(password, options?)`

Hash a password synchronously (blocking).

```typescript
import { hashSync } from 'bun-argon2';

const hashed = hashSync('password');
```

### `verifySync(hash, password)`

Verify a password synchronously (blocking).

```typescript
import { verifySync } from 'bun-argon2';

const isValid = verifySync(hash, 'password');
```

### `hashRaw(password, options?)`

Get raw hash and salt as Buffers (for custom storage).

```typescript
import { hashRaw } from 'bun-argon2';

const { hash, salt } = await hashRaw('password');
console.log(hash.toString('hex'));
console.log(salt.toString('hex'));
```

### `needsRehash(hash, options?)`

Check if a hash needs to be rehashed (e.g., after changing parameters).

```typescript
import { needsRehash } from 'bun-argon2';

const oldHash = '$argon2id$v=19$m=4096,t=1,p=1$...';

if (needsRehash(oldHash, { memoryCost: 65536, timeCost: 3 })) {
  // Re-hash with new parameters on next login
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'argon2d' \| 'argon2i' \| 'argon2id'` | `'argon2id'` | Algorithm variant |
| `memoryCost` | `number` | `65536` | Memory usage in KB (64MB default) |
| `timeCost` | `number` | `3` | Number of iterations |
| `parallelism` | `number` | `4` | Number of threads |
| `hashLength` | `number` | `32` | Output hash length in bytes |
| `salt` | `Buffer` | auto-generated | Custom salt (16+ bytes recommended) |

## Algorithm Variants

- **argon2id** (recommended) - Hybrid of argon2i and argon2d, best for password hashing
- **argon2i** - Data-independent, resistant to side-channel attacks
- **argon2d** - Data-dependent, faster but vulnerable to side-channel attacks

## Security Recommendations

For password hashing, OWASP recommends:

```typescript
// Minimum recommended settings
const options = {
  type: 'argon2id',
  memoryCost: 19456,  // 19MB
  timeCost: 2,
  parallelism: 1,
};

// Stronger settings (if resources allow)
const strongerOptions = {
  type: 'argon2id',
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 4,
};
```

## Comparison

| Feature | bun-argon2 | argon2 (npm) | @node-rs/argon2 |
|---------|------------|--------------|-----------------|
| Bun Support | Native | Broken | Partial |
| Node.js Support | Yes | Yes | Yes |
| Async API | Yes | Yes | Yes |
| Sync API | Yes | Yes | Yes |
| TypeScript | Full | Basic | Full |
| Implementation | Pure Rust | C | Pure Rust |
| Prebuilt Binaries | Yes | Yes | Yes |

## Supported Platforms

| Platform | Architecture | Support |
|----------|--------------|---------|
| macOS | ARM64 (M1/M2/M3) | Yes |
| macOS | x64 (Intel) | Yes |
| Linux | x64 (glibc) | Yes |
| Linux | x64 (musl/Alpine) | Yes |
| Linux | ARM64 (glibc) | Yes |
| Linux | ARM64 (musl) | Yes |
| Windows | x64 | Yes |

## Development

```bash
# Clone the repository
git clone https://github.com/nexus-aissam/bun-argon2.git
cd bun-argon2

# Install dependencies
bun install

# Build native module (requires Rust)
bun run build

# Build TypeScript
bun run build:ts

# Run tests
bun test
```

### Requirements

- Bun 1.0+ or Node.js 18+
- Rust 1.70+ (for building from source)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Aissam Irhir ([@nexus-aissam](https://github.com/nexus-aissam))

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## Acknowledgments

- [argon2](https://crates.io/crates/argon2) - Rust Argon2 implementation
- [napi-rs](https://napi.rs/) - Rust bindings for Node.js
- [Bun](https://bun.sh/) - Fast JavaScript runtime
