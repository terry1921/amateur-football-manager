const basePolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
];

export function getContentSecurityPolicy(
  nodeEnv = process.env.NODE_ENV,
): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (nodeEnv === "development") {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    ...basePolicy,
    `script-src ${scriptSources.join(" ")}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321",
    "font-src 'self' data:",
    "manifest-src 'self'",
    "worker-src 'self'",
  ].join("; ");
}
