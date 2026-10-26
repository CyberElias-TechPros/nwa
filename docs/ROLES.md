# NaWeAgree — Masterpiece Team & Roles

A world-class launch of NaWeAgree (a trust-and-agreement product for Nigerian artisans, traders, customers, and small-business operators) needs a focused, multi-disciplinary team. The product's core promise — *"no more I thought you said…"* — sounds simple but touches identity, trust, legal safety, cultural nuance, and quiet emotional craft. Below is every role that matters, what they deliver, and how they sequence. Not every role is a full-time hire; several are specialist contributors brought in at specific milestones.

The list is split into five circles: **Foundational Product & Engineering**, **Brand & Story**, **Craft & Experience**, **Trust & Reach**, and **Ops & Long-game**. A solo founder can ship v1 with the first 5–6 roles filled by themselves or a co-founder; a masterpiece that Nigerians actually *love* opening needs nearly all of them.

---

## Circle 1 — Foundational Product & Engineering

These roles ship the thing that works. They are table stakes for launch.

| # | Role | What they deliver | Phase | Hiring spec |
|---|------|-------------------|-------|-------------|
| 1 | **Founding Product Engineer** (full-stack, web+mobile) | Next.js app, Cloudflare Workers API, DB schema, migrations, Kotlin/Compose Android app, CI/CD. Owns correctness of the version ledger, optimistic concurrency, audit log, device-auth flow. | W0–W12 | 5+ years shipping real products; comfortable in TypeScript + Kotlin; understands distributed-state invariants (append-only logs, idempotency, concurrency tokens). Pragmatic about infra. |
| 2 | **Infrastructure / Platform Engineer** | Neon Postgres, Cloudflare Workers + Queues + D1 fallback, preview deploys per PR, observability (Sentry + Logtail), secret management, cost guardrails on SMS/email, backup and restore playbooks. | W3–W6 | Deep Cloudflare Workers experience, Postgres ops (migrations, rollbacks, read replicas). Observability mindset. |
| 3 | **Senior Backend Engineer (W5+)** | Email magic-link auth, Workers Queues reminder dispatch, retry/backoff, idempotency-key store, receipt signing, webhook for future integrations (WhatsApp Business API), rate limiting that is abuse-safe not user-hostile. | W5–W8 | Strong security judgment; has built auth and async pipelines before; reads OWASP for fun. |
| 4 | **Android Engineer (Kotlin + Compose)** | Native Compose app, Room offline cache, WorkManager reminder sync, App Links, biometric lock, share-target integration, Material You theming, push via FCM. | W6–W12 | Deep Compose + Kotlin coroutines; has shipped a Play Store app; obsessive about offline behaviour and battery. |
| 5 | **QA / Test Engineer** | Contract tests across clients, E2E Playwright suite, Android instrumentation tests, device matrix (Gionee/Tecno/Infinix/Samsung A-series — the actual NG device mix), SMS/email deliverability dry runs, load test on the cron sweep. | W4+ | Writes tests that outlive them; understands West African network conditions (2G drop-offs, MTN/Glo/Airtel flakiness). |
| 6 | **Security Engineer (light, fractional)** | Threat model (device-key theft, invite-token brute force, SMS forwarding attacks), receipt integrity, CSP/CORS review, penetration test before v1 launch, responsible disclosure policy. | W6, W10, v1+ | Appsec generalist; has built passwordless auth before. |

---

## Circle 2 — Brand & Story

NaWeAgree lives or dies on *trust*. These roles build the feeling that the app is on your side before anyone has even created a plan.

