/**
 * bun-argon2 - High-performance Argon2 password hashing for Bun and Node.js
 *
 * @module bun-argon2
 * @author Aissam Irhir <aissamirhir@gmail.com>
 *
 * @example
 * ```typescript
 * import { hash, verify } from 'bun-argon2';
 *
 * // Hash a password
 * const hashed = await hash('myPassword123');
 *
 * // Verify a password
 * const isValid = await verify(hashed, 'myPassword123');
 * ```
 */

import type { Argon2Options, NapiArgon2Options, RawHashResult } from "./types";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Re-export types
export type { Argon2Options, Argon2Type, RawHashResult } from "./types";

// Get current directory for ESM
const getCurrentDir = () => {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
};

// Platform-specific binary loading
function loadNativeBinding() {
  const platform = process.platform;
  const arch = process.arch;

  // Map to napi-rs target names
  let targetName: string;
  switch (platform) {
    case "darwin":
      targetName = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
      break;
    case "linux":
      // Check for musl vs glibc
      const isMusl =
        existsSync("/etc/alpine-release") ||
        process.env.npm_config_libc === "musl";
      if (arch === "arm64") {
        targetName = isMusl ? "linux-arm64-musl" : "linux-arm64-gnu";
      } else {
        targetName = isMusl ? "linux-x64-musl" : "linux-x64-gnu";
      }
      break;
    case "win32":
      targetName = "win32-x64-msvc";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  const currentDir = getCurrentDir();

  // Try loading from different locations
  const possiblePaths = [
    // Same directory as this file (dist/)
    join(currentDir, `argon2.${targetName}.node`),
    // Parent directory (package root)
    join(currentDir, "..", `argon2.${targetName}.node`),
    // CWD (development)
    join(process.cwd(), `argon2.${targetName}.node`),
  ];

  for (const modulePath of possiblePaths) {
    try {
      if (existsSync(modulePath)) {
        return require(modulePath);
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    `Failed to load native binding for ${platform}-${arch}. ` +
      `Tried: ${possiblePaths.join(", ")}`
  );
}

// Load native bindings
const native = loadNativeBinding();

/**
 * Convert public options to napi format
 * napi-rs converts Rust snake_case to JS camelCase automatically
 */
function toNapiOptions(options?: Argon2Options): NapiArgon2Options | undefined {
  if (!options) return undefined;

  return {
    algorithm: options.type,
    memoryCost: options.memoryCost,
    timeCost: options.timeCost,
    parallelism: options.parallelism,
    hashLength: options.hashLength,
    salt: options.salt,
  };
}

/**
 * Hash a password asynchronously (recommended)
 *
 * Returns a PHC-formatted hash string like:
 * `$argon2id$v=19$m=65536,t=3,p=4$...`
 *
 * @param password - The password to hash
 * @param options - Optional hashing parameters
 * @returns Promise resolving to the hashed password string
 *
 * @example
 * ```typescript
 * // Basic usage
 * const hashed = await hash('myPassword123');
 *
 * // With custom options
 * const hashed = await hash('myPassword123', {
 *   type: 'argon2id',
 *   memoryCost: 65536,
 *   timeCost: 3,
 *   parallelism: 4,
 * });
 * ```
 */
export async function hash(
  password: string,
  options?: Argon2Options
): Promise<string> {
  return native.hash(password, toNapiOptions(options));
}

/**
 * Verify a password against a hash asynchronously (recommended)
 *
 * @param encoded - The PHC-formatted hash string
 * @param password - The password to verify
 * @returns Promise resolving to true if password matches
 *
 * @example
 * ```typescript
 * const hashed = await hash('myPassword123');
 * const isValid = await verify(hashed, 'myPassword123');
 * console.log(isValid); // true
 * ```
 */
export async function verify(
  encoded: string,
  password: string
): Promise<boolean> {
  return native.verify(encoded, password);
}

/**
 * Hash a password synchronously (blocking)
 *
 * Use this only when async is not available (e.g., in constructors).
 * Prefer `hash()` for better performance.
 *
 * @param password - The password to hash
 * @param options - Optional hashing parameters
 * @returns The hashed password string
 *
 * @example
 * ```typescript
 * const hashed = hashSync('myPassword123');
 * ```
 */
export function hashSync(password: string, options?: Argon2Options): string {
  return native.hashSync(password, toNapiOptions(options));
}

/**
 * Verify a password against a hash synchronously (blocking)
 *
 * Use this only when async is not available.
 * Prefer `verify()` for better performance.
 *
 * @param encoded - The PHC-formatted hash string
 * @param password - The password to verify
 * @returns True if password matches
 *
 * @example
 * ```typescript
 * const isValid = verifySync(hashed, 'myPassword123');
 * ```
 */
export function verifySync(encoded: string, password: string): boolean {
  return native.verifySync(encoded, password);
}

/**
 * Get raw hash and salt as Buffers asynchronously
 *
 * Unlike `hash()` which returns a PHC string, this returns raw bytes.
 * Useful for custom storage or when you need direct access to the hash bytes.
 *
 * @param password - The password to hash
 * @param options - Optional hashing parameters
 * @returns Promise resolving to object with hash and salt Buffers
 *
 * @example
 * ```typescript
 * const { hash, salt } = await hashRaw('myPassword123');
 * console.log(hash.toString('hex')); // Raw hash as hex
 * console.log(salt.toString('hex')); // Salt as hex
 * ```
 */
export async function hashRaw(
  password: string,
  options?: Argon2Options
): Promise<RawHashResult> {
  return native.hashRaw(password, toNapiOptions(options));
}

/**
 * Get raw hash and salt as Buffers synchronously
 *
 * @param password - The password to hash
 * @param options - Optional hashing parameters
 * @returns Object with hash and salt Buffers
 */
export function hashRawSync(
  password: string,
  options?: Argon2Options
): RawHashResult {
  return native.hashRawSync(password, toNapiOptions(options));
}

/**
 * Check if a hash needs to be rehashed
 *
 * Useful when you've upgraded your hashing parameters and want to
 * gradually migrate existing hashes.
 *
 * @param encoded - The PHC-formatted hash string
 * @param options - The current hashing parameters to compare against
 * @returns True if the hash uses different parameters
 *
 * @example
 * ```typescript
 * const oldHash = '$argon2id$v=19$m=4096,t=1,p=1$...';
 * const newOptions = { memoryCost: 65536, timeCost: 3 };
 *
 * if (needsRehash(oldHash, newOptions)) {
 *   // Re-hash with new parameters on next login
 * }
 * ```
 */
export function needsRehash(encoded: string, options?: Argon2Options): boolean {
  return native.needsRehash(encoded, toNapiOptions(options));
}

/**
 * Get the native library version
 *
 * @returns Version string
 */
export function version(): string {
  return native.version();
}

// Default export for convenience
export default {
  hash,
  verify,
  hashSync,
  verifySync,
  hashRaw,
  hashRawSync,
  needsRehash,
  version,
};
