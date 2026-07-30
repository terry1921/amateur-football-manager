"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  initialSeasonLifecycleState,
  type SeasonLifecycleActionState,
} from "./state";

type LifecycleAction = (
  state: SeasonLifecycleActionState,
) => Promise<SeasonLifecycleActionState>;

function ActionButton({
  label,
  icon: Icon,
  primary,
}: {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-60 ${
        primary
          ? "bg-pitch text-white hover:bg-[#008f2b]"
          : "text-pitch hover:bg-pitch/8"
      }`}
    >
      <Icon aria-hidden="true" className="size-4" />
      {pending ? `${label}…` : label}
    </button>
  );
}

export function SeasonLifecycleButton({
  action,
  label,
  icon,
  primary,
}: {
  action: LifecycleAction;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  const [state, formAction] = useActionState(
    action,
    initialSeasonLifecycleState,
  );

  return (
    <form action={formAction} className="contents">
      <ActionButton label={label} icon={icon} primary={primary} />
      {state.status === "error" && state.message ? (
        <span role="alert" className="basis-full text-xs text-red-700">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
