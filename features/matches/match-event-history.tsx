import { getTranslations } from "next-intl/server";
import type { MatchEvent, MatchEventType } from "./model";

export async function MatchEventHistory({ events }: { events: MatchEvent[] }) {
  const t = await getTranslations("Results");
  return (
    <section
      className="border-t border-line p-5 sm:p-6"
      aria-labelledby="match-events-heading"
    >
      <h2
        id="match-events-heading"
        className="text-xs font-black uppercase tracking-[0.08em] text-muted"
      >
        {t("history.title")}
      </h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t("history.none")}</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {(["goal", "yellow_card", "red_card"] as const).map(
            (type: MatchEventType) => {
              const typeEvents = events.filter((event) => event.type === type);
              return (
                <div key={type}>
                  <h3 className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                    {t(`eventTypes.${type}`)}
                  </h3>
                  {typeEvents.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">
                      {t("history.none")}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-ink">
                      {typeEvents.map((event) => (
                        <li
                          key={event.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="font-bold">{event.player_name}</span>
                          <span className="font-black text-pitch">
                            {event.minute}&apos;
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}
