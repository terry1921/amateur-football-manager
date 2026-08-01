import { mapBackendError } from "./map-backend-error";

export function logServerError(
  error: unknown,
  context: { operation: string; teamId?: string; recordId?: string },
) {
  const mapped = mapBackendError(error, "team");
  console.error("[matchday-error]", {
    code: mapped.code,
    category: mapped.category,
    operation: context.operation,
    teamId: context.teamId,
    recordId: context.recordId,
  });
}

export function logClientError(error: unknown, operation: string) {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest ?? "")
      : undefined;
  console.error("[matchday-error]", { operation, digest });
}
