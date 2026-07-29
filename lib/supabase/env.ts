type SupabasePublicEnvironment = {
  url?: string;
  publishableKey?: string;
};

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function readSupabaseEnvironment(): SupabasePublicEnvironment {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabasePublicConfig(
  environment = readSupabaseEnvironment(),
): SupabasePublicConfig {
  const missingVariables = [
    !environment.url && "NEXT_PUBLIC_SUPABASE_URL",
    !environment.publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required Supabase environment variables: ${missingVariables.join(", ")}. Copy .env.example to .env.local and provide your project's public values.`,
    );
  }

  let url: URL;

  try {
    url = new URL(environment.url!);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL for your Supabase project.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL for your Supabase project.",
    );
  }

  return {
    url: url.toString().replace(/\/$/, ""),
    publishableKey: environment.publishableKey!,
  };
}
