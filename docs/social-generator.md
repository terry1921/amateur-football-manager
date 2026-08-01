# Social Media Generator

The Social Media Generator is a presentation layer over the existing football
history. It does not create a second match record, duplicate statistics, or
persist a template. A corrected result is therefore reflected the next time a
graphic or caption is generated.

## Data authority

The module reads one team context, the selected season, up to 100 matches, up
to 250 players, and one statistics snapshot in parallel. It then reads at most
250 call-ups and 250 events for the selected match, also in parallel.

The current team is resolved once through the authenticated owner access
helper. Every match, player, call-up, and event read is scoped to that team.
The selected match must be present in the scoped match list; a caller cannot
provide another team's identifier to expand the query.

Goals and cards remain normalized rows in match_events. The generator groups
those rows only while building a preview. Call-ups remain the source for the
lineup template; a call-up is not treated as an appearance. Rankings and top
scorers come from the shared statistics projection used by Statistics and
Leaderboards.

## Templates

- **Match result**: completed score, opponent, competition, venue, and
  normalized goal events.
- **Upcoming match**: scheduled fixture information without inventing a result.
- **Top scorer**: the existing statistics leader for the selected scope.
- **Player of the Match**: a transparent derived presentation. It chooses the
  highest goal contributor, then fewer recorded cards, then a deterministic
  name tie-break. With no goal event, the template remains unavailable rather
  than inventing an award.
- **Lineup**: the players recorded in the selected match call-up.

Captions are deterministic strings for Facebook, Instagram, and X. There is no
AI request, publishing integration, or editable content field.

## Branding and fallbacks

Team name, logo, colors, opponent name/logo, player photos, and season labels
come from the existing team, match, player, and season records. Invalid or
missing six-digit hex colors use the product defaults. Missing images render
initials in both the HTML preview and the canvas export.

## Export

The export uses the browser's native Canvas API and downloads a 1080 × 1080
PNG. Images are loaded defensively; an unavailable remote image does not block
the rest of the graphic. PDF export is intentionally not part of this module.

## Security and future extensions

The route is protected by the existing dashboard access boundary and uses the
same authenticated Supabase client as the rest of the application. There is no
service-role access and no social-media storage table.

Sponsor slots, stories/reels layouts, team-vs-team comparisons, AI-assisted
captions, scheduling, and publishing can be added later as new presentation
capabilities. They must continue to consume the authoritative match/event and
statistics layers.
