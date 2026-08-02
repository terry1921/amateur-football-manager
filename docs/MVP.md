# Amateur Football Manager — MVP

> Working name: **Matchday**
>
> Goal: build a lightweight SaaS for amateur football teams to manage players, fixtures, call-ups, results, statistics, and basic social-media content from one place.

---

## 1. Product vision

Amateur teams often manage their operation across WhatsApp, spreadsheets, notes, calendars, and social networks. Matchday brings the essential workflow into one application without trying to become a full league-management platform.

The initial product will be validated with a real team (for example, Loros FC) before expanding to other amateur teams.

### Core promise

**“Manage your amateur football team without spreadsheets or endless WhatsApp messages.”**

### V1 objective

A team administrator should be able to:

1. Create a team.
2. Register players.
3. Schedule a match.
4. Create a call-up.
5. Record the result and match events.
6. Automatically update player statistics.
7. See the season overview.
8. Generate structured copy/data for a social post.

### Explicitly out of scope for V1

- Full league/tournament administration.
- Referee management.
- Live scoring.
- Streaming.
- Advanced tactical analysis.
- Payments and dues.
- Native mobile apps.
- AI-generated graphics.
- Public player marketplace.
- Complex federation rules.
- Multi-language support beyond preparing the architecture for it.

The rule for the first four weeks is: **if Loros FC can run a matchday with it, the MVP works.**

---

# 2. Target customer

## Primary persona

**Team administrator / coach / community manager**

Characteristics:

- Runs an amateur football team.
- Coordinates roughly 8–30 players.
- Uses WhatsApp as the main communication channel.
- Keeps statistics manually or not at all.
- Publishes fixtures/results on Facebook or Instagram.
- Has limited time and does not want enterprise sports software.

## Initial niches

Start with:

- Football 6 / 7.
- Football 8 / 9.
- Football 11.
- Independent amateur teams.

Do not initially sell to leagues. Teams have a shorter decision cycle and provide faster validation.

---

# 3. MVP user journey

```text
Sign up
   ↓
Create team
   ↓
Create season
   ↓
Add players
   ↓
Create match
   ↓
Create call-up
   ↓
Match is played
   ↓
Record result
   ↓
Record goals/cards/assists
   ↓
Statistics update
   ↓
Generate match summary/social copy
```

The product should optimize this loop before adding secondary functionality.

---

# 4. V1 functionality

## 4.1 Authentication

### Required

- Email/password authentication.
- Sign in.
- Sign out.
- Password reset.
- Protected application routes.

### Later

- Google authentication.
- Apple authentication.
- Invitations.

---

## 4.2 Team management

An authenticated user can create and manage one team in the initial beta.

### Team fields

```text
name
short_name
slug
logo_url
primary_color
secondary_color
city
country
created_at
```

### Actions

- Create team.
- Edit information.
- Upload/change crest.
- Configure team colors.

---

## 4.3 Seasons

A team can create seasons such as:

```text
Apertura 2026
Clausura 2027
Sunday League 2026
```

Fields:

```text
id
team_id
name
start_date
end_date
status
```

Status:

```text
draft
active
completed
```

Only one season needs to be active at a time for V1.

---

## 4.4 Players

### Player fields

```text
id
team_id
first_name
last_name
nickname
shirt_number
position
photo_url
status
created_at
```

Positions:

```text
GK
DEF
MID
FWD
```

Status:

```text
active
injured
suspended
inactive
```

### Actions

- Add player.
- Edit player.
- Deactivate player.
- View profile.
- View season statistics.

---

# 5. Match management

## Match fields

```text
id
team_id
season_id
opponent_name
opponent_logo_url
competition
round
venue
kickoff_at
home_away
status
team_score
opponent_score
notes
```

Status:

```text
scheduled
completed
cancelled
```

### Actions

- Create.
- Edit.
- Cancel.
- Complete match.
- View match details.

---

# 6. Call-ups

Before a match the administrator selects available players.

```text
match_id
player_id
status
```

Status:

```text
called_up
confirmed
declined
```

V1 does not require players to have accounts. The administrator can record confirmation manually after receiving it through WhatsApp.

Future versions may provide player self-confirmation through a public link.

