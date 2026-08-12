export const monetizationEventNames = [
  "premium_intent",
  "pricing_view",
  "upgrade_click",
  "checkout_started",
  "checkout_completed",
  "pro_activated",
  "cancellation",
] as const;

export type MonetizationEventName = (typeof monetizationEventNames)[number];

type SafeProperties = Record<string, string>;

export type MonetizationEvent = {
  name: MonetizationEventName;
  occurredAt: string;
  properties: SafeProperties;
};

type PremiumIntentProperties = {
  entryPoint?: "feature_gate" | "plan_limit" | "settings";
};

type PricingViewProperties = {
  surface?: "public" | "in_app";
};

type UpgradeClickProperties = {
  source?: "pricing" | "feature_gate" | "settings";
};

type CheckoutProperties = {
  plan?: "pro";
  interval?: "monthly" | "annual";
};

type ProActivationProperties = {
  plan?: "pro";
};

type CancellationProperties = {
  timing?: "period_end" | "immediate";
};

export type ClientMonetizationEvent =
  | { name: "premium_intent"; properties?: PremiumIntentProperties }
  | { name: "pricing_view"; properties?: PricingViewProperties }
  | { name: "upgrade_click"; properties?: UpgradeClickProperties }
  | { name: "checkout_started"; properties?: CheckoutProperties }
  | { name: "checkout_completed"; properties?: CheckoutProperties };

export type ServerMonetizationEvent =
  | { name: "checkout_started"; properties?: CheckoutProperties }
  | { name: "checkout_completed"; properties?: CheckoutProperties }
  | { name: "pro_activated"; properties?: ProActivationProperties }
  | { name: "cancellation"; properties?: CancellationProperties };

export interface MonetizationAnalyticsSink {
  capture(event: MonetizationEvent): void | Promise<void>;
}

export interface ClientMonetizationAnalytics {
  track(event: ClientMonetizationEvent): void | Promise<void>;
}

export interface ServerMonetizationAnalytics {
  track(event: ServerMonetizationEvent): void | Promise<void>;
}

type UnknownRecord = Record<string, unknown>;

const clientEventNames = new Set<MonetizationEventName>([
  "premium_intent",
  "pricing_view",
  "upgrade_click",
  "checkout_started",
  "checkout_completed",
]);

const serverEventNames = new Set<MonetizationEventName>([
  "checkout_started",
  "checkout_completed",
  "pro_activated",
  "cancellation",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickEnum(
  value: unknown,
  allowed: readonly string[],
): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function toProperties(
  name: MonetizationEventName,
  input: unknown,
): SafeProperties {
  const properties = isRecord(input) ? input : {};
  const safeProperties: SafeProperties = {};

  const allowedByEvent: Record<
    MonetizationEventName,
    Readonly<Record<string, readonly string[]>>
  > = {
    premium_intent: {
      entryPoint: ["feature_gate", "plan_limit", "settings"],
    },
    pricing_view: { surface: ["public", "in_app"] },
    upgrade_click: { source: ["pricing", "feature_gate", "settings"] },
    checkout_started: { plan: ["pro"], interval: ["monthly", "annual"] },
    checkout_completed: { plan: ["pro"], interval: ["monthly", "annual"] },
    pro_activated: { plan: ["pro"] },
    cancellation: { timing: ["period_end", "immediate"] },
  };

  for (const [key, allowed] of Object.entries(allowedByEvent[name])) {
    const value = pickEnum(properties[key], allowed);
    if (value) safeProperties[key] = value;
  }

  return safeProperties;
}

function isMonetizationEventName(
  value: unknown,
): value is MonetizationEventName {
  return (
    typeof value === "string" &&
    (monetizationEventNames as readonly string[]).includes(value)
  );
}

export function normalizeMonetizationEvent(
  input: unknown,
  occurredAt = new Date(),
): MonetizationEvent | null {
  if (!isRecord(input) || !isMonetizationEventName(input.name)) return null;

  return {
    name: input.name,
    occurredAt: occurredAt.toISOString(),
    properties: toProperties(input.name, input.properties),
  };
}

function createMonetizationAnalytics(
  sink: MonetizationAnalyticsSink,
  allowedEvents: ReadonlySet<MonetizationEventName>,
  now: () => Date,
) {
  return {
    track(event: unknown) {
      const normalized = normalizeMonetizationEvent(event, now());
      if (!normalized || !allowedEvents.has(normalized.name)) return;

      return sink.capture(normalized);
    },
  };
}

export function createClientMonetizationAnalytics(
  sink: MonetizationAnalyticsSink,
  now: () => Date = () => new Date(),
): ClientMonetizationAnalytics {
  return createMonetizationAnalytics(sink, clientEventNames, now);
}

export function createServerMonetizationAnalytics(
  sink: MonetizationAnalyticsSink,
  now: () => Date = () => new Date(),
): ServerMonetizationAnalytics {
  return createMonetizationAnalytics(sink, serverEventNames, now);
}

export function createNoopServerMonetizationAnalytics(): ServerMonetizationAnalytics {
  return {
    track() {},
  };
}
