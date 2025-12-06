/**
 * bun-argon2 - Unit Tests
 *
 * Run with: bun test
 */

import { describe, expect, test, beforeAll } from "bun:test";
import {
  hash,
  verify,
  hashSync,
  verifySync,
  hashRaw,
  hashRawSync,
  needsRehash,
  version,
} from "../src/index";

describe("bun-argon2", () => {
  const testPassword = "mySecurePassword123!";
  let hashedPassword: string;

  describe("version", () => {
    test("should return version string", () => {
      const ver = version();
      expect(ver).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("hash (async)", () => {
    test("should hash a password with default options", async () => {
      hashedPassword = await hash(testPassword);
      expect(hashedPassword).toStartWith("$argon2id$");
      expect(hashedPassword).toContain("$v=19$");
      expect(hashedPassword).toContain("m=65536");
      expect(hashedPassword).toContain("t=3");
      expect(hashedPassword).toContain("p=4");
    });

    test("should hash with custom options", async () => {
      const hashed = await hash(testPassword, {
        type: "argon2i",
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 2,
      });
      expect(hashed).toStartWith("$argon2i$");
      expect(hashed).toContain("m=4096");
      expect(hashed).toContain("t=2");
      expect(hashed).toContain("p=2");
    });

    test("should hash with argon2d", async () => {
      const hashed = await hash(testPassword, { type: "argon2d" });
      expect(hashed).toStartWith("$argon2d$");
    });

    test("should produce different hashes for same password (random salt)", async () => {
      const hash1 = await hash(testPassword);
      const hash2 = await hash(testPassword);
      expect(hash1).not.toBe(hash2);
    });

    test("should hash with custom salt", async () => {
      const customSalt = Buffer.from("mysaltvalue1234!");
      const hash1 = await hash(testPassword, { salt: customSalt });
      const hash2 = await hash(testPassword, { salt: customSalt });
      // Same salt should produce same hash
      expect(hash1).toBe(hash2);
    });
  });

  describe("verify (async)", () => {
    beforeAll(async () => {
      hashedPassword = await hash(testPassword);
    });

    test("should verify correct password", async () => {
      const isValid = await verify(hashedPassword, testPassword);
      expect(isValid).toBe(true);
    });

    test("should reject incorrect password", async () => {
      const isValid = await verify(hashedPassword, "wrongPassword");
      expect(isValid).toBe(false);
    });

    test("should verify argon2i hash", async () => {
      const hashed = await hash(testPassword, { type: "argon2i" });
      const isValid = await verify(hashed, testPassword);
      expect(isValid).toBe(true);
    });

    test("should verify argon2d hash", async () => {
      const hashed = await hash(testPassword, { type: "argon2d" });
      const isValid = await verify(hashed, testPassword);
      expect(isValid).toBe(true);
    });

    test("should handle invalid hash format", async () => {
      await expect(verify("invalid-hash", testPassword)).rejects.toThrow();
    });
  });

  describe("hashSync", () => {
    test("should hash a password synchronously", () => {
      const hashed = hashSync(testPassword);
      expect(hashed).toStartWith("$argon2id$");
    });

    test("should hash with custom options", () => {
      const hashed = hashSync(testPassword, {
        type: "argon2i",
        memoryCost: 4096,
        timeCost: 2,
      });
      expect(hashed).toStartWith("$argon2i$");
      expect(hashed).toContain("m=4096");
    });
  });

  describe("verifySync", () => {
    test("should verify correct password synchronously", () => {
      const hashed = hashSync(testPassword);
      const isValid = verifySync(hashed, testPassword);
      expect(isValid).toBe(true);
    });

    test("should reject incorrect password synchronously", () => {
      const hashed = hashSync(testPassword);
      const isValid = verifySync(hashed, "wrongPassword");
      expect(isValid).toBe(false);
    });
  });

  describe("hashRaw (async)", () => {
    test("should return raw hash and salt", async () => {
      const result = await hashRaw(testPassword);
      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.salt).toBeInstanceOf(Buffer);
      expect(result.hash.length).toBe(32); // Default hash length
    });

    test("should return custom hash length", async () => {
      const result = await hashRaw(testPassword, { hashLength: 64 });
      expect(result.hash.length).toBe(64);
    });
  });

  describe("hashRawSync", () => {
    test("should return raw hash and salt synchronously", () => {
      const result = hashRawSync(testPassword);
      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.salt).toBeInstanceOf(Buffer);
      expect(result.hash.length).toBe(32);
    });
  });

  describe("needsRehash", () => {
    test("should return false for matching parameters", async () => {
      const hashed = await hash(testPassword);
      const needs = needsRehash(hashed);
      expect(needs).toBe(false);
    });

    test("should return true for different memory cost", async () => {
      const hashed = await hash(testPassword, { memoryCost: 4096 });
      const needs = needsRehash(hashed, { memoryCost: 65536 });
      expect(needs).toBe(true);
    });

    test("should return true for different time cost", async () => {
      const hashed = await hash(testPassword, { timeCost: 2 });
      const needs = needsRehash(hashed, { timeCost: 3 });
      expect(needs).toBe(true);
    });

    test("should return true for different algorithm", async () => {
      const hashed = await hash(testPassword, { type: "argon2i" });
      const needs = needsRehash(hashed, { type: "argon2id" });
      expect(needs).toBe(true);
    });
  });

  describe("edge cases", () => {
    test("should handle empty password", async () => {
      const hashed = await hash("");
      const isValid = await verify(hashed, "");
      expect(isValid).toBe(true);
    });

    test("should handle unicode password", async () => {
      const unicodePassword = "密码🔐Пароль";
      const hashed = await hash(unicodePassword);
      const isValid = await verify(hashed, unicodePassword);
      expect(isValid).toBe(true);
    });

    test("should handle very long password", async () => {
      const longPassword = "a".repeat(10000);
      const hashed = await hash(longPassword, { memoryCost: 4096 }); // Lower memory for speed
      const isValid = await verify(hashed, longPassword);
      expect(isValid).toBe(true);
    });

    test("should handle special characters", async () => {
      const specialPassword = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\";
      const hashed = await hash(specialPassword);
      const isValid = await verify(hashed, specialPassword);
      expect(isValid).toBe(true);
    });
  });
});