---

# 7. Match events

When completing a match, the administrator can record:

```text
goal
assist
yellow_card
red_card
```

Entity:

```text
match_event

id
match_id
player_id
related_player_id
type
minute
created_at
```

`related_player_id` can represent the assisting player for a goal.

Minute should be optional because amateur teams often do not record exact times.

---

# 8. Statistics

Automatically calculate per season:

```text
appearances
goals
assists
yellow_cards
red_cards
```

Team dashboard:

```text
played
wins
draws
losses
goals_for
goals_against
goal_difference
```

Player leaderboard:

- Top scorers.
- Top assists.
- Most appearances.

Do not persist calculated statistics unless performance requires it. Prefer deriving them from match/event data initially.

---

# 9. Dashboard

The first screen after login should answer:

> What is happening with my team?

Show:

### Next match

Opponent, date, venue and call-up status.

### Season record

```text
PJ | PG | PE | PP | GF | GC | DG
```

### Leading scorers

Top 3.

### Recent results

Last 3 matches.

### Quick actions

```text
+ Match
+ Player
Create call-up
Record result
```

---

# 10. Social content helper

This is a differentiator, but keep V1 simple.

From match information, generate structured content for:

### Upcoming match

Example output:

```text
⚽ MATCHDAY

Loros FC 🆚 Verona FC

📅 Thursday 11 June
⏰ 9:10 PM
📍 Torneo del Barrio HG

Another match. Another chance to fly high.

#LorosFC #Matchday #Football
```

### Result

Uses:

- Score.
- Competition.
- Goalscorers.
- Matchday.

### V1 implementation

Use deterministic templates first.

Do **not** make an LLM dependency part of the critical match workflow.

AI rewriting can be introduced after product validation.

---

# 11. Suggested screens

```text
/auth/login
/auth/register

/onboarding

/dashboard

/team
/team/settings

/players
/players/new
/players/:id

/matches
/matches/new
/matches/:id
/matches/:id/call-up
/matches/:id/result

/statistics
```

Mobile-first responsive design is mandatory because administrators are likely to operate the product from their phones on matchday.

---

# 12. Technology architecture

## Architecture decision

Build V1 as a responsive web SaaS rather than native Android/iOS applications.

This provides:

- Faster iteration.
- One codebase.
- Easier beta distribution.
- No store review.
- Desktop access for administration.
- Mobile access on matchday.

Native applications can consume the same backend later.

---

## Frontend

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
React Hook Form
Zod
```

### Why

Next.js gives us a straightforward path for:

- SaaS frontend.
- Server-side operations.
- Public pages later.
- Authentication integration.
- Deployment.
- SEO if public team pages are introduced.

Your Vue experience transfers easily, while this project also expands your React/Next.js skill set.

---

## Backend/database

Recommended:

```text
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
```

Benefits:

- Relational data fits football entities extremely well.
- PostgreSQL makes statistics/querying straightforward.
- Authentication and storage are included.
- Fast MVP development.
- Easy migration to a custom backend later.

---

## Deployment

```text
Vercel
        ↓
Next.js
        ↓
Supabase
 ├── PostgreSQL
 ├── Auth
 └── Storage
```

---

# 13. Suggested repository structure

```text
amateur-football-manager/
│
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── players/
│   ├── matches/
│   ├── dashboard/
│   └── statistics/
│
├── features/
│   ├── auth/
│   ├── teams/
│   ├── seasons/
│   ├── players/
│   ├── matches/
│   ├── callups/
│   ├── statistics/
│   └── content/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   └── utils/
│
├── types/
├── tests/
├── docs/
└── public/
```

Prefer feature-oriented boundaries instead of creating a giant collection of generic services.

---

# 14. Initial data model

```text
users
  id
  email

teams
  id
  owner_id
  name
  short_name
  slug
  logo_url
  primary_color
  secondary_color
  city
  country

seasons
  id
  team_id
  name
  start_date
  end_date
  status

players
  id
  team_id
  first_name
  last_name
  nickname
  shirt_number
  position
  photo_url
  status

matches
  id
  team_id
  season_id
  opponent_name
  opponent_logo_url
  competition
  round
  venue
  kickoff_at
  home_away
  status
  team_score
  opponent_score
  notes

