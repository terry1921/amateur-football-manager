export function readSecurityTestEnvironment(environment) {
  const requiredVariables = [
    "SUPABASE_TEST_URL",
    "SUPABASE_TEST_PUBLISHABLE_KEY",
    "SUPABASE_TEST_SECRET_KEY",
  ];
  const missingVariables = requiredVariables.filter(
    (variable) => !environment[variable],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing security test environment variables: ${missingVariables.join(", ")}`,
    );
  }

  let url;

  try {
    url = new URL(environment.SUPABASE_TEST_URL);
  } catch {
    throw new Error("Security tests may only target local Supabase");
  }

  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

  if (url.protocol !== "http:" || !loopbackHosts.has(url.hostname)) {
    throw new Error("Security tests may only target local Supabase");
  }

  return {
    url: url.toString().replace(/\/$/, ""),
    publishableKey: environment.SUPABASE_TEST_PUBLISHABLE_KEY,
    secretKey: environment.SUPABASE_TEST_SECRET_KEY,
  };
}

export function securityEnvironmentFromSupabaseStatus(output) {
  const values = Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)=(?:"(.*)"|(.*))$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2] ?? match[3]]),
  );

  return {
    SUPABASE_TEST_URL: values.API_URL,
    SUPABASE_TEST_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
    SUPABASE_TEST_SECRET_KEY: values.SECRET_KEY,
  };
}
