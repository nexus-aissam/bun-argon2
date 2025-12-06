/**
 * bun-argon2 Benchmarks
 *
 * Compares performance against the popular `argon2` npm package
 *
 * Run with: bun run benchmarks/bench.ts
 */

// Our package
import * as bunArgon2 from "../src/index";

// Competitor (install with: bun add argon2)
let argon2: typeof import("argon2") | null = null;
try {
  argon2 = require("argon2");
} catch {
  console.log("⚠️  argon2 package not installed. Run: bun add argon2");
  console.log("   Skipping comparison benchmarks.\n");
}

const PASSWORD = "mySecurePassword123!";
const ITERATIONS = 100;

// Low memory settings for faster benchmarks
const LOW_MEMORY_OPTIONS = {
  memoryCost: 4096, // 4MB instead of 64MB
  timeCost: 2,
  parallelism: 1,
};

interface BenchResult {
  name: string;
  ops: number;
  avgMs: number;
  totalMs: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number
): Promise<BenchResult> {
  // Warmup
  for (let i = 0; i < 3; i++) {
    await fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;
  const ops = 1000 / avgMs;

  return { name, ops, avgMs, totalMs };
}

function benchmarkSync(
  name: string,
  fn: () => void,
  iterations: number
): BenchResult {
  // Warmup
  for (let i = 0; i < 3; i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;
  const ops = 1000 / avgMs;

  return { name, ops, avgMs, totalMs };
}

function formatResult(result: BenchResult): string {
  return `${result.name.padEnd(35)} ${result.avgMs.toFixed(2).padStart(8)} ms/op  ${result.ops.toFixed(2).padStart(8)} ops/sec`;
}

function formatComparison(ours: BenchResult, theirs: BenchResult): string {
  const speedup = theirs.avgMs / ours.avgMs;
  const faster = speedup > 1;
  const emoji = faster ? "🚀" : "🐢";
  const comparison = faster
    ? `${speedup.toFixed(2)}x faster`
    : `${(1 / speedup).toFixed(2)}x slower`;
  return `${emoji} bun-argon2 is ${comparison} than argon2`;
}

async function main() {
  console.log("=".repeat(70));
  console.log("                    bun-argon2 Benchmarks");
  console.log("=".repeat(70));
  console.log(`Platform: ${process.platform}-${process.arch}`);
  console.log(`Runtime: Bun ${Bun.version}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Memory Cost: ${LOW_MEMORY_OPTIONS.memoryCost} KB`);
  console.log(`Time Cost: ${LOW_MEMORY_OPTIONS.timeCost}`);
  console.log(`Parallelism: ${LOW_MEMORY_OPTIONS.parallelism}`);
  console.log("=".repeat(70));

  const results: { category: string; results: BenchResult[] }[] = [];

  // ============================================
  // HASH ASYNC
  // ============================================
  console.log("\n📊 Hash (async)\n");

  const hashResults: BenchResult[] = [];

  const bunHashAsync = await benchmark(
    "bun-argon2 hash()",
    async () => {
      await bunArgon2.hash(PASSWORD, LOW_MEMORY_OPTIONS);
    },
    ITERATIONS
  );
  hashResults.push(bunHashAsync);
  console.log(formatResult(bunHashAsync));

  if (argon2) {
    const argon2HashAsync = await benchmark(
      "argon2 hash()",
      async () => {
        await argon2!.hash(PASSWORD, {
          memoryCost: LOW_MEMORY_OPTIONS.memoryCost,
          timeCost: LOW_MEMORY_OPTIONS.timeCost,
          parallelism: LOW_MEMORY_OPTIONS.parallelism,
        });
      },
      ITERATIONS
    );
    hashResults.push(argon2HashAsync);
    console.log(formatResult(argon2HashAsync));
    console.log("\n" + formatComparison(bunHashAsync, argon2HashAsync));
  }

  results.push({ category: "Hash (async)", results: hashResults });

  // ============================================
  // HASH SYNC
  // ============================================
  console.log("\n📊 Hash (sync)\n");

  const hashSyncResults: BenchResult[] = [];

  const bunHashSync = benchmarkSync(
    "bun-argon2 hashSync()",
    () => {
      bunArgon2.hashSync(PASSWORD, LOW_MEMORY_OPTIONS);
    },
    ITERATIONS
  );
  hashSyncResults.push(bunHashSync);
  console.log(formatResult(bunHashSync));

  results.push({ category: "Hash (sync)", results: hashSyncResults });

  // ============================================
  // VERIFY ASYNC
  // ============================================
  console.log("\n📊 Verify (async)\n");

  const verifyResults: BenchResult[] = [];

  // Pre-hash for verify tests
  const bunHash = await bunArgon2.hash(PASSWORD, LOW_MEMORY_OPTIONS);
  const argon2Hash = argon2
    ? await argon2.hash(PASSWORD, {
        memoryCost: LOW_MEMORY_OPTIONS.memoryCost,
        timeCost: LOW_MEMORY_OPTIONS.timeCost,
        parallelism: LOW_MEMORY_OPTIONS.parallelism,
      })
    : null;

  const bunVerifyAsync = await benchmark(
    "bun-argon2 verify()",
    async () => {
      await bunArgon2.verify(bunHash, PASSWORD);
    },
    ITERATIONS
  );
  verifyResults.push(bunVerifyAsync);
  console.log(formatResult(bunVerifyAsync));

  if (argon2 && argon2Hash) {
    const argon2VerifyAsync = await benchmark(
      "argon2 verify()",
      async () => {
        await argon2!.verify(argon2Hash, PASSWORD);
      },
      ITERATIONS
    );
    verifyResults.push(argon2VerifyAsync);
    console.log(formatResult(argon2VerifyAsync));
    console.log("\n" + formatComparison(bunVerifyAsync, argon2VerifyAsync));
  }

  results.push({ category: "Verify (async)", results: verifyResults });

  // ============================================
  // VERIFY SYNC
  // ============================================
  console.log("\n📊 Verify (sync)\n");

  const verifySyncResults: BenchResult[] = [];

  const bunVerifySync = benchmarkSync(
    "bun-argon2 verifySync()",
    () => {
      bunArgon2.verifySync(bunHash, PASSWORD);
    },
    ITERATIONS
  );
  verifySyncResults.push(bunVerifySync);
  console.log(formatResult(bunVerifySync));

  results.push({ category: "Verify (sync)", results: verifySyncResults });

  // ============================================
  // STRESS TEST
  // ============================================
  console.log("\n📊 Stress Test (concurrent hashing)\n");

  const CONCURRENT_OPS = 50;

  // bun-argon2 stress test
  const stressStart = performance.now();
  const stressPromises = Array.from({ length: CONCURRENT_OPS }, (_, i) =>
    bunArgon2.hash(`password${i}`, LOW_MEMORY_OPTIONS)
  );
  await Promise.all(stressPromises);
  const bunStressTime = performance.now() - stressStart;
  const bunStressThroughput = (CONCURRENT_OPS / bunStressTime) * 1000;
  console.log(
    `bun-argon2 (${CONCURRENT_OPS} concurrent)`.padEnd(35) +
      `${bunStressTime.toFixed(2).padStart(8)} ms total  ${bunStressThroughput.toFixed(2).padStart(8)} ops/sec`
  );

  if (argon2) {
    const argon2StressStart = performance.now();
    const argon2StressPromises = Array.from({ length: CONCURRENT_OPS }, (_, i) =>
      argon2!.hash(`password${i}`, {
        memoryCost: LOW_MEMORY_OPTIONS.memoryCost,
        timeCost: LOW_MEMORY_OPTIONS.timeCost,
        parallelism: LOW_MEMORY_OPTIONS.parallelism,
      })
    );
    await Promise.all(argon2StressPromises);
    const argon2StressTime = performance.now() - argon2StressStart;
    const argon2StressThroughput = (CONCURRENT_OPS / argon2StressTime) * 1000;
    console.log(
      `argon2 (${CONCURRENT_OPS} concurrent)`.padEnd(35) +
        `${argon2StressTime.toFixed(2).padStart(8)} ms total  ${argon2StressThroughput.toFixed(2).padStart(8)} ops/sec`
    );

    const stressSpeedup = argon2StressTime / bunStressTime;
    const stressFaster = stressSpeedup > 1;
    const stressEmoji = stressFaster ? "🚀" : "🐢";
    const stressComparison = stressFaster
      ? `${stressSpeedup.toFixed(2)}x faster`
      : `${(1 / stressSpeedup).toFixed(2)}x slower`;
    console.log(`\n${stressEmoji} bun-argon2 is ${stressComparison} under stress`);
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("                         Summary");
  console.log("=".repeat(70));

  console.log("\n| Operation | bun-argon2 | argon2 | Difference |");
  console.log("|-----------|------------|--------|------------|");

  for (const { category, results: categoryResults } of results) {
    const bunResult = categoryResults[0];
    const argon2Result = categoryResults[1];

    if (argon2Result) {
      const speedup = argon2Result.avgMs / bunResult.avgMs;
      const diff =
        speedup > 1 ? `**${speedup.toFixed(2)}x faster**` : `${(1 / speedup).toFixed(2)}x slower`;
      console.log(
        `| ${category} | ${bunResult.avgMs.toFixed(2)} ms | ${argon2Result.avgMs.toFixed(2)} ms | ${diff} |`
      );
    } else {
      console.log(`| ${category} | ${bunResult.avgMs.toFixed(2)} ms | N/A | - |`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Benchmark completed!");
  console.log("=".repeat(70));
}

main().catch(console.error);