callups
  id
  match_id
  player_id
  status

match_events
  id
  match_id
  player_id
  related_player_id
  type
  minute
```

Every team-owned query must be protected by authorization/RLS. Never trust a `team_id` received from the browser without verifying ownership.

---

# 15. Business model

## Phase 0 — Pilot

Use the application with one real team.

Price:

**Free**

Goal:

- Discover workflow problems.
- Identify unused functionality.
- Measure matchday friction.
- Collect screenshots/testimonials.
- Fix bugs.

Target: at least 3 real matches managed end-to-end.

---

## Phase 1 — Founding teams

Recruit approximately 5–10 teams manually.

### Founding plan

**$199 MXN/month**

Include:

- 1 team.
- Up to 30 active players.
- Unlimited matches.
- Statistics.
- Call-ups.
- Social content templates.

Founding teams keep this price while subscribed.

The goal is learning, not maximizing revenue.

---

## Phase 2 — Public pricing hypothesis

### Free — $0

For trial/acquisition.

- 1 team.
- 15 players.
- 5 matches.
- Basic dashboard.

### Team — $399 MXN/month

Primary plan.

- 1 team.
- 40 players.
- Unlimited matches.
- Full statistics.
- Call-ups.
- Social templates.
- Crest/custom colors.

### Club — $699 MXN/month

Only introduce when demand exists.

Potential features:

- Multiple squads.
- Multiple administrators.
- Data export.
- Advanced statistics.
- Public team page.
- Sponsor support.

Do not build Club features during the MVP.

---

# 16. Unit economics target

Illustrative MRR:

| Paying teams | $399 plan | MRR |
|---:|---:|---:|
| 5 | $399 | $1,995 MXN |
| 10 | $399 | $3,990 MXN |
| 25 | $399 | $9,975 MXN |
| 50 | $399 | $19,950 MXN |
| 100 | $399 | $39,900 MXN |

The first meaningful milestone is not 100 teams.

It is:

> **Get one team that is not yours to pay for the product.**

---

# 17. Validation metrics

During beta track:

### Activation

A team is activated when it:

```text
creates team
+
adds >= 5 players
+
creates first match
```

### Core usage

Number of matches completed through the platform.

### Match workflow completion

```text
match created
→ call-up created
→ result recorded
→ events recorded
```

### Retention proxy

Team creates another match within 14 days.

### Revenue validation

At least one external team pays.

---

# 18. Four-week implementation plan

Assumption: this is a side project, not a full-time four-week sprint.

Target approximately **8–12 focused hours/week**.

---

## Week 1 — Foundation

### Goal

A user can register, create a team/season and manage players.

### Tasks

#### Project

- Initialize Next.js + TypeScript.
- Configure linting/formatting.
- Install Tailwind/shadcn.
- Establish feature structure.
- Add environment configuration.

#### Supabase

- Create project.
- Define database schema.
- Configure migrations.
- Configure authentication.
- Configure RLS.
- Configure Storage bucket for team/player images.

#### Authentication

- Registration.
- Login.
- Logout.
- Reset password.
- Protected routes.

#### Team onboarding

- Create team.
- Create initial season.
- Upload crest.
- Configure colors.

#### Players

- List.
- Add.
- Edit.
- Deactivate.

### Week 1 definition of done

```text
New account
→ creates Loros FC
→ creates Apertura 2026
→ adds complete squad
```

---

## Week 2 — Matchday workflow

### Goal

Manage everything before a match.

### Tasks

#### Matches

- Match list.
- Create match.
- Edit match.
- Match detail.
- Upcoming/completed filters.

#### Call-ups

- Select players.
- Save call-up.
- Set confirmed/declined.
- Show counts.

#### Dashboard

Implement:

- Next match.
- Recent results.
- Quick actions.

### Mobile testing

Test at minimum:

```text
375px
390px
430px
768px
desktop
```

### Week 2 definition of done

A real upcoming Loros FC match can be created and its full call-up managed from a phone.

---

## Week 3 — Results and statistics

### Goal

Complete the matchday lifecycle.

### Tasks

#### Result entry

- Team score.
- Opponent score.
- Mark completed.

#### Match events

- Goal.
- Assist.
- Yellow.
- Red.
- Optional minute.

#### Statistics queries

Team:

```text
PJ
PG
PE
PP
GF
GC
DG
```

Players:

```text
PJ
G
A
TA
TR
```

#### Leaderboards

- Goals.
- Assists.
- Appearances.

#### Content helper

Implement deterministic templates for:

- Match announcement.
- Final result.

### Week 3 definition of done

```text
Create match
→ call up squad
→ play match
→ enter result
→ record scorers
→ see statistics update
→ generate result post
```

This is the first true MVP milestone.

---

## Week 4 — Production beta

### Goal

Make it safe and usable by somebody other than the developer.

### QA

Test:

- Authentication.
- Authorization.
- RLS.
- Empty states.
- Loading states.
- Error states.
- Form validation.
- Mobile layouts.
- Duplicate submissions.
- Match editing after completion.
- Statistics correctness.

### UX polish

Improve:

- Dashboard.
- Navigation.
- Forms.
- Feedback/toasts.
- Empty states.
- Matchday flow.

### Production

- Configure production Supabase.
- Configure Vercel.
- Configure domain if desired.
- Add error monitoring.
- Add basic analytics.
- Create database backups/export strategy.

### Pilot

Run Loros FC through real match workflows.

Document every moment where you need to leave the application for something the application should reasonably handle.

### External beta

Invite 1–3 other teams.

Do not explain every screen to them. Observe where they become confused.

### Week 4 definition of done

At least:

```text
1 real team
20+ players
3 real matches
3 completed call-ups
3 recorded results
player statistics
mobile workflow tested
production deployment
1 external team invited
```

---

# 19. How to use ChatGPT Work

The project should be developed through small, reviewable tasks rather than prompts such as:

> Build the entire football manager.

Use Work as an implementation partner while retaining architectural control.

## Recommended loop

```text
Define task
    ↓
