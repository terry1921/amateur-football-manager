import { spawnSync } from "node:child_process";
import {
  readSecurityTestEnvironment,
  securityEnvironmentFromSupabaseStatus,
} from "./setup/local-environment.mjs";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
let startedSupabase = false;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: options.environment ?? process.env,
  });

  if (result.error) throw result.error;

  if (!options.allowFailure && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}`,
    );
  }

  return result;
}

function readLocalStatus() {
  return run(npxCommand, ["supabase", "status", "-o", "env"], {
    capture: true,
    allowFailure: true,
  });
}

function ensureLocalSupabase() {
  let status = readLocalStatus();

  if (status.status !== 0) {
    console.log("Starting the local Supabase stack for security tests...");
    run(npxCommand, ["supabase", "start"], { capture: true });
    startedSupabase = true;
    status = readLocalStatus();
  }

  if (status.status !== 0) {
    throw new Error("The local Supabase stack did not become available");
  }

  return securityEnvironmentFromSupabaseStatus(status.stdout);
}

function stopOwnedSupabase() {
  if (!startedSupabase) return;

  console.log("Stopping the local Supabase stack started by security tests...");
  run(npxCommand, ["supabase", "stop"], { capture: true });
}

try {
  const initialEnvironment = ensureLocalSupabase();
  readSecurityTestEnvironment(initialEnvironment);

  console.log("Resetting the local database and applying all migrations...");
  run(npxCommand, ["supabase", "db", "reset", "--local", "--yes"]);

  const resetStatus = readLocalStatus();
  if (resetStatus.status !== 0) {
    throw new Error("Local Supabase was unavailable after database reset");
  }

  const securityEnvironment = securityEnvironmentFromSupabaseStatus(
    resetStatus.stdout,
  );
  readSecurityTestEnvironment(securityEnvironment);
  const testProcessEnvironment = {
    ...process.env,
    ...securityEnvironment,
  };

  console.log("Running the transactional PostgreSQL RLS suite...");
  run(npxCommand, ["supabase", "test", "db"], {
    environment: testProcessEnvironment,
  });

  console.log("Running authenticated Supabase JS and REST security tests...");
  run(npxCommand, ["vitest", "run", "--config", "vitest.security.config.ts"], {
    environment: testProcessEnvironment,
  });
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Security tests failed",
  );
  process.exitCode = 1;
} finally {
  try {
    stopOwnedSupabase();
  } catch {
    console.error("Unable to stop the local Supabase stack cleanly");
    process.exitCode = 1;
  }
}