| # | Role | What they deliver | Phase | Hiring spec |
|---|------|-------------------|-------|-------------|
| 7 | **Brand Designer** | Wordmark (logo), color palette, type system, iconography style, illustration tone, brand guidelines PDF, social avatar, App Store + Play Store icon, business-card-style share asset for users to screenshot. | W1–W3 | Portfolio of warm, human brand systems (not SaaS-blue). Has designed for African/Sahel markets before. Avoids "tech company" tropes. |
| 8 | **Illustrator** | Custom inline SVG illustrations: hero handshake, empty states (blank plan, waiting on other person, both agreed), error states (offline, link expired), success state, onboarding scenes. Style: slightly hand-drawn, generous line weight, local fabric patterns as accents. | W2–W4 | Distinctive voice; capable in vector; understands that illustrations must load fast on 2G. |
| 9 | **Copywriter / Voice Designer** | Every surface: landing page hero, CTA buttons, error messages ("I thought you said…" framing), onboarding, legal-plain-English rewrite, push-notification copy (friendly not shrill), App Store description, pidgin voice. | W1–v1 | English + conversational Nigerian Pidgin. Writes like someone who has haggled at Oshodi market. No MBA jargon. |
| 10 | **Nigerian Pidgin & Localisation Lead** | End-to-end `pcm` locale with real pidgin (not Google Translate pidgin); future Yoruba/Igbo/Hausa strings. Date/number/currency formatting in ₦. Sensitive to regional honorifics ("Auntie", "Oga", "Mummy"). | W3–W8 | Native speaker; has done i18n work before; understands that pidgin changes by state and picks a widely-understood baseline. |
| 11 | **Video / Motion Designer** | 15-second silent looping demo for the landing page, App Store preview video, Lottie micro-animations (receipt stamp, check-mark handshake, version-conflict wiggle). | W5–W9 | Motion that feels warm, not "tech-demo fast". Works in Lottie + GIF. |

---

## Circle 3 — Craft & Experience (the reason people *love* using it)

Functional is not enough. Masterpiece software feels inevitable, calm, and slightly joyful.

| # | Role | What they deliver | Phase | Hiring spec |
|---|------|-------------------|-------|-------------|
| 12 | **Product Designer (UX)** | Information architecture of the plan view, flow for "propose a change", version history diff reading (people hate reading diffs), empty states, first-open 3-step onboarding, receipt/acknowledgement flow. Tests with real tailors, carpenters, hairdressers, okada riders, pos vendors. | W1–W12 | Has shipped consumer products in emerging markets; sits in markets for a day before drawing a wireframe. Low-ego, high-empathy. |
| 13 | **UI / Interaction Designer** | Spacing rhythm, button press feedback, transitions between views, sheet presentations, pull-to-refresh choreography, dark mode, large-type accessibility, haptics spec for Android. | W3–W10 | Obsessive about 4dp grids; understands that 300ms lag kills trust. Motion serves meaning. |
| 14 | **Frontend Craft Engineer (React/Next + CSS)** | Implements the design system, accessibility (WCAG 2.2 AA), dark mode, reduced-motion support, CSS containment for perf on low-end phones, PWA offline shell, focus rings, screen-reader labels. | W2–W10 | Strong CSS + accessibility; doesn't reach for a component library; sweats 40kb budgets. |
| 15 | **Accessibility Specialist (fractional)** | Audit with real screen readers (TalkBack on Tecno, VoiceOver on iPhone SE), color-contrast verification, touch-target size on 5" screens, captions on video, reduced-motion media queries, keyboard-only flows. | W5, W9, pre-launch | CPWA certification experience; tests on real hardware, not just Lighthouse. |
| 16 | **Performance Engineer** | First-paint under 2s on 3G Lagos, JS bundle budget <120KB total, image placeholders, HTTP/3 hints, service worker caching, no render-blocking fonts. | W4–W9 | Knows Core Web Vitals cold; uses WebPageTest against a Lagos VM. |

---

## Circle 4 — Trust, Reach & Go-to-Market

