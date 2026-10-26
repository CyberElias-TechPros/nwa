# 06 — Excellence Audit: making NaWeAgree actually work for its audience

**Purpose:** scrutinise the plan set (docs/01–05) through every lens that determines whether NaWeAgree is *used happily in the real world* rather than merely *built correctly*. This document is a hard-nosed audit: it calls out places where my own earlier plan is wrong, under-weighted, culturally off, or incomplete, and replaces those assumptions with concrete, prioritized changes.
**Method:** step into the shoes of every role the app must serve — small-business tailor in Oshodi, market mammy in Onitsha, carpenter's apprentice, wedding planner, customer on a ₦200 data plan, low-literacy parent sending voice notes, support agent, founder who must grow and monetise — and also every discipline the plan already covers. Every claim here is tied to field reality; where I'm guessing I say so.
**Date:** 21 October 2026.
**Status:** v1.0. Items here roll into the backlog (05) under v2 scope; Blocker/Critical items must be closed before Gate 1 pilot; High items before public launch.

---

## Contents

1. [What the plan already gets right](#1-what-the-plan-already-gets-right)
2. [The single most important insight (that I under-weighted)](#2-the-single-most-important-insight-that-i-under-weighted)
3. [Audit by lens](#3-audit-by-lens)
   - 3.1 Customer psychology & social trust
   - 3.2 Provider economics and daily reality
   - 3.3 Distribution, growth, and the cold-start problem
   - 3.4 UX writing, language, and cultural register
   - 3.5 Low-literacy, voice, and accessibility beyond WCAG
   - 3.6 Local technical reality (data, devices, SIMs, network, power)
   - 3.7 Fraud, abuse, and asymmetric power
   - 3.8 Disputes and de-escalation (without adjudication)
   - 3.9 Monetization and willingness to pay
   - 3.10 AI quality for the local language context
   - 3.11 Notification tuning (the channel reality)
   - 3.12 Onboarding and the first 60 seconds
   - 3.13 Closeout and photo evidence
   - 3.14 Deposits and payment reality
   - 3.15 App-store, platform, and WhatsApp risk
   - 3.16 Legal and social realism in Nigeria
   - 3.17 Support model for the market
   - 3.18 Multi-SIM, number churn, account recovery
   - 3.19 Copy, honorifics, and tone
   - 3.20 The "paperwork objection" and how to defuse it
   - 3.21 Offline realities beyond flaky networks
   - 3.22 Calendar, reminders, and bulk provider view
   - 3.23 QR handoff for in-person meetings
   - 3.24 Apprentice/helper flows
   - 3.25 Usability for older artisans and customers
   - 3.26 Performance and size budgets (reality check)
4. [Prioritized improvement list (rolled into backlog v2)](#4-prioritized-improvement-list-rolled-into-backlog-v2)
5. [Revised pilot recruitment plan](#5-revised-pilot-recruitment-plan)
6. [Product principles I'm adding or strengthening](#6-product-principles-im-adding-or-strengthening)
7. [Open research questions I am NOT guessing at](#7-open-research-questions-i-am-not-guessing-at)

---

## 1. What the plan already gets right

Before I criticize my own work, the foundation is solid. Specifically:

- Server-authoritative state, immutable versions, and Invariant Zero (never show confirmed until the server says so) are **the** make-or-break technical property. The failure mode "app told me we agreed when we didn't" would kill trust instantly.
- AI-as-draft, AI-off path, no auto-confirm, no fabricated amounts/dates are non-negotiable and correctly gated.
- No public ratings or verification badges at launch is correct; these have poisoned other marketplaces and are easy to game.
- Minimal data, no chat, no payments in MVP is the right scope for the core loop.
- Separate clients with shared contracts and fixtures (rather than shared UI) is the right choice for long-term reliability.
- The plan card image/PDF is the single most important growth artifact and I'm glad I added it.
- Phone-OTP primary, redacted invite, data-classification, append-only audit are all correct.

The audit below is about the *last mile* where products like this actually win or die.

---

## 2. The single most important insight (that I under-weighted)

> **The customer is almost never the one who installs first.** The *provider* is the power user; the customer is the invitee.

This changes almost every default.

- The app's "home" is the provider's queue of active jobs. The customer opens the app **once per job** (the link they got in WhatsApp) and is mostly a responder.
- The onboarding that matters most is the **invite landing experience for a customer who just tapped a link while mid-chat**. If that page feels like work, scammy, or asks them to sign up before showing value, the product dies.
- The plan card image isn't just a "nice to share" — it is the **surface the customer first encounters**. The card must be self-contained, reassuring, and require zero install to understand.
- The provider must be able to create a job in **under 90 seconds** while the customer is still standing in their shop or while they're on a call. Voice input is not a nice-to-have; it is the primary input method for many providers.
- Notification channels must match the customer: they live in WhatsApp, not email. Push works for the provider who has the app installed.

If you remember only one thing from this audit, remember this: **build first for the artisan with five jobs in progress, a phone in one hand, a measuring tape in the other, and a customer WhatsApp thread open.** Everything else serves that person.

---

## 3. Audit by lens

### 3.1 Customer psychology & social trust (Critical)

What people in this market actually worry about:

1. **"If I bring this app up, it looks like I don't trust them."** This is the #1 social objection. A customer asking a tailor to "sign something" can be read as an insult to their integrity.
   - **Fix:** Lead copy must position the app as *shared memory*, not *protection*. Phrasing like *"So we both remember what we agreed"*, not *"To protect you"* or *"So they can't cheat you"*. It must feel like a help to both sides.
   - **Fix:** The first thing the inviter sees after creating a job is an *invitations preview* with suggested message copy to send in WhatsApp. Something like: *"Sister Amaka, I just put what we discussed here so we both don't forget — make you check am small. No wahala if anything no clear."* The user doesn't have to invent the wording; wording is the hardest part.
   - **Fix:** The plan card says *"We both reviewed this plan"*, not *"You agreed to this contract"*. It is a shared artifact, not one person imposing on the other.

2. **"The tailor/carpenter will be offended if I record everything."**
   - **Fix:** Default framing: *"This helps them too — customers forget what they asked for and start blaming them."* Actually, that's true — half of disputes are customers changing their mind and denying it. The app helps the provider defend their work too. Show this in onboarding.
   - **Fix:** The card and the app should visibly show *equal footing*. Both names, both avatars, no "customer / provider" labels that imply hierarchy — use **"You"** and **"Seun (the tailor)"** or role labels chosen by each person.

3. **"What happens in front of my family / spouse?"** Women customers in particular may be pressured to show job details to others; private drafts must be truly private and PIN-protectable (already partially designed — make this explicit and default-on for jobs with addresses/phone fields).

4. **Trust transfer:** people trust what other people they know use. Testimonials at launch must feel real — same ethnicity, same trade, same city as the viewer. Stock-photo corporate imagery destroys trust.

**Action:** rewrite the entire marketing and invite copy through this lens. Add the pre-composed WhatsApp message as a product feature (S-IMSG-01, Critical).

---

### 3.2 Provider economics and daily reality (Critical)

The typical Lagos tailor, carpenter, or printer:

- Runs 3–10 jobs in parallel; can't remember who asked for what.
- Often has an apprentice taking measurements/deliveries.
- Spends 60%+ of time on WhatsApp, answering the same questions: *"Is my dress ready?"*, *"When will you come?"*, *"How much again?"*
- Takes deposits in cash/transfer; has people pay balance on delivery.
- Works from a shop that may not always have NEPA power; phone is their main computer.
- May be semi-literate; definitely can read Pidgin and can listen to voice notes.
- Switches SIMs, uses cheap data, may uninstall apps to free space.

Implications:

1. **Provider queue view is the home screen.** Needs: jobs grouped by status, *"Due this week"*, *"Waiting on them"*, *"Waiting on me"*, *"Done this week"*. A flat list of jobs is insufficient.
2. **Quick responses.** When a customer asks "is my dress ready?", the provider should be able to tap the job and send a 1-tap status update (with a pre-composed message) rather than typing.
3. **"Copy update to WhatsApp" button** on every status change. If the provider wants to reassure the customer manually, they can copy a one-liner like *"Sister, the dress is ready for pickup"* directly into their chat. This bridges the gap between the app and the world where people actually communicate.
4. **Repeat customers.** Many jobs come from the same customer. After a completed job, offer "Start a new job with Amaka" — one tap. This is the cheapest growth.
5. **Bulk reminder before market day / weekend.** For event/catering/tailoring, most deadlines cluster. A provider-friendly "this week's schedule" view with a calendar is more useful than a flat list.
6. **Deposits are part of every job.** Even though we don't do payments, the brief MUST have a neutral *"Deposit paid / not yet paid / amount"* field with *"Recorded by Seun; not verified by NaWeAgree"*. 70% of real disputes are about deposits.
7. **Material-supplied-by** matters for tailoring, carpentry, printing. *"Customer is bringing fabric / thread / paper"* or *"Provider will buy it (cost included/extra)"* is a core field.
8. **Photos of work-in-progress** (optional) reduce "you never started!" panic. One photo a day with a caption is enough.
9. **Provider business identity.** Allow an optional business name, a workshop photo (not a face), and a short bio ("Seun has been sewing for 12 years"). No public ratings. This just helps the customer recognize who they're dealing with.

**Action:** add a Provider Queue epic; add deposit field; add WIP photo; add "copy update to WhatsApp"; add "start another job with this person".

---

### 3.3 Distribution, growth, and the cold-start problem (Critical)

NaWeAgree is chicken-and-egg: the second party has to join. Without a plan here the app doesn't spread.

**Viral loops that actually work in this market:**

1. **The plan card IS the marketing.** Every acknowledged version produces a shareable image with a small, unobtrusive footer: *"Made with NaWeAgree — so we both remember"* and a link. Cards are sent in WhatsApp to friends, family, group chats. This is the primary acquisition channel.
   - **Important:** do not add this footer to the MVP pilot without asking. Wait until users say they'd be proud to share it. A premature "sent from" tag feels like marketing and gets screenshotted around.

2. **"Forward this card to the person doing your work."** After a customer creates a plan (for something not yet started), prompt them to forward the card to the other person — a tiny "invite them" CTA that doesn't require the other person to have the app to see the card.

3. **Provider community distribution, not ads.** Artisan clusters are concentrated: tailors in Oshodi/Lagos Island/Aba; carpenters in Orile; printers in Surulere; caterers in event clusters. Recruit 5–10 influential masters in a cluster; their apprentices and peers copy what they do.

4. **Cooperation with markets/business associations.** Tailors' associations, event planners' groups, wedding vendors directories are the real distribution nodes. A "provider captain" program (early users who invite 10 other providers) with non-monetary recognition.

5. **WhatsApp Status/Story content is real distribution.** When a satisfied customer posts the finished dress alongside the plan card screenshot, that's organic reach. Design the plan card to look *good* when shared (square, legible at small size, high contrast).

6. **Avoid paid ads at first.** CAC for utility apps in Nigeria via Instagram/Facebook is high and users acquired via ads have low retention. Invest in provider-led acquisition first.

**Action:** design the plan card for Status/Story share-ability (square crop version, 1080×1080). Add a "forward to person doing the work" nudge. Build the provider captain program into pilot recruitment (§5).

---

### 3.4 UX writing, language, and cultural register (Critical)

My earlier plan uses words like "acknowledge", "version", "mutually acknowledged", "change request", "brief". These are correct internally but terrible for user-facing copy.

| Replace | With (en-NG) | With (Pidgin) |
|---|---|---|
| Acknowledge / Review version | "I have seen and I agree" | "I see am, I agree" |
| Mutually acknowledged | "You both agree on version 3" | "Una don agree for version 3" |
| Brief | "The plan" | "Wetin we agree" |
| Change request | "Something wey change" / "Change for the plan" | "Change" |
| Version | "Plan as of 21 Oct" / "Version 3" | "Version 3" (keep the number, simple) |
| Participant | Not user-facing | — |
| Template | "Kind of work" | "Work type" |
| Closeout / Completion | "Work don finish?" / "Mark as done" | "Work don finish?" |
| Pause | "Hold am for now" | "Pause" |
| Cancel | "Cancel the work" | "Cancel" |
| Needs clarification | "Some things still no clear" | "Wetin no clear" |
| Field | Not user-facing; use section labels ("Price", "When", "Material") | |
| Draft | "Only you dey see am" | "Only you dey see am" |

Naming principles:

- **Prefer sentences over labels.** A button that says *"Yes, I agree with version 3"* is better than *"Acknowledge"*.
- **Always name the version.** Never *"Confirm"* without naming what's being confirmed.
- **"We"** language, not **"the app"** language. *"We'll keep both of you up to date"* beats *"NaWeAgree will notify the other party"*.
- **No shame copy.** *"You no fill some things"* beats *"Incomplete form — 3 errors"*.
- **Honorifics:** learn the user's preferred form of address ("Sister Amaka", "Oga Seun", "Aunty Nkechi", "Mallam Musa") and use it. Offer quick chips for these during invite, not a free-form "nickname" field. Honorifics vary across ethnic groups; offer region-common options plus a custom field.
- **"No wahala"** is good Pidgin but don't overdo it — it can sound dismissive in serious situations (e.g., a cancelled wedding job). Switch register with tone.
- **Never write in all caps for emphasis.** It reads as shouting in every Nigerian language context.
- **Avoid "tap here" / "click here"** — use action verbs: *"Send am"*, *"Check the plan"*.
- **Sensory, concrete language.** "The tailor go use ankara wey you bring" beats "Customer-provided fabric (ankara)".

**Pidgin reality check:** Nigerian Pidgin is not a single language. Lagos Pidgin is different from Warri Pidgin. Yoruba and Hausa speakers use Pidgin with different substrate. For launch, pick a widely-understood "general Nigerian Pidgin" register, vetted by native speakers from at least 3 regions, and mark it as *"Naija Pidgin"* rather than implying one universal variant. Add a note in the settings that more variants are coming.

**The most important copy in the whole product** is the 3-line message a provider sends when inviting a customer. Pre-compose it, let them edit it, and test 5 variants in the pilot.

---

### 3.5 Low-literacy, voice, and accessibility beyond WCAG (High)

WCAG checkboxes don't make an app usable for a semi-literate 55-year-old tailor in Ibadan.

1. **Voice notes are primary.** The "add details" screen should have a big, obvious microphone button front-and-center, not hidden under a menu. Transcription (when AI is enabled) is a bonus; even without transcription, the voice note is a valuable input artifact that can be replayed.
2. **Read-aloud must be first class.** The plan summary should auto-play in TTS on first open (if the user opts in), or have a very obvious play button at the top. TTS must pronounce amounts correctly ("eighty thousand naira" not "eight zero thousand").
3. **Iconography must be locally recognizable.** A checkmark is fine but must be accompanied by a short word. Use photos/examples for categories: a small photo of a dress, a chair, a plate of food, a printed card, not abstract line icons.
4. **Number input must respect local conventions.** Thousands separators, Naira sign in the right place (₦80,000 not 80,000₦), and *"k"* shorthand (80k) must parse.
5. **Avoid dense forms.** Maximum 3 things per screen. A long form on mobile is a killer. Use progressive disclosure: title → one big "what are we doing?" voice field → then details, invited person, timing, price on separate steps.
6. **"I no sabi book" mode.** Offer an explicit mode (not labelled that way — label it *"Read am to me"*) that makes everything larger, replaces text forms with voice, and simplifies to 3 buttons: "Record", "Show plan", "Send". This is accessibility, not a dumbed-down mode.
7. **Cognitive accessibility.** Avoid modals stacked on modals. Every screen has one clear primary action. Secondary actions (pause, cancel, delete) are at the bottom under a "More" menu to avoid accidental taps.

**Action:** promote voice-notes and TTS to first-class P0 for MVP (web: where supported; Android: always). Add progressive-disclosure forms. Add voice-first mode.

---

### 3.6 Local technical reality (data, devices, SIMs, network, power) (High)

Concrete realities the plan must respond to:

1. **Data is bought in small bundles (₦100–₦500).** Users turn data on/off to save money. The app must be *radically* data-light. Text-only jobs should use < 10 KB per sync. Images should default to thumbnails only on mobile data. The "data saver" mode must aggressively suppress preloading, and must be auto-enabled when the OS reports a metered network, not just opt-in.
2. **2G/3G fallback is still common in many areas.** The app must be usable at EDGE speeds: every screen must render text and actions before images load; no critical action is blocked by an image failing.
3. **Power cuts are frequent and long (sometimes hours).** The app must save every keystroke (already planned), but more: users expect to open the app after power returns and see exactly what they had. Periodic explicit "Saved" indicator is reassuring, not noisy.
4. **Multiple SIMs / numbers.** A user may call from one line and have WhatsApp on another. Allow **multiple verified contact handles per account** (a primary phone and an alternate, plus optional email). When inviting, ask which number the other person uses for WhatsApp. When signing in, send the OTP to whichever number is being used that session, but still bind to the same account.
5. **WhatsApp in-app browser is hostile.** Many users open links from WhatsApp inside its built-in browser, which has restricted storage and blocks popups. Detect this aggressively and show a persistent banner: *"Open in Chrome / Safari for full experience"* with a deep-link to open in external browser. Also ensure the read-only plan card renders fully in the in-app browser (read-only rendering must not require IndexedDB or service worker).
6. **Chinese OEM battery killers.** Xiaomi, Tecno, Infinix, Gionee, Itel, and some Samsung models aggressively kill background services and FCM. The plan mentions this but must do more:
   - Provide a one-tap "fix notifications" screen with OEM-specific instructions (like Discord/WhatsApp do).
   - Detect when FCM delivery fails and fall back to SMS/WhatsApp templates.
   - Prompt on third missed notification in a week to add the app to the battery whitelist.
7. **App uninstall pressure.** Storage is tight on 16 GB / 32 GB phones. The app must be ≤ 8 MB download for Android and must clear caches automatically (already planned; set a hard cap of 50 MB total storage at all times).
8. **Time:** Nigeria uses WAT (UTC+1) year-round, no DST. Dates/times should default to WAT when rendering for Nigerian users.
9. **Cash / transfers don't change the plan.** People use bank transfers, cash, Opay/PalmPay/Moniepoint. Don't attempt to verify; just record what people say.

**Action:** add multiple contact handles per account; tighten data budgets; add read-only rendering path for in-app browsers; add OEM battery "fix notifications" screen; auto-detect metered networks.

---

### 3.7 Fraud, abuse, and asymmetric power (High)

Beyond generic threat modeling, field-realistic attack patterns:

1. **Fake "provider" romance/scam variant.** A scammer invites a victim to "agree" on a job (e.g. custom goods) to create false legitimacy before asking for payment.
   - Mitigation: do not call the plan an "agreement" or "verified" (already correct). Add a persistent educational note on the invite preview: *"NaWeAgree does not verify people. Pay only in ways you normally would."*
   - Surface job age and history count (with consent): *"Seun has used NaWeAgree for 3 other jobs."* This is not a rating; it's tenure signal. No green checkmark.

2. **Coercion / domestic pressure.** A partner or family member pressures someone to "agree" to something (e.g., pay for something they didn't order, hand over money).
   - Mitigation: a subtle, hidden-in-plain-sight safety link in settings ("I'm being pressured") that points to safety resources + lets them privately withdraw or delete without a notification going to the other person immediately. This is a serious abuse case. Don't build silent auto-withdrawal, but provide a delayed, safe escape.
   - Never send "X withdrew their agreement" push notifications instantly when a user marks themselves unsafe; delay and let the user decide how/when to communicate.

3. **Staged screenshots.** People will screenshot the plan at one moment and claim that was the final version. The visible fingerprint + version number + "last updated" line makes this harder. Don't claim forensic proof; the timestamp on the app is more reliable than a screenshot.

4. **Fake invite links / phishing.** Invite links must always land on a naweagree.app domain with EV cert. Never use link shorteners for invites. The invite preview must show the domain clearly. App-authored messages must explicitly tell users: *"NaWeAgree will never ask you for OTP or bank details inside chat."*

5. **Revenge / harassment.** If a job is cancelled, a participant must be able to block further invites from someone they don't want to hear from. Blocking is job-scoped first; persistent blocks after two reports.

6. **Minor / child labor risk.** Tailors and carpenters sometimes use apprentices who are minors. Don't facilitate this; terms of service must require users to be adults arranging their own work; apprentices can be observers (helper role) with guardian-level consent only if that's needed. For MVP, helpers are 18+.

7. **Fraudulent change proposals.** If one party rapidly proposes and accepts changes as both sides (by controlling two accounts), detect patterns: two accounts created from same device, same IP, immediately mutual-ack. Flag silently for manual review; don't block, just don't use those jobs in trust signals.

**Action:** add anti-impersonation education on invite preview, add a private safety/pressure-escape path, add block and report, add tenure signal with consent, add device/IP co-occurrence detection.

---

### 3.8 Disputes and de-escalation (without adjudication) (High)

The plan correctly says no dispute adjudication. But *something* must happen when people disagree, otherwise they leave the app and never return.

1. **Disagreement is not failure.** Build a *"We don't agree"* flow that is explicit and non-blaming:
   - State clearly that both sides see the same version.
   - Show the specific field(s) they disagree on, side-by-side.
   - Offer three neutral options: (a) talk more in person/on a call, (b) invite a third person they both trust to see the plan (read-only observer), (c) close the job as not-completed and keep the record.
   - Do not offer to "decide" or take sides.
2. **Escalation path.** For users who ask "who is right", direct them to a human-written help page with Nigerian-relevant resources (e.g., small-claims process in their state, consumer protection contact), and offer to connect them to a community mediator (partner program, v2).
3. **Tone during disagreement.** Copy must cool temperature: *"No wahala, sometimes people see things differently. Here's what we have so far."* No "you rejected their change" — *"You said no to this change."* Use "I" statements where possible.
4. **Evidence pack.** The app can produce a neutral timeline ("who said what when") that a user can show a third party or authority. Make it printable, shareable as PDF, and visibly watermarked *"Record from NaWeAgree — not a legal document"*.
5. **Cooling-off period.** If both sides have exchanged rejection/conflict twice on the same field, suggest a 24-hour pause with a gentle reminder. Don't block activity.

**Action:** add the explicit "We don't agree" flow (three neutral options, no adjudication). Add printable evidence pack. Add help pages with Nigeria-specific resources.

---

### 3.9 Monetization and willingness to pay (Medium)

The plan defers pricing. Realistic hypotheses to test in pilot:

1. **Provider pays, customer free.** The provider gets the organizational value (queue, reminders, memory aid). The customer doesn't install enough to justify a subscription.
   - Hypothesis: ₦500/month (or ~₦50/job) is a tolerable price for an active provider once they've completed 3 jobs. Cheaper than a notebook, cheaper than missed deadlines.
2. **Pay-per-job is better than subscription for informal providers** who don't like recurring fees.
   - Test: after 3 free jobs, offer *"₦100 per job for unlimited changes and reminder"* versus *"₦500/month unlimited"*.
3. **Do not charge the customer.** They will not pay; they already pay the provider. Charging them creates incentives the wrong way.
4. **Never take a cut of the job price.** That pushes us into payments/marketplace/escrow territory we explicitly deferred.
5. **Free tier must be genuinely useful.** 3 active jobs at a time, forever, is enough to prove value without being crippling.
6. **Wait until the provider says they'd pay.** Do not add paywalls before pilot evidence. Measure provider NPS after 3 jobs, then ask.
7. **Potential future premium features** to test (not MVP): sending WhatsApp Business reminders automatically, branded plan cards with business logo, weekly summary PDF for their records, calendar export.

**Action:** add a willingness-to-pay interview to pilot protocol; design product such that a provider paywall can be added post-pilot without breaking invariants; do not build payments in MVP.

---

### 3.10 AI quality for the local language context (High)

The AI evaluation gate in the plan is necessary but insufficient. Specific local-linguistic risks:

1. **Nigerian-accented speech recognition** is mediocre on generic STT models. Idiosyncratic pronunciations ("eightty tori-sand" = ₦30k), code-switching (English-Yoruba-Pidgin), market noise, quiet fans/generators in the background will dominate.
   - Mitigation: build the evaluation corpus heavily from consented Nigerian voices; do not enable STT until it works on real phones in real shops.
   - Fall back gracefully: "We couldn't hear that clearly, you can type or try again" is better than wrong transcription.
2. **Pidgin extraction must be tested on real pidgin, not just Google Translate.** "I go pay you 50k when you bring am" should extract price 50,000 (currency inferred from context as NGN, marked as estimate), timing "on delivery". Generic LLMs do this unreliably.
3. **Currency ambiguity is common.** People say "80k" and mean NGN, but sometimes USD, GBP, or even Ghana cedi if in border areas. When currency can't be confirmed, *ask*; never assume NGN from locale.
4. **Relative dates.** "Next week Tuesday", "after Sallah", "before December", "market day" have specific meanings in context. These must remain in raw form; never normalize to a date. Add a clarifying question suggesting a calendar date.
5. **Names.** People go by multiple names (traditional, English, nicknames, "Mama Chinedu"). The AI should not assume which name corresponds to which participant.
6. **Vendor hosting.** Keep AI processing in-region where possible; EU processing is OK but must comply with NDPA transfer safeguards.

**Action:** recruit diverse local speakers for the evaluation corpus; expand the AI evaluation criteria to cover local date/slang/number parsing; explicitly block currency inference without confirmation.

---

### 3.11 Notification tuning — the channel reality (Critical)

Reality check on channels:

- **WhatsApp** is where people live. If we can send a WhatsApp Business template message, it will be read. But WhatsApp Business API is regulated and expensive; misuse gets the number banned. Use it for *invites only* in MVP (customer taps a link to join).
- **Push (FCM)** is reliable on Pixel/Samsung and flaky on cheap OEMs. Use for provider-side reminders where the app is installed.
- **SMS** is seen as expensive, sometimes scammy, and often filtered. Use sparingly for invite and first mutual acknowledgment only (already planned).
- **Email is mostly ignored.** Treat as secondary / paper trail. Good for receipts/exports but not real-time coordination.
- **In-app is reliable** but only when the app is opened. Combine with push.
- **"Copy to WhatsApp" button** is the most important "notification" channel because it's the user sending their own message in the existing conversation. It's free, high-trust, and the recipient is already there.

Order of channels for different events (revised):

| Event | First | Second | Third |
|---|---|---|---|
| Invite | WhatsApp share (user-sends) or SMS | In-app to inviter | — |
| Draft shared for review | Push | In-app | Email |
| First mutual ack | Push | In-app (both) | SMS (optional) |
| Change proposed | Push | In-app | Email |
| Reminder (24h, no response) | Push | Email | — |
| Security event | Email | SMS | Push |

Crucially: **build the "copy update to WhatsApp" button for every status change.** It is the highest-converting channel and it's free.

---

### 3.12 Onboarding and the first 60 seconds (Critical)

The existing plan describes screens but not the emotional arc.

**Provider first open:**

1. **Splash (1s).** Wordmark + tagline *"So you and your customer both remember"*.
2. **Show, don't tell.** A 3-screen animated example (15 seconds total):
   - Screen A: "Seun is sewing a dress for Amaka" — WhatsApp screenshot of messy convo.
   - Screen B: "They put the plan in NaWeAgree" — clean plan card.
   - Screen C: "When something changed, they saw am clearly" — diff screen.
3. **Ask for phone number.** No email yet. Explain why: *"So your customer can know it's you"*. OTP.
4. **Immediately offer to start a job** (or open a pending invite). Do not take people to a settings screen.
5. **Name/business name** collected when they create their first job, not before.

**Customer opening invite link (in WhatsApp in-app browser):**

1. Render the **plan card** immediately (read-only), in the in-app browser, without requiring login. Show: inviter name (if provided), job kind, date, redacted price if any.
2. One line under the card: *"Seun wants you both to see the same plan. Open the full plan to talk or make changes."*
3. Two buttons: **"See full plan"** (verifies via OTP) and **"Copy a screenshot"** (gives them a static image without any account creation — so even if they never sign up, they have the record).
4. Do not ask for email, password, business details, or anything else before they can see what they're agreeing to.

This invite landing experience is the single most important screen in the product. It must load in < 2 seconds on 3G, render as static HTML (not JS-only), and never show a blank spinner.

**Action:** server-render the invite preview as static HTML with the plan card; offer a static screenshot download without sign-up; build the 3-screen show-don't-tell onboarding for providers.

---

### 3.13 Closeout and photo evidence (High)

The existing closeout is too thin. For the categories we care about (tailoring, carpentry, repairs, printing, events), "done" is meaningless without a look.

1. **"Show work done" step.** When someone marks delivery, prompt (don't require) for 1–3 photos. Store them in the job, visible to both sides.
2. **"Before and after" view** for repair jobs is powerful.
3. **Both sides can add photos**, not just the provider. A customer can upload a photo showing the issue / defect.
4. **No quality judgment by the app.** Photos are evidence, not "proof of good work".
5. **"Needs follow-up"** must allow a photo + one-line note (e.g., "sleeve too tight").
6. **Photo compression is aggressive** on mobile data (1080px long edge, WebP 70 quality); full-quality optional on Wi-Fi.

**Action:** add photo step to closeout (optional but default-prompted); add "needs follow-up" with photo; add before/after for repairs.

---

### 3.14 Deposits and payment reality (High)

Even without payments, the plan must acknowledge reality:

1. Add a neutral **"Money"** group in the brief:
   - Total price (already planned).
   - Deposit amount and whether it has been paid (yes / no / partial), as recorded by each party.
   - Balance expected on delivery.
   - Who is buying materials (customer/provider), and if materials are paid separately.
2. **No verification of payment.** Always label: *"As recorded by [person]; not confirmed by NaWeAgree."*
3. If the two sides record different deposit amounts, that is a **conflict** and should surface immediately, before it becomes a dispute later. This is actually one of the highest-value moments in the app — catching a misunderstanding early.
4. **Never** integrate with bank APIs, Opay, or escrow in MVP. If payments come later they're a separate product.

**Action:** add deposit/material fields as P0; treat mismatched deposit amounts as a conflict.

---

### 3.15 App-store, platform, and WhatsApp risk (Medium)

1. **WhatsApp link blocking.** WhatsApp sometimes blocks domains that are heavily shared or look spammy. Mitigations:
   - The primary "invite" artifact is the plan card image, not a link — images are shared freely.
   - The invite link domain is `naweagree.app` (short, clean, brandable).
   - Avoid tracking parameters or redirect chains.
   - If blocked, the app should detect and offer to generate a QR code / numeric invite code that the customer can manually enter.
2. **Play Store policy risks.**
   - We do not process payments; declare that clearly in the data-safety form.
   - We do not verify user identity; do not claim to.
   - We do not target children.
   - SMS Retriever API (not READ_SMS) is the only SMS permission path.
   - Be cautious with the safety/anti-coercion feature (§3.7.2); position it as privacy/account control, not as a domestic-violence resource (Play has special policies for that).
3. **App store reviews sometimes reject apps that look "too simple"** or seem to serve only one geography. Position as a global "shared plans" app with Nigeria as the first market; the content is category-based (tailor/print/repair) not country-specific.

---

### 3.16 Legal and social realism in Nigeria (Medium)

- Most informal transactions are not legally enforceable and neither party expects them to be. The value is *social memory*, not legal. This matches the README's existing "not a contract" stance.
- Small-claims courts exist (e.g., Lagos Multi-Door Courthouse, Small Claims Court in some states) but are under-used. Linking to them in the "we disagree" help page is useful; do not over-promise.
- Consumer protection: FCCPC (Federal Competition and Consumer Protection Commission) exists. Provide contact information as a resource, not as a threat.
- NDPA (Nigeria Data Protection Act 2023) compliance is required. The plan's privacy workstream must be reviewed by local counsel, not just generic GDPR counsel.
- In the north (Hausa-speaking), gender dynamics and conservative norms affect copy and imagery. Use gender-neutral language where possible; avoid photos of women on marketing screens unless diverse.
- Respect religious holidays: work does not happen on Sundays in many communities (church), on Friday for Muslims, and during major holidays (Sallah, Christmas, Easter). Do not send reminder notifications on these days to users in those regions; default reminder windows respect 9am–6pm Monday-Saturday, with Friday 1–3pm quiet for Jummah.
- Don't be afraid of a bit of humor, but test it — "No wahala" is funny in Lagos but can feel rude in a serious dispute.

---

### 3.17 Support model for the market (Medium)

- **In-app support reports alone will not be enough.** Many users will want to **talk to someone on the phone**, especially at first.
- Pilot phase: publish a WhatsApp support number (not a phone line, but WhatsApp Business) where users can message the team. This is high-trust and local.
- Use WhatsApp support messages to inform copy and UX improvements — they are research, not just support.
- FAQs should be short, voice-noted or video-recorded in Pidgin as well as written.
- Do not attempt 24/7 support at launch; publish hours (e.g., "Mon–Sat 9am–6pm WAT") with an auto-reply.
- Macros should exist for the top 5 issues (link not opening, "they didn't get the message", "I no longer want this job", "I typed the wrong price", "I changed my number").

---

### 3.18 Multi-SIM, number churn, and account recovery (Medium)

- People change numbers frequently (stolen phone, new network promo, multiple SIMs). A strict one-number-per-account model will lock users out.
- Allow **up to two verified phone numbers** per account plus one optional email. Login can be via any verified contact.
- If a user has a new number but still has their old session, they can add the new number and deprecate the old one (with OTP on both).
- **Recovery path for lost phone/number:** offer a 12-word recovery phrase at sign-up (shown once, optional, skippable). Do not force it; many users will screenshot it. Combined with email, this handles most cases. Do NOT use security questions; they're socially attackable.
- A user can also be re-invited to a job by the other participant using their new number, and jobs will merge if both numbers are verified on the same account.

---

### 3.19 Copy, honorifics, and tone (Medium)

Add to the copy rules (from §3.4):

- Default honorific prompt in invite flow: "What do you call [other person]?" with chips: "Sister / Aunty / Broda / Oga / Madam / Mallam / Mummy / Daddy / Pastor / Alhaja / Other" — plus a free-form short field.
- Greet users using their honorific + chosen first name ("Sister Amaka") on their home screen and on the plan card.
- Avoid "dear", "valued customer", corporate register. Use the familiar register Nigerians use with each other: *"Sister Amaka, Seun change the date to Nov 4."*
- Don't mix formal English with Pidgin inside the same sentence; toggle the whole interface per locale choice, not per-sentence.

---

### 3.20 The paperwork objection — and how to defuse it (High)

The word "plan" is still a bit formal. Consider using the word **"list"** or **"note"** in early onboarding: *"Put wetin una agree for one note"*. The word "plan" can be used in formal screens (version names, exports). The Pidgin "wetin una agree" is probably the most honest phrasing.

Reinforce in every screen:
- You can mark anything as "not decided yet".
- You don't have to type; speak it.
- You can still change things later; that's the whole point.
- Nothing here is a legal contract (link to the plain-language note).

Also: show that other trades use it, not just tailors — the moment a carpenter thinks it's "for tailors", they'll leave.

---

### 3.21 Offline realities beyond flaky networks (Medium)

- **In-shop / no-smartphone counterparty scenario.** A provider may be standing next to a customer whose phone is a small Nokia or is not a smartphone. Offer: (a) a QR code on the provider's phone that the customer scans with their camera (if they have a smartphone) or (b) a printed/hand-token: a 6-character code they can give the customer to enter later on naweagree.app/c plus a paper-printed plan card. This is a v2 feature but design the code space for it now.
- **Post-NEPA-startup reliability.** The app must survive being killed mid-edit by power loss. Already partially designed; add a scenario to the chaos test suite where the app is killed mid-acknowledgement after a power cut and restarted.
- **Bluetooth / local handoff** could be interesting (two people standing next to each other, one without internet) but defer to v2.

---

### 3.22 Calendar, reminders, and bulk provider view (Medium)

- Providers need a **week view** of upcoming due dates. Add a simple calendar tab (not MVP priority, but design the data model for it).
- One-tap "Mark as started" and "Mark as done" from the list view (don't require opening the job).
- Reminders are gentle: "Aunty Nkechi's dress is due in 2 days" — sent the morning of (9am WAT), not at midnight.
- For customers: one reminder 2 days before their due date ("Your dress with Seun is due on Saturday" — neutral, not nagging).

---

### 3.23 QR handoff for in-person meetings (Low, design for now)

- On the invite screen, in addition to share link, show a QR code that links to the invite preview. Useful when customer is standing in the shop.
- QR opens the same plan card page as the link; no separate flow.
- Reserve a short link/space (`naweagree.app/q/XXXX`) in the routing scheme from day one.

---

### 3.24 Apprentice/helper flows (Medium)

The helper role exists in the plan but needs a specific use case:

- Apprentices typically deliver, take measurements, or send updates. The helper role should:
  - See the shared plan.
  - Be able to add photos ("I am at the delivery address").
  - Be able to mark their own delivery report.
  - **Not** acknowledge versions on anyone's behalf.
  - **Not** see private drafts or other-party contact info unless the owner explicitly allows it.
- The helper is invited by a participant and labelled in the timeline: *"Posted by Chidi, Seun's apprentice"*.
- This is the first step toward multi-party without over-building.

---

### 3.25 Usability for older artisans and customers (Medium)

- An explicit "large text" toggle that doesn't rely solely on system settings (some users don't know where system font size is).
- Tap targets ≥ 48 dp on Android and ≥ 44 CSS px on web — already planned; enforce it via lint rules.
- Avoid swipe-to-delete or gesture-only actions (swipe is hard for older users with motor issues). Buttons for destructive actions.
- On first launch of the Android app, offer a "make it bigger" quick setting with 3 options (standard / big / very big).
- Always provide haptic feedback for primary actions (acknowledge, publish) so users know something happened.

---

### 3.26 Performance and size budgets — reality check (Medium)

- Web initial JS < 150 KB (not 180 KB) to be usable on 2G.
- Android download ≤ 6 MB (not 8 MB) for the base install; push this aggressively.
- Cold start on 2 GB Android device target < 2.5 s (not 3 s).
- Plan card image must render in < 1 second on 3G.
- No video on marketing pages (data-expensive). GIFs are also heavy; use still illustrations.
- Use vector drawables; avoid bitmap assets where possible.
- Fonts: ship a single variable-weight sans (e.g. Inter or similar) or fall back to system font entirely to save size. Default to system sans on Android to avoid shipping a font.

---

## 4. Prioritized improvement list (rolled into backlog v2)

Status labels:
- **🔴 Blocker / Launch (Gate 1 private pilot):** must be done before any real users touch the product.
- **🟠 Public Launch:** must be done before public launch.
- **🟡 v1.1 (post-pilot):** do after pilot evidence.
- **🟢 v2+:** later.

| ID | Improvement | Priority | Estimate (pd) |
|---|---|---|---|
| V2-01 | Rewrite all user-facing copy per the plain-language/honorific rules; remove words like "acknowledge", "brief", "mutually agreed" in favor of sentences | 🔴 | BE 1, Web 4, An 4 |
| V2-02 | Pre-composed WhatsApp invitation message (editable, 5 variants to test) shown right after invite creation | 🔴 | BE 1, Web 2, An 1 |
| V2-03 | Server-rendered static invite preview with plan card, no JS required, renders in WhatsApp in-app browser; offer static screenshot download without sign-up | 🔴 | BE 3, Web 4 |
| V2-04 | Add "Money" field group: deposit (amount, paid/partial/no), balance, who buys materials; mismatched deposit = conflict | 🔴 | BE 3, Web 2, An 2 |
| V2-05 | Big, obvious microphone button as primary input on Add Details (web where supported, Android always); voice notes persist as artifacts; transcription is optional | 🔴 | Web 2, An 4 |
| V2-06 | Copy-to-WhatsApp button on every status change with pre-composed 1-line message | 🔴 | Web 2, An 2 |
| V2-07 | Provider home: segmented list "Waiting on me" / "Waiting on them" / "Due this week" / "Done" (replaces flat list) | 🔴 | BE 1, Web 3, An 3 |
| V2-08 | Read-aloud TTS of the plan summary, obvious play button, amount pronunciation correct | 🟠 | Web 2, An 3 |
| V2-09 | Photo step on closeout (prompt 1–3 photos), both sides can add, "needs follow-up" with photo, before/after for repairs | 🟠 | BE 3, Web 4, An 5 |
| V2-10 | "We don't agree" flow: side-by-side conflict view, 3 neutral options (talk, invite trusted observer, close job), printable evidence pack, Nigeria-specific help pages | 🟠 | BE 4, Web 4, An 4 |
| V2-11 | Multiple verified contact handles per account (2 phones + email) and OTP-on-current-channel for sign-in | 🟠 | BE 4, Web 2, An 2 |
| V2-12 | Anti-pressure safety path in settings: hidden safety link, delayed withdrawal, local resources; no instant notification of withdrawal when marked unsafe | 🟠 | BE 2, Web 2, An 2 |
| V2-13 | Anti-impersonation copy on invite preview ("NaWeAgree does not verify people. Pay in the way you normally would.") + tenure signal with consent | 🟠 | BE 2, Web 1, An 1 |
| V2-14 | Auto-detect metered network and enable data-saver by default; aggressive image lazy load; hard cap of 10 KB for text-only syncs | 🟠 | BE 1, Web 2, An 2 |
| V2-15 | OEM battery-killer "fix notifications" screen with per-OEM instructions | 🟠 | — , An 3 |
| V2-16 | Account recovery: 12-word optional recovery phrase at sign-up; device-tested flows for SIM swap | 🟠 | BE 3, Web 1, An 1 |
| V2-17 | Pidgin copy vetted by native speakers from 3 regions; honorific chips during invite | 🟠 | Content 3, Web 1, An 1 |
| V2-18 | Helper/apprentice role with limited capabilities (photos, delivery, no acks); labelled in timeline | 🟠 | BE 3, Web 2, An 2 |
| V2-19 | Square plan-card variant for WhatsApp Status/Instagram Stories share (1080×1080) | 🟠 | Web 2, An 1 |
| V2-20 | 3-screen show-don't-tell onboarding (Seun/Amaka example), zero forms before value | 🟠 | Web 3, An 3 |
| V2-21 | Voice-first / "read it to me" accessibility mode (larger text, fewer buttons, voice input by default) | 🟠 | Web 2, An 3 |
| V2-22 | Block and report per participant; per-job then persistent after two reports | 🟠 | BE 2, Web 1, An 1 |
| V2-23 | Chaos test: app killed mid-acknowledgement after power cut; queue recovery verified | 🔴 | QA 2 |
| V2-24 | In-app-browser detection + "open in Chrome" banner; read-only plan rendering works without SW/IndexedDB | 🔴 | Web 2 |
| V2-25 | Quiet hours respect religious/region defaults (Friday lunch, Sunday, holidays) | 🟡 | BE 1, Web 1, An 1 |
| V2-26 | Business identity (business name, workshop photo) on provider profile; optional, no ratings | 🟡 | BE 1, Web 2, An 2 |
| V2-27 | "Start another job with this person" one-tap after completion | 🟡 | Web 1, An 1 |
| V2-28 | WIP photo uploads (optional, 1 per day) during in-progress state | 🟡 | BE 2, Web 2, An 2 |
| V2-29 | QR code invite on invite screen (in-person handoff) | 🟡 | BE 1, Web 1, An 2 |
| V2-30 | Calendar week view for providers | 🟡 | BE 1, Web 3, An 3 |
| V2-31 | WhatsApp Business support number during pilot; macros; pilot-only SLA | 🟠 | Ops 3 (non-code) |
| V2-32 | Willingness-to-pay interview embedded in pilot protocol; paywall design stub (no payment code yet) | 🟡 | Product 2 (non-code) |
| V2-33 | Localized AI evaluation corpus: ≥ 500 consented samples across accents, pidgin variants, noisy environments | 🟠 | AI 5 |
| V2-34 | Size/perf tightening: < 150 KB web JS, < 6 MB Android download, < 2.5s cold start | 🟠 | Web 2, An 3 |
| V2-35 | Quick "make it bigger" size setting on first Android launch (standard/big/very big) | 🟡 | An 1 |
| V2-36 | 6-character invite codes + `/c/:code` route for future offline/paper handoff (just routing + generation for now) | 🟡 | BE 1 |
| V2-37 | Plan-card "Made with NaWeAgree" footer present ONLY after users say they'd be proud to share it (pilot-tested, not pre-launch) | 🟢 | Web 1, An 1 |

**Total added v2 work: ~190 pd** across BE/Web/An/QA/Content/Ops. This pushes web hardened pilot from W14 to W16 and Android closed testing from W18 to W20 if done all at once — but many items (V2-19, V2-25, V2-29, V2-36) are v1.1 and after. See revised milestones in §5 below.

---

## 5. Revised pilot recruitment plan

Recruiting 30–50 jobs with random users won't produce useful signal. We need:

**Pilot wave 1 (weeks 1–2 of pilot): Friendly 10**
- 5 experienced providers we know personally (a tailor, a carpenter, a printer, a small caterer, a photographer) who will give brutally honest feedback.
- Each uses the app with one real customer they have scheduled.
- Weekly in-person/WhatsApp interviews with the provider; survey the customer after the job.
- Goal: find showstopper UX issues, not prove traction.

**Pilot wave 2 (weeks 3–5): Cluster 30**
- Recruit three clusters: one tailor cluster (Oshodi or Yaba), one carpenter cluster (Orile/Agege), one other category based on wave-1 signal.
- Partner with 2 "captains" per cluster (respected masters); ask each to invite 2 other providers and use it for 2 real jobs each.
- Offer non-monetary thank-you (airtime ₦1,000 per completed job, capped). This is not payment for reviews; it offsets data costs.
- In-person onboarding visit by team for each captain.
- Goal: measure invite conversion, mutual-ack rate, and change-request rate in real conditions.

**Pilot wave 3 (weeks 6–8): Organic 50+**
- Soft-launch to the captains' networks without active recruitment.
- Measure organic invite trees (who invites whom).
- Decide go/pivot/iterate.

**Recruitment criteria matter:**
- At least 30% of customers must be women (many small-service transactions are woman-initiated).
- At least 20% of users must be over 45 (older artisans/customers).
- At least 10 jobs on a 2GB RAM Android device (we should loan a couple of test devices if needed to gather baseline perf data).
- At least 5 jobs where the counterparty has not installed the app (to test the plan card + static screenshot path).

---

## 6. Product principles I'm adding or strengthening

In addition to the twelve product invariants from the README and the 10-point robustness playbook from doc 04, add:

1. **The counterparty is always one tap from leaving.** Every screen, every notification, every message must answer "why should they bother?" — because the cost of them ignoring it is zero.
2. **Voice before typing; image before form; card before app.** If something can be shown as an image first, or spoken instead of typed, prefer that.
3. **Never blame.** Copy never says "you forgot", "you didn't", "error" for user actions. "We didn't catch that", "This still needs a decision", "No wahala".
4. **Memory before contract.** The product is shared memory. Anything that sounds legal, authoritative, or punishing erodes trust.
5. **Provider is the hero, customer is the guest.** Build for the person who uses it every day; make the one-time visitor feel welcome without forcing them into power-user flows.
6. **Copy must sound like a sensible Nigerian person talking.** Read every line out loud in Pidgin. If it sounds like a bank, rewrite it.
7. **Every screen has one primary action.** If you can't say what the single main thing to do is, the screen is wrong.
8. **The plan card is the product surface that lives outside the app.** It must be beautiful, legible on a small phone screen at arm's length, screenshot-able, and Status-share-able.
9. **Honorifics matter.** People are not email addresses; they are Sister Amaka, Oga Seun, Aunty Nkechi.
10. **Trust cannot be claimed.** Earn it through consistency, legible copy, and real examples.
11. **When in doubt, make it smaller, slower (in animation, not loading), quieter.** The app must feel calm, not buzzy.
12. **Offline is not an edge case; it is the default condition for many minutes of many days.** Design every flow as if the connection might drop in the middle.

---

## 7. Open research questions I am NOT guessing at

Several things cannot be decided from the armchair. These must be answered in the first week of user research (discovery already planned in the README, amplified here):

1. **What is the right price point** and who pays (provider/customer/both)? → answer via 5 pricing interviews in wave 1.
2. **WhatsApp Business API as a channel:** how do users react to a business-account message versus a user-sent invite? Do recipients read it or ignore it?
3. **Pidgin register:** which Pidgin variant is most widely understood and least "offensive" (not Warri-specific, not Lagos-too-hip)?
4. **How often do counterparties actually share devices** vs. have their own? (Affects privacy controls.)
5. **What are the top 3 reasons providers give for *not* inviting a customer to use the app after trying it once?**
6. **Does the plan-card footer ("Made with NaWeAgree") help or hurt share-ability?** A/B test with 50/50 of pilot users.
7. **Do people actually want reminders, or do reminders feel like pressure?** Test 3 cadences (2-day, 1-day, none).
8. **What percentage of users enable app lock / biometrics by default?**
9. **Does voice-first input increase job creation rate?** Test with the microphone button as primary vs. secondary in wave 2.
10. **How much work begins before the plan is mutually acknowledged?** (This affects the `work_started_without_ack` feature.)
11. **How many users uninstall after first use vs. after 3 jobs?** What are their stated reasons?
12. **Do customers trust the app more or less after seeing a photo?** (Photos can reduce anxiety but can also show poor quality prematurely.)

---

## Summary: what changes now vs. later

If I had to cut this to the absolute minimum to add before the private pilot (Gate 1):

1. Copy rewrite (V2-01) — one day of content review but it changes everything.
2. Pre-composed WhatsApp message (V2-02).
3. Server-rendered invite preview + static screenshot (V2-03).
4. Deposit fields with mismatch-as-conflict (V2-04).
5. Voice-note input primary on Add Details (V2-05).
6. Copy-to-WhatsApp on status changes (V2-06).
7. Provider-segmented home (V2-07).
8. In-app browser detection + read-only path (V2-24).
9. Power-cut/queue chaos test (V2-23).

These 9 items probably add ~20–25 person-days net (a bit over a sprint) and dramatically increase the odds the pilot produces real signal instead of revealing that nobody sent a single invite because the onboarding felt wrong.

The remaining items (photo closeout, we-don't-agree flow, multi-contact handles, safety path, data saver, OEM notifications, TTS, pidgin quality, helper role, etc.) are public-launch gates.

Keep the existing 18 decisions and backlog; layer these v2 items on top. The technical foundation (invariants, sync, auth, immutability) needs no architectural change to accommodate these improvements — that's how I know the foundation is solid.
