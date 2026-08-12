# Monetization analytics

`lib/analytics/monetization.ts` defines the privacy-safe subscription funnel
event contract. It does not select an analytics provider, persist events, or
send network requests. Integrations supply a `MonetizationAnalyticsSink` whose
`capture` method receives only a normalized `MonetizationEvent`.

## Event allowlist

Only these event names can reach a sink:

| Event                | Safe optional properties                               | Emitter          |
| -------------------- | ------------------------------------------------------ | ---------------- |
| `premium_intent`     | `entryPoint`: `feature_gate`, `plan_limit`, `settings` | Client           |
| `pricing_view`       | `surface`: `public`, `in_app`                          | Client           |
| `upgrade_click`      | `source`: `pricing`, `feature_gate`, `settings`        | Client           |
| `checkout_started`   | `plan`: `pro`; `interval`: `monthly`, `annual`         | Client           |
| `checkout_completed` | `plan`: `pro`; `interval`: `monthly`, `annual`         | Client or server |
| `pro_activated`      | `plan`: `pro`                                          | Server           |
| `cancellation`       | `timing`: `period_end`, `immediate`                    | Server           |

Every event is stamped by the module with `occurredAt` as an ISO-8601 string.
Property values are trimmed and lowercased before allowlist validation.
Unsupported names, properties, and property values are discarded. Unknown
event names return `null` and are never sent to a sink.

## Privacy boundary

Never pass provider payloads, customer IDs, subscription IDs, card data,
email addresses, secrets, checkout URLs, price IDs, coupons, or free-form
text to this module. The normalizer drops unrecognized keys, including nested
objects, but callers must still avoid placing sensitive data in analytics
inputs. This module has no database, provider SDK, environment-variable, or
browser-storage dependency.

## Integration contracts

Create a provider adapter that implements `MonetizationAnalyticsSink` and
receives the already-sanitized event:

```ts
import {
  createClientMonetizationAnalytics,
  type MonetizationAnalyticsSink,
} from "@/lib/analytics/monetization";

const sink: MonetizationAnalyticsSink = {
  capture(event) {
    analyticsProvider.capture(event.name, {
      occurredAt: event.occurredAt,
      ...event.properties,
    });
  },
};

const analytics = createClientMonetizationAnalytics(sink);
analytics.track({
  name: "upgrade_click",
  properties: { source: "pricing" },
});
```

Use `createClientMonetizationAnalytics` only in browser UI handlers. It
accepts the first five funnel events and rejects server-only events at runtime.
Use `createServerMonetizationAnalytics` in trusted server actions or webhook
handlers. It accepts `checkout_completed`, `pro_activated`, and
`cancellation`; call those only after the corresponding server-side condition
has been verified.

No pricing page, settings page, checkout endpoint, webhook, navigation, or
entitlement code is connected by this task. The future integrator owns where
the documented calls occur and must ensure their analytics provider is
configured to retain only this contract.
