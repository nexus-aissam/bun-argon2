/**
 * bun-argon2 - TypeScript Type Definitions
 *
 * @module bun-argon2/types
 * @author Aissam Irhir <aissamirhir@gmail.com>
 */

/**
 * Argon2 algorithm variant
 *
 * - `argon2d`: Data-dependent, vulnerable to side-channel attacks but fastest
 * - `argon2i`: Data-independent, secure against side-channel attacks
 * - `argon2id`: Hybrid (recommended), combines benefits of both
 */
export type Argon2Type = "argon2d" | "argon2i" | "argon2id";

/**
 * Argon2 hashing options
 *
 * @example
 * ```typescript
 * const options: Argon2Options = {
 *   type: 'argon2id',
 *   memoryCost: 65536,  // 64MB
 *   timeCost: 3,
 *   parallelism: 4,
 * };
 * ```
 */
export interface Argon2Options {
  /**
   * Algorithm type
   * @default 'argon2id'
   */
  type?: Argon2Type;

  /**
   * Memory cost in KB
   * Higher values increase security but require more memory
   * @default 65536 (64MB)
   */
  memoryCost?: number;

  /**
   * Time cost / iterations
   * Higher values increase security but take longer
   * @default 3
   */
  timeCost?: number;

  /**
   * Parallelism / threads
   * Number of parallel threads to use
   * @default 4
   */
  parallelism?: number;

  /**
   * Hash output length in bytes
   * @default 32
   */
  hashLength?: number;

  /**
   * Custom salt as Buffer
   * If not provided, a secure random salt is generated
   * @default undefined (auto-generated)
   */
  salt?: Buffer;
}

/**
 * Raw hash result containing hash and salt as Buffers
 *
 * @example
 * ```typescript
 * const result = await hashRaw('password');
 * console.log(result.hash);  // Buffer
 * console.log(result.salt);  // Buffer
 * ```
 */
export interface RawHashResult {
  /**
   * Raw hash bytes
   */
  hash: Buffer;

  /**
   * Salt used for hashing
   */
  salt: Buffer;
}

/**
 * Internal options format for napi bindings
 * napi-rs converts Rust snake_case to JS camelCase
 * @internal
 */
export interface NapiArgon2Options {
  algorithm?: string;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  hashLength?: number;
  salt?: Buffer;
}