Ask Work to inspect relevant code
    ↓
Ask for implementation plan
    ↓
Review plan
    ↓
Implement
    ↓
Run tests/lint/typecheck
    ↓
Review diff
    ↓
Fix issues
    ↓
Commit
```

---

# 20. Work prompt conventions

Create one issue/task at a time.

Good prompt:

```text
Implement player creation.

Before modifying code:
1. Inspect the existing player feature and database schema.
2. Identify the files that need changes.
3. Propose a short implementation plan.

Requirements:
- firstName and lastName required
- shirtNumber optional
- position required
- status defaults to active
- validate with Zod
- ensure the authenticated user owns the team
- respect existing architecture

After implementation:
- add/update tests
- run lint
- run typecheck
- run relevant tests
- report changed files and remaining risks
```

Bad prompt:

```text
Make players work.
```

---

# 21. Suggested Work tasks

Create tasks roughly in this order:

```text
001 Bootstrap application
002 Configure Supabase
003 Database migrations
004 Authentication
005 RLS policies
006 Team onboarding
007 Season creation
008 Player CRUD
009 Match CRUD
010 Match call-ups
011 Dashboard
012 Match result entry
013 Match events
014 Team statistics
015 Player statistics
016 Leaderboards
017 Social templates
018 Mobile UX pass
019 Error/loading states
020 Security review
021 Test coverage
022 Production deployment
023 Pilot fixes
```

Avoid parallelizing tightly coupled database work until the schema is stable.

---

# 22. Testing strategy

## Unit tests

Prioritize business logic:

```text
match result → W/D/L
statistics aggregation
goal difference
player statistics
content templates
validation
```

## Integration tests

Prioritize:

```text
create player
create match
create call-up
complete match
record event
```

## E2E

Only a few critical flows are needed initially:

```text
register → team → player

match → call-up

