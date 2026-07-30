"use client";

import { UserMinus, UserPlus } from "lucide-react";
import { useActionState } from "react";
import {
  initialPlayerLifecycleState,
  type PlayerLifecycleActionState,
} from "./state";

type LifecycleAction = (
  state: PlayerLifecycleActionState,
) => Promise<PlayerLifecycleActionState>;

export function PlayerLifecycleButton({
  action,
  label,
  lifecycle,
}: {
  action: LifecycleAction;
  label: string;
  lifecycle: "deactivate" | "reactivate";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialPlayerLifecycleState,
  );
  const Icon = lifecycle === "reactivate" ? UserPlus : UserMinus;
  return (
    <form action={formAction} className="contents">
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-60 ${lifecycle === "reactivate" ? "bg-pitch text-white hover:bg-[#008f2b]" : "text-pitch hover:bg-pitch/8"}`}
      >
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </button>
      {state.message ? (
        <span
          role={state.status === "error" ? "alert" : "status"}
          className={`basis-full text-xs ${state.status === "error" ? "text-red-700" : "text-pitch"}`}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