| # | Role | What they deliver | Phase | Hiring spec |
|---|------|-------------------|-------|-------------|
| 17 | **Marketing / Growth Lead (Nigeria-first)** | Launch plan: 50 tailors in Yaba as design partners, market-segment playbook (tailors, hairdressers, carpenters, photographers, caterers, POS agents), referral mechanic within the invite flow, community seeding on Nairaland / X / TikTok / WhatsApp groups. | W4–W12 | Has launched a consumer app in Nigeria; understands "market to the market women, not just your Twitter timeline". |
| 18 | **Content / Social Manager** | X/Twitter threads of real "I thought you said" stories (anonymised), TikTok/IG reels showing the product in use, blog posts on agreements culture, FAQ content, weekly changelog. | W6–ongoing | Speaks pidgin and queens English; doesn't sound like a brand account. |
| 19 | **Customer Support / Community Lead** | In-app support flow, WhatsApp support channel, escalation playbook for disputed plans (when the two people disagree about what was agreed *even after* using the app), FAQ canon, on-call rotation. | W7–launch | Patient; embodies the product's "no blame, just clarity" value. |
| 20 | **Legal Counsel (fractional, Nigerian)** | Terms of Service under Nigerian law, Privacy Policy compliant with NDPA, dispute-mediation language (NaWeAgree is a *memory*, not a court — critical liability framing), data residency note, consumer-protection review. | W8–launch | Tech-savvy Nigerian lawyer; understands internet products, not just M&A. |
| 21 | **Partnerships / BD** | Integrations with Opay/PalmPay for payment receipts (Phase 2), MTN/Airtel USSD fallback (Phase 3), WhatsApp Business API approval, Google Play / App Store listings optimisation (ASO). | W10– | Rolodex across Nigerian fintech/telco; opens doors. |

---

## Circle 5 — Operations & Long-game

| # | Role | What they deliver | Phase | Hiring spec |
|---|------|-------------------|-------|-------------|
| 22 | **Founder / CEO** | Owns the story, user interviews 2x/week, fundraising, hiring, the hard "no" to features that break the product's soul. Sets the Monday-all-hands tone. | Always | Deeply believes *silence is not consent* and *people deserve to be on the same page*. |
| 23 | **Operations / Finance** | Cloudflare + Neon + Resend + Twilio spend forecasting, payroll, CAC/LTV by segment, Play/App Store payout reconciliation, tax. | Post-launch | Calm with spreadsheets; catches $200 SMS overages before they hit. |
| 24 | **Data / Insights Analyst** | Funnels (created → shared → claimed → acknowledged), reminder effectiveness, drop-off by device/network, disagreement-rate per category, qualitative tag-cloud from change-request comments. | W8– | Can tell a story from a SQL query; not a metrics maximalist. |
| 25 | **Privacy & Compliance Officer (fractional)** | NDPA registration, data-subject requests, retention policy (when to delete plans), breach-notification runbook, child-safety guardrails (18+). | Pre-launch | Certification or direct NDPA experience. |
| 26 | **Mediator / Trust & Safety Advisor** | When two users disagree about what was agreed — escalation path, neutral-language templates, voluntary mediation referral list in major cities. | Post-launch | Background in community mediation or consumer dispute resolution; calm under conflict. |

---

## Sequencing

- **W0–W4 (foundations, 3–4 people):** Founding P/E, Product Designer, Brand Designer, Copywriter. Ship v0 to 10 design partners.
- **W5–W8 (craft, 5–7 people):** Add Frontend Craft Engineer, Localisation Lead, QA, Illustrator, Marketing Lead. Polish, pidgin, dark mode, push, marketing site.
- **W9–W12 (trust & launch, 8–12 people):** Add Android Engineer, Accessibility Specialist (fractional), Legal Counsel (fractional), Community Lead, Security review. Launch public beta.
- **Post-launch:** Data analyst, Ops, Partnerships, Mediator advisor. Scale deliberately — adding a person only when the team is feeling the specific pain that role solves.

## Roles one person should NOT hold

- Backend Engineer + Security reviewer (self-review always misses things)
- Copywriter + Legal writer (voices are incompatible)
- Product Designer + QA (designers always miss their own blind spots)
- Marketing + Community (both will be done badly if one person owns both)
- CEO + Customer Support at scale (you will lose touch with user reality if you're always in investor meetings)

---

*The single hire that most predicts whether this becomes a masterpiece is the Product Designer who actually sits in Lagos markets with real tailors before drawing a single wireframe. NaWeAgree is a trust product for people who've been burned by verbal agreements; if the designer doesn't feel that in their bones, every other role will polish the wrong thing.*