match → result → statistics
```

The most valuable test is the complete matchday lifecycle.

---

# 23. Security requirements

Minimum requirements before external beta:

- RLS enabled on team-owned Supabase tables.
- Users cannot query another team's data.
- Server-side authorization for sensitive mutations.
- Input validation.
- File upload restrictions.
- Secrets never exposed through client code.
- No service-role key in the browser.
- Dependency/security scan before production.

Security is part of the MVP because the SaaS is multi-tenant.

---

# 24. Product principles

When choosing between features, follow these rules.

### 1. Matchday first

Features directly helping run a match outrank administrative extras.

### 2. Administrator first

Players do not need accounts in V1.

### 3. Mobile first

If the workflow is painful from a phone, it is not done.

### 4. Data before AI

Collect structured match/player data before adding sophisticated AI.

### 5. One team before one league

Solve the team problem first.

### 6. Validate before scaling

Do not build functionality because it sounds commercially useful. Build it because pilot teams demonstrate the need.

---

# 25. Post-MVP backlog

Do not implement these during the four-week build unless validation changes priorities.

## V1.1

- Public call-up confirmation link.
- WhatsApp sharing.
- Player availability.
- CSV import/export.
- Better social templates.
- Public match page.

## V1.2

- Multiple administrators.
- Sponsor management.
- Public team profile.
- Automatic match posters.
- AI-assisted social copy.
- Push/email notifications.

## V2

- Player accounts.
- Native iOS/Android applications.
- Multiple squads.
- League management.
- Standings.
- Tournament brackets.
- Subscription billing.
- Advanced analytics.
- Opponent history.
- Attendance tracking.

---

# 26. Key product risk

The biggest risk is not technical.

It is that administrators say:

> “WhatsApp and Excel already work.”

Therefore the MVP must save enough effort on every match to justify opening another application.

The strongest potential wedge is the complete workflow:

```text
Match
  ↓
Call-up
  ↓
Result
  ↓
Statistics
  ↓
Social content
```

The same data is entered once and reused everywhere.

That is the product's core value proposition.

---

# 27. First validation experiment

Use the product for three Loros FC matches.

After every match answer:

```text
What did I still do manually?

What did I duplicate in WhatsApp/social media?

What took too many taps?

What information was missing?

What feature did I never use?

Would another team administrator understand this without me?

Would I personally pay $399 MXN/month for this?
```

Then invite another administrator and watch them use it.

Do not add features while observing them. Write down the friction first.

---

# 28. MVP success criteria

After four weeks, call the MVP successful if:

- The production application works reliably on mobile.
- A complete real squad is managed in it.
- At least three real matches have gone through the workflow.
- Statistics are trustworthy.
- Another team can use it without developer assistance.
- At least one external administrator expresses willingness to pay.

The strongest validation milestone is:

> **First $199–399 MXN payment from a team unrelated to the product creator.**

---

# 29. Immediate next steps

Start the Work workspace with this document as the product source of truth.

Then execute only these first tasks:

```text
1. Create repository.
2. Bootstrap Next.js application.
3. Configure quality tooling.
4. Create Supabase development project.
5. Convert the data model in this document into SQL migrations.
6. Implement RLS before feature development.
7. Seed a realistic Loros FC development dataset.
8. Implement authentication.
9. Implement team onboarding.
10. Implement player management.
```

At the end of Week 1, review scope before proceeding to matches.

---

# 30. Initial instruction for ChatGPT Work

Use the following as the first project instruction:

```text
You are working on Matchday, a mobile-first SaaS for managing amateur football teams.

Read MVP.md completely before proposing or implementing changes.

Treat MVP.md as the product source of truth.

Engineering priorities:
1. Correctness.
2. Security and tenant isolation.
3. Simple architecture.
4. Mobile usability.
5. Testability.
6. Fast MVP iteration.

Do not implement features from the post-MVP backlog unless explicitly requested.

Before every significant implementation:
- inspect existing code,
- identify affected architecture,
- propose a concise plan,
- preserve existing conventions.

After implementation:
- run formatting,
- lint,
- TypeScript checks,
- relevant tests,
- inspect the resulting diff.

Never expose Supabase service credentials to the client.

Every team-owned resource must enforce tenant authorization.

Prefer straightforward solutions over abstractions that are not yet needed.

When requirements conflict or a decision would materially expand MVP scope, stop and explain the tradeoff before implementing it.
```

---

## Product north star

> **From “we have a match this week” to published result and updated statistics with the minimum possible administrative work.**

Everything built during the MVP should move that workflow forward.
