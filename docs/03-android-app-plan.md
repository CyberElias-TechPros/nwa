# 03 — Android Application Plan (Kotlin + Jetpack Compose Native)

**Scope:** native Android client for NaWeAgree, including background sync, reliable push, camera/voice capture, low-end device support, and Play Store release.
**Companion:** `01-master-app-plan.md` (domain, API, sync, security), `02-web-app-plan.md` (parity source).
**Status:** Delivery baseline v1.0 · 21 October 2026.

---

## Contents

1. [Why native Android (and why not a wrapper)](#1-why-native-android-and-why-not-a-wrapper)
2. [Objectives](#2-objectives)
3. [Supported devices and OS versions](#3-supported-devices-and-os-versions)
4. [Tech stack](#4-tech-stack)
5. [High-level architecture](#5-high-level-architecture)
6. [Module and package layout](#6-module-and-package-layout)
7. [Domain layer](#7-domain-layer)
8. [Data layer (Room + Retrofit)](#8-data-layer-room--retrofit)
9. [Offline sync engine (WorkManager)](#9-offline-sync-engine-workmanager)
10. [UI architecture (Compose + MVVM)](#10-ui-architecture-compose--mvvm)
11. [Navigation](#11-navigation)
12. [Screens and feature breakdown](#12-screens-and-feature-breakdown)
13. [Theming, design tokens, and components](#13-theming-design-tokens-and-components)
14. [Authentication and keystore security](#14-authentication-and-keystore-security)
15. [Camera, voice, and media capture](#15-camera-voice-and-media-capture)
16. [Receiving shared content (ACTION_SEND intents)](#16-receiving-shared-content-action_send-intents)
17. [Notifications (FCM)](#17-notifications-fcm)
18. [Accessibility](#18-accessibility)
19. [Internationalization and local formatting](#19-internationalization-and-local-formatting)
20. [Performance, memory, and battery](#20-performance-memory-and-battery)
21. [Security and privacy specifics for Android](#21-security-and-privacy-specifics-for-android)
22. [Analytics and crash reporting](#22-analytics-and-crash-reporting)
23. [Testing strategy](#23-testing-strategy)
24. [Build, CI/CD, signing, Play release](#24-build-cicd-signing-play-release)
25. [Observability and operations](#25-observability-and-operations)
26. [Sprint plan with exit criteria](#26-sprint-plan-with-exit-criteria)
27. [Definition of done](#27-definition-of-done)
28. [Android-specific risks](#28-android-specific-risks)

---

## 1. Why native Android (and why not a wrapper)

The README plans a PWA. PWAs are good for first touch but have real gaps for Android-first users in West Africa:

| Concern | PWA | Native Android (Compose) |
|---|---|---|
| Background sync | Service workers get evicted, no reliable queue; Chrome OEM restrictions vary | WorkManager works across reboots/Doze with backoff and constraints |
| Offline queue durability | IndexedDB is vulnerable to storage eviction on low-memory devices | Room DB in app-private storage; not cleaned by "clear cache" |
| Push reliability | Web Push broken on many OEM browsers and Chinese OEM forks of Android | FCM is the reliable path for all Tier-1 OEMs |
| Camera/voice | `getUserMedia` limits bitrate, no first-party compression, permission prompts differ | CameraX + MediaRecorder gives reliable capture, compression, and playback |
| Share intents | Web Share Target works only in Chromium, no multi-file or binary control | `ACTION_SEND` and `ACTION_SEND_MULTIPLE` work everywhere |
| Low-end performance | JS bridge overhead; GC pauses on 2 GB RAM | Baseline profiles, ahead-of-time compile, efficient Compose recomposition |
| App-store trust | No listing, no reviews, install friction on some devices | Play listing, Family Link management, auto-updates, data-safety disclosure |
| Encryption | No platform-backed encrypted store across all browsers | EncryptedSharedPreferences + Keystore + biometric app lock |

**Recommendation:** build a proper Kotlin/Compose app. If a Play listing is required before native is ready, ship a Trusted Web Activity (TWA) wrapper in 2 weeks and replace it at native launch (the data model is identical since both use the same API).

React Native and Flutter were considered and rejected:

- **React Native:** adds JS bridge overhead; the web team already uses React but offline/sync and media reliability still require native modules; the team gains no maintenance saving.
- **Flutter:** strong performance, but our design tokens and i18n already flow to CSS/Kotlin cleanly; adding Dart doubles languages and toolchains; camera/maps and platform integration in Flutter lag Kotlin.
- **TWA as final product:** only acceptable as a short-term bridge; long-term it gives up all the reliability and security advantages of native.

Native also lets us support **Android Go** and older devices (Android 8) where custom-work customers are concentrated.

---

## 2. Objectives

1. The app is **installable from the Play Store in under 10 MB (AAB download)**, works on Android 8+, and survives reboots, power cuts, and flaky networks without losing an unsent acknowledgement.
2. It matches the web on core P0 capabilities (jobs, versions, acks, changes, questions, closeout) and **exceeds web on media, voice, background sync, and notifications**.
3. It can receive WhatsApp-shared text and images, turn them into a draft, and queue uploads when the device returns to Wi-Fi.
4. Notification payloads contain no sensitive content; the app fetches details only after unlock.
5. The app is accessible by screen readers (TalkBack), works at large text sizes, and respects battery-saver/do-not-disturb.
6. Crash-free sessions ≥ 99.5% at launch; cold start p90 < 3 s on a 2 GB RAM reference device.

---

## 3. Supported devices and OS versions

| Tier | OS | Devices | Support |
|---|---|---|---|
| 1 | Android 10+ (API 29–35) | Mid-tier and current (4 GB+ RAM, ARM64) | Full features, push, voice, camera, biometric lock |
| 2 | Android 8/8.1/9 (API 26–28) | Low-end / Go-class (1–3 GB RAM) | All P0 features, no biometric lock fallback to PIN, reduced animation, data saver default |
| 3 | Android < 8 | — | Not supported; Play will exclude |

Reference devices for QA:

- Tecno Spark Go / itel P-series (Android Go 1 GB/2 GB) — baseline cold start
- Infinix Hot / Redmi A-series (2–3 GB RAM)
- Samsung A-series (Android 13+, 4–6 GB)
- Google Pixel 6+ (vanilla Android, latest OS)
- Gionee / older Nokia with OEM battery optimisations (push reliability test)

### 3.1 Network conditions to test against

- 2G (GPRS): 50 kbps, 2 s RTT
- 3G Fast (HSPA): 1.5 Mbps, 150 ms RTT
- 4G LTE: variable, high bandwidth, burst loss
- Network flapping (on/off every 30 s, common with power-saving)
- Wi-Fi captive portal (need login)
- Data-saver / data-usage-warning modes

---

## 4. Tech stack

| Concern | Choice | Reason |
|---|---|---|
| Language | **Kotlin 2.x** (coroutines, serialisation, `kotlinx.datetime`) | Modern, stable, Jetpack-native |
| UI | **Jetpack Compose BOM** (Material3) | Productive for a new app; accessible; future-proof |
| Architecture | Clean architecture + MVVM; **UseCase** interactor layer | Testable, separated concerns |
| Asynchrony | **Kotlin Coroutines + Flow** | Idiomatic; works with Room and WorkManager |
| Navigation | **Compose Navigation** with typed routes (sealed classes) | Type-safe, deep-link friendly |
| Local DB | **Room 2.6+** (FTS optional later) | Offline source of truth, migrations, observable queries |
| Preferences | **DataStore** (encrypted via Jetpack Security) instead of SharedPreferences | Coroutine API, no ANRs, encrypted |
| Network | **Retrofit 2 + OkHttp 4**, kotlinx.serialization or Moshi | Standard, testable |
| Offline work | **WorkManager 2.9** (periodic/one-time workers, network constraints) | Survives reboots, respects Doze |
| Auth | **AppAuth-Android** (OAuth PKCE); passkeys via **Credential Manager**; biometric via **BiometricPrompt** | Recommended by Google, secure |
| Push | **Firebase Cloud Messaging** (data messages only) | Reliable, free tier |
| Camera | **CameraX** | Preview, capture, compression |
| Media | **ExoPlayer** for audio; **MediaRecorder** for voice notes; **Coil** for images | Standard |
| DI | **Hilt** (Dagger) | Compose + Worker integration, minimal boilerplate |
| Logging | **Timber** (debug) + **Firebase Crashlytics** (prod) + OpenTelemetry via OTLP exporter | PII scrubbing in `beforeSend` |
| Testing | JUnit5, **Turbine** for Flow, **MockK**, **Robolectric**, **Compose Test**, **Maestro** (manual/UAT) | Full pyramid |
| CI/CD | **Gradle Kotlin DSL**, GitHub Actions, Firebase App Distribution for internal builds | |
| Build config | Version catalog (`libs.versions.toml`), flavor dimensions: `env` (dev/staging/prod) | |

**Explicit rejections:**

- Kotlin Synthetic views, `findViewById`, XML-first screens.
- Realm, ObjectBox (vendor lock-in; Room is adequate).
- RxJava (coroutines suffice).
- Dagger 2 without Hilt (too much boilerplate).
- Pushy/OneSignal (they add SDKs that collect data; FCM is fine for MVP).
- SQLiteOpenHelper directly (Room handles migrations).
- WebView-based screens except for the privacy policy (static HTML).

---

## 5. High-level architecture

```text
UI layer (Compose screens + ViewModels)
  └─ Domain layer (UseCases + domain models + interfaces; no Android deps)
       └─ Data layer
            ├─ Remote: Retrofit API client + FCM + auth client
            ├─ Local: Room DB + DataStore prefs + file cache
            ├─ Sync: WorkManager workers (Push, Pull, SendCommand, MediaUpload, Export)
            └─ Repositories (remote/local coordination, conflict resolution)
```

Key rules:

- The **server is authoritative**. ViewModels read from Room, not from the network directly.
- Mutations produce a `Command` in the outbox; WorkManager drains. The UI is never the truth.
- No Android framework types (`Context`, `Uri`) enter the domain layer.
- Time: inject a `Clock`; never `System.currentTimeMillis()`; use `kotlinx.datetime.Instant` in the domain and `LocalDateTime` only at render.
- Sensitive data is never logged. Timber plants a redactor in release.

### 5.1 Flows of data

**Read:** Server push (FCM data message) → Pull Worker fetches `since=<jobSeq>` for affected jobs → upsert Room → Compose UI updates via Flow.

**Write:** User action → ViewModel validates → UseCase writes a `CommandEntity` to Room (status=queued) → enqueues SendCommandWorker → worker runs with retries and idempotency key → on success, upsert resulting aggregate and mark command done; on conflict, mark `needs_user` and surface via Flow.

**Cold start:** open DB → observe session → if authenticated, run Immediate PullWorker for "needs action" jobs → render jobs list; then full sync.

---

## 6. Module and package layout

Single Gradle module in MVP (multi-module adds complexity early). Split into feature packages under `app/src/main/kotlin/com/naweagree/nwa/`.

```text
app/src/main/kotlin/com/naweagree/nwa/
├─ NwaApp.kt                       # Hilt application
├─ di/                             # Hilt modules (Api, Db, Sync, Clock)
├─ core/
│  ├─ ui/          # Compose theme, tokens, primitives, reusable components
│  ├─ navigation/  # NavGraph, sealed routes, deep links
│  ├─ network/     # Retrofit, interceptors, auth, retry, idempotency
│  ├─ db/          # Room database, DAOs, converters, migrations
│  ├─ sync/        # Command, OutboxRepository, ConflictResolver, workers
│  ├─ security/    # Keystore, encrypted prefs, biometric, secure storage
│  ├─ media/       # CameraX wrapper, voice recorder, compression, upload intent
│  ├─ notify/      # FCM service, notification channels, deep-link builder
│  ├─ util/        # formatters, PII redactor, clock, dispatchers, result
│  └─ logging/     # Timber tree, Crashlytics bridge
├─ feature/
│  ├─ auth/        # sign-in, OTP, passkeys, sessions, app lock
│  ├─ jobs/        # list, create, overview, closeout
│  ├─ brief/       # editor, field states, template renderer
│  ├─ version/     # version view, acknowledgement, timeline
│  ├─ change/      # list, diff, response
│  ├─ question/    # compose/response, list
│  ├─ history/     # timeline, export
│  ├─ people/      # participants, invites, share card
│  ├─ files/       # attachments, voice notes, upload status
│  ├─ settings/    # profile, notifications, AI opt-out, privacy, language
│  └─ share/       # ACTION_SEND intake, inbox
└─ data/
   ├─ api/         # Retrofit interfaces, DTOs, error mapping
   ├─ local/       # Room entities, DAOs
   ├─ repo/        # repositories implementing domain interfaces
   └─ model/       # shared DTO mapping
```

Resources:

- `values/tokens.xml` generated from the design-tokens package (colours, type scale, radii, spacing).
- `values/strings.xml` generated from ICU catalogues (`en-NG`, `pcm`), never hand-edited.
- Drawables are vector-only where possible to keep APK size down.

### 6.2 Gradle flavors

```kotlin
flavorDimensions += "env"
productFlavors {
    create("dev") { applicationIdSuffix = ".dev"; resValue("string", "app_name", "NaWeAgree Dev") }
    create("staging") { applicationIdSuffix = ".staging"; resValue("string", "app_name", "NaWeAgree Staging") }
    create("prod") { resValue("string", "app_name", "NaWeAgree") }
}
buildTypes {
    getByName("debug") { isDebuggable = true }
    getByName("release") { isMinifyEnabled = true; isShrinkResources = true; proguardFiles(...) }
}
```

Separate FCM projects per environment. Dev and staging use separate app IDs so they can coexist on a device.

---

## 7. Domain layer

### 7.1 Models

Mirror the API contract but stay Kotlin-idiomatic and avoid leaking `@Serializable` or Room annotations. Example:

```kotlin
data class Job(
    val id: JobId,
    val title: String,
    val categoryKey: String,
    val templateVersion: String?,
    val status: JobStatus,
    val currentVersionId: VersionId?,
    val jobSeq: Long,
    val creatorParticipantId: ParticipantId?,
    val currencyCode: CurrencyCode?,
    val policy: JobPolicy,
    val participants: List<Participant>,
    val updatedAt: Instant,
)

data class JobVersion(
    val id: VersionId,
    val jobId: JobId,
    val number: Int,
    val parentVersionId: VersionId?,
    val authorParticipantId: ParticipantId?,
    val schemaVersion: String,
    val templateVersion: String,
    val fields: List<BriefField>,
    val contentDigest: String,
    val prevDigest: String?,
    val reason: String?,
    val status: VersionStatus,
    val acknowledgements: List<Acknowledgement>,
    val createdAt: Instant,
)
```

### 7.2 Use cases (stateless, single-responsibility)

Example list (not exhaustive): `SignInWithOtp`, `VerifyOtp`, `RefreshSession`, `ListJobs`, `GetJobAggregate`, `SaveDraftField`, `PublishVersion`, `AcknowledgeVersion`, `WithdrawAcknowledgement`, `ProposeChange`, `RespondToChange`, `AskQuestion`, `ReportCloseout`, `InviteParticipant`, `UploadAttachment`, `RequestExtraction`, `ExportJob`, `SubmitPrivacyRequest`, `EnqueueCommand`, `DrainOutbox`, `ResolveConflict`, `GetPlanCardPdf`.

Every UseCase returns a `Result<T>` (inline value class) carrying either a typed value or a `DomainError` (mapped from API codes and local rules). UseCases are injected into ViewModels and unit-tested with fake repos.

### 7.3 Domain invariants

Mirrors exactly what the server enforces: immutable versions, acknowledgement binding, idempotency, no silent consent, manual path. The client must enforce these in validation but never trust itself — the server always has the final say.

---

## 8. Data layer (Room + Retrofit)

### 8.1 Room schema

Entities (stored per-user DB or single DB with `userId` scope):

- `JobEntity` (mirror of jobs table summary fields, `userId`)
- `ParticipantEntity` (with `jobId`, `userId`)
- `VersionEntity` (snapshotted JSON in `contentJson`, `contentDigest`, `schemaVersion`)
- `AcknowledgementEntity`
- `ChangeRequestEntity`, `ChangeResponseEntity`
- `QuestionEntity`, `QuestionResponseEntity`
- `AttachmentEntity` (localUri, remoteObjectKey, uploadState)
- `ActivityEventEntity` (capped per job at 200, append-only)
- `DraftEntity` (per job/participant: fields JSON, `rev`, `updatedAt`, `dirty`)
- `CommandEntity` (the outbox; commandId PK, type, payload JSON, baseVersionId, attempts, state, error)
- `NotificationEntity` (in-app centre, capped 100)
- `SyncMetadataEntity` (`lastJobSeq` per job, `lastFcmToken`, `lastSyncAt`)

### 8.2 Converters and types

- Type converters for `Instant`, `CurrencyCode`, enums, and JSON blobs (kotlinx.serialization).
- IDs are value classes (`@JvmInline`) to prevent mixing them up; Retrofit serialises them as strings.
- Database version starts at 1; migrations are written explicitly (no `fallbackToDestructiveMigration` in production).
- Use `@Relation` for common aggregates (job + currentVersion + participants); keep heavy joins off the main thread.

### 8.3 Retrofit API

```kotlin
interface NwaApi {
    @POST("v1/auth/otp/start") suspend fun startOtp(@Body body: StartOtpRequest): Response<Unit>
    @POST("v1/auth/otp/verify") suspend fun verifyOtp(@Body body: VerifyOtpRequest): Response<TokenPair>
    @POST("v1/auth/refresh") suspend fun refresh(@Body body: RefreshRequest): Response<TokenPair>
    @POST("v1/auth/logout") suspend fun logout(): Response<Unit>
    @GET("v1/me") suspend fun me(): UserDto
    @GET("v1/jobs") suspend fun listJobs(@Query("cursor") cursor: String?, @Query("status") status: String?): Page<JobSummaryDto>
    @GET("v1/jobs/{id}") suspend fun getJob(@Path("id") id: String, @Header("If-None-Match") etag: String?): Response<JobAggregateDto>
    @GET("v1/jobs/{id}") suspend fun getJobDelta(@Path("id") id: String, @Query("since") seq: Long): JobDeltaDto
    @PUT("v1/jobs/{id}/draft") suspend fun putDraft(@Path("id") id: String, @Header("If-Match") rev: String?, @Body body: DraftDto): DraftDto
    @POST("v1/jobs/{id}/versions") suspend fun publishVersion(@Path("id") id: String, @Header("If-Match") seq: Long, @Header("Idempotency-Key") idem: String, @Body body: PublishVersionDto): VersionDto
    @POST("v1/jobs/{id}/versions/{vid}/acknowledgements") suspend fun acknowledge(@Path("id") id: String, @Path("vid") vid: String, @Header("Idempotency-Key") idem: String, @Body body: AckDto): AckDto
    @POST("v1/jobs/{id}/change-requests") suspend fun proposeChange(@Path("id") id: String, @Header("If-Match") seq: Long, @Header("Idempotency-Key") idem: String, @Body body: ChangeDto): ChangeRequestDto
    @POST("v1/change-requests/{cid}/responses") suspend fun respondChange(@Path("cid") cid: String, @Header("Idempotency-Key") idem: String, @Body body: ChangeResponseDto): ChangeRequestDto
    @POST("v1/jobs/{id}/attachments/upload-intent") suspend fun uploadIntent(@Path("id") id: String, @Body body: UploadIntentDto): UploadIntentResponse
    @POST("v1/attachments/{aid}/complete") suspend fun completeUpload(@Path("aid") aid: String): AttachmentDto
    @GET("v1/attachments/{aid}/url") suspend fun getAttachmentUrl(@Path("aid") aid: String): SignedUrlDto
    @GET("v1/jobs/{id}/export") suspend fun export(@Path("id") id: String, @Query("format") format: String): ExportJobDto
}
```

### 8.4 Interceptors

- `AuthInterceptor`: attaches `Authorization: Bearer <accessToken>` from the token store; refreshes on 401 with a single-flight mutex (no refresh stampede).
- `IdempotencyInterceptor`: reuses caller-supplied key for POSTs; generates one for mutations when missing.
- `RequestIdInterceptor`: UUID per request, propagated as `X-Request-Id` and stored for errors.
- `ErrorInterceptor`: maps HTTP + body to `DomainError` using the shared error-code enum.
- `ConnectivityInterceptor`: fails fast without network to let WorkManager schedule a retry.
- `UserAgentInterceptor`: `NaWeAgree/<appVersion> Android/<apiLevel> (model; locale)`.

### 8.5 Repositories

Each repository exposes a cold Flow of the latest observable state plus suspend functions for mutations (which write to the outbox). Example contract:

```kotlin
interface JobRepository {
    fun observeJobs(filter: JobFilter): Flow<PagingData<JobSummary>>
    fun observeJob(id: JobId): Flow<JobAggregate?>
    suspend fun refreshJob(id: JobId, reason: RefreshReason): Result<Unit>
    suspend fun refreshAll(): Result<Unit>
}
interface DraftRepository {
    fun observeDraft(jobId: JobId): Flow<Draft>
    suspend fun saveField(jobId: JobId, field: BriefField): Result<Unit> // outbox
    suspend fun publish(jobId: JobId, reason: String?): Result<VersionId>
}
interface AckRepository {
    suspend fun acknowledge(jobId: JobId, versionId: VersionId, action: AckAction, comment: String?): Result<Unit>
}
```

Paging uses Android Paging 3 with `RemoteMediator` that pulls from the server on scroll boundary and caches to Room.

---

## 9. Offline sync engine (WorkManager)

The offline engine is the same protocol as the web (§9 of `01`), but implemented on WorkManager for reliability.

### 9.1 Workers

| Worker | Trigger | Constraints | Backoff | Notes |
|---|---|---|---|---|
| `BootstrapSyncWorker` | App startup, FCM message | Network | Exponential 1 m → 1 h | Pulls `needs_action` jobs first |
| `PullJobWorker` | User opens job, FCM ping, periodic (6 h) | Network | Exponential | Delta since `jobSeq` |
| `SendCommandWorker` | Command enqueued | Network, battery not critical | Exponential, 5 retries | Idempotent per commandId; respects ordering |
| `MediaUploadWorker` | Attachment complete | Wi-Fi optional, charging optional | Exponential | Resumable via multipart + offset |
| `AttachmentDownloadWorker` | User taps to view | Network | Linear | 5-min signed URLs; file cache LRU |
| `ExportWorker` | User requests export | Network | Linear | Build PDF/PNG server-side, cache result |
| `TokenRefreshWorker` | Before any worker runs | Network | 3 retries | Single-flight refresh |
| `PeriodicCleanupWorker` | Daily | None | n/a | Purge expired drafts, evict old cache |

### 9.2 Command ordering and conflicts

- Commands are processed in `createdAt` order within a job; a failure halts later commands for that job.
- `SendCommandWorker` opens a per-job mutex (`withLock("job:$jobId")`) to avoid ordering inversions.
- On `409 VERSION_CONFLICT` / `409 VERSION_SUPERSEDED`, the worker writes `state=needs_user`, attaches server `details`, and notifies the user (tap opens the resolve screen).
- `ack.write` against a superseded version is **dropped** (per the invariant rule), and a notification explains: "The plan changed since you reviewed it — please check version 4."
- `version.publish` conflict keeps the user's draft in a `conflict` field copy and offers "Publish on top of latest" (with diff) or "Discard my changes".
- A local "Save to file" recovery option stores the queued commands as a JSON file in the app's cache so a user can preserve work in the rare case of reinstall or DB corruption.

### 9.3 Persistence guarantees

- WorkManager uses Room under the hood; commands survive reboot and app kill.
- Work policies: `ExistingWorkPolicy.APPEND_OR_REPLACE` for per-job chains; `KEEP` for unique periodic workers.
- Network type `CONNECTED` for background sync; `NOT_REQUIRED` for cleanup; `UNMETERED` for media upload when data-saver is on.
- Queue UI: a top-level "Sending" chip with a tap-through sheet showing per-command status and actions (Retry / Cancel / View).
- Queue expiry: commands older than 7 days require explicit user reconfirmation before sending.

### 9.4 Foreground service

On Android 12+, long-running uploads (> 10 MB or > 30 s) use a foreground service with an ongoing notification ("Uploading 2 of 3 items…") and a cancel action. No silent uploads of media when the app is backgrounded beyond the WorkManager flex window.

---

## 10. UI architecture (Compose + MVVM)

### 10.1 MVVM per screen

- `Screen` composable: pure UI, takes state and callbacks, no coroutines/Flow directly.
- `ViewModel` (Hilt-injected): owns a `StateFlow<UiState>` for the screen and exposes one-shot events via `Channel<UiEvent>` (navigate, toast, open dialog).
- State classes are sealed: `Loading`, `Content`, `Error`, `Empty`, `NeedsUser`.
- The ViewModel calls UseCases, which write commands and collect Room flows; it maps Room data to UI models (strings formatted for the locale at this layer, not in the repository).

### 10.2 Example

```kotlin
data class JobOverviewUiState(
    val job: JobUi,
    val currentVersion: VersionUi,
    val ackChecklist: List<AckRow>,
    val nextAction: NextActionUi?,
    val sync: SyncState,
    val pendingChanges: Int,
    val openQuestions: Int,
)

@HiltViewModel
class JobOverviewViewModel @Inject constructor(
    savedState: SavedStateHandle,
    observeJob: ObserveJobUseCase,
    private val acknowledge: AcknowledgeVersionUseCase,
    private val refresh: RefreshJobUseCase,
) : ViewModel() {
    private val jobId = JobId(savedState.get<String>("jobId")!!)
    val state: StateFlow<JobOverviewUiState> = observeJob(jobId)
        .map { it.toUi() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), JobOverviewUiState.Loading)

    fun onAck(action: AckAction, comment: String?) = viewModelScope.launch {
        acknowledge(jobId, action, comment).onFailure { /* surface */ }
    }
    fun onRefresh() = viewModelScope.launch { refresh(jobId, UserPulled) }
}
```

### 10.3 Lifecycle rules

- `SharingStarted.WhileSubscribed(5_000)` keeps observers alive across rotation but stops them when the screen is gone.
- One-shot navigation events are consumed exactly once (no replay after process death; if process death happens, navigation restores from the route).
- No `GlobalScope`, no `lifecycleScope.launch` in composables; side-effects use `LaunchedEffect` with a key to survive configuration changes.
- Process death: ViewModels survive via SavedStateHandle only for lightweight form state; the source of truth is Room, which repopulates state.

### 10.4 Compose patterns

- Material 3 Scaffold + NavigationBar (bottom) + TopAppBar for job-scoped screens.
- Small components; previews with light/dark, large-font, and en/pcm locales.
- `LazyColumn` with `key()` for lists; sticky headers for groups; `contentType()` for efficient recycling.
- No heavy operations in composition; formatting and date calculation done via `remember` or in the mapper.
- Images loaded with Coil, downsampled to target size, with placeholder/error drawables, memory cache capped by device memory class.
- Pagination with `collectAsLazyPagingItems`.

---

## 11. Navigation

### 11.1 Routes (typed, sealed)

```kotlin
sealed class Route(val path: String) {
    data object Splash : Route("splash")
    data object SignIn : Route("sign-in")
    data object Verify : Route("verify?contact={contact}&channel={channel}")
    data object Jobs : Route("jobs")
    data object NewJob : Route("jobs/new?sharedPayloadId={payloadId}")
    data object JobOverview : Route("jobs/{jobId}")
    data object Brief : Route("jobs/{jobId}/brief")
    data object Version : Route("jobs/{jobId}/versions/{versionId}")
    data object Changes : Route("jobs/{jobId}/changes")
    data object ChangeDetail : Route("jobs/{jobId}/changes/{changeId}")
    data object Questions : Route("jobs/{jobId}/questions")
    data object History : Route("jobs/{jobId}/history")
    data object People : Route("jobs/{jobId}/people")
    data object Files : Route("jobs/{jobId}/files")
    data object Closeout : Route("jobs/{jobId}/closeout")
    data object Templates : Route("templates")
    data object Settings : Route("settings")
    data object NotificationsPrefs : Route("settings/notifications")
    data object Privacy : Route("settings/privacy")
    data object AppLock : Route("settings/lock")
    data object ResolveConflict : Route("jobs/{jobId}/conflicts/{commandId}")
}
```

- Deep links are registered via `NavDeepLink` for: invite (`https://naweagree.app/invite/{token}`), change push (`https://naweagree.app/jobs/{id}?event=change:{cid}`), question push, plan card (`https://naweagree.app/p/{shortCode}` — optional later).
- Unknown deep links → fallback WebView (terms/privacy) or "Open in browser".
- Back stack is preserved; exit confirmation on root tabs; dialog destinations use `DialogProperties(usePlatformDefaultWidth=false)` for full-width on tablets.

### 11.2 Bottom navigation (mobile)

Order: Jobs (home), Needs Action (queue count badge), History, Settings. Desktop/tablet (≥ 600 dp) uses NavigationRail.

---

## 12. Screens and feature breakdown

Each screen is a feature package with: `Screen.kt`, `ViewModel.kt`, `UiState.kt`, `UiEvent.kt`, `Components.kt`, `Preview.kt`, `Navigation.kt`.

### 12.1 Auth

- **Splash:** checks encrypted session → goes to Jobs, SignIn, or AppLock.
- **Sign in:** phone input (`+234` default), email toggle, terms acceptance, primary CTA, rate-limit helper copy.
- **Verify OTP:** auto-read via SMS Retriever API (user consent, never reads arbitrary messages), single input with segmented visual, resend timer, change number.
- **Session list:** device label, last seen, revoke button.
- **App lock:** optional 4-digit PIN, fingerprint/face biometric via BiometricPrompt, "forgot PIN" wipes local data (sign-out).

### 12.2 Jobs

- **Jobs home:** Needs-action carousel, Active tab (LazyColumn cards), Archived/Completed collapsible, FAB "New job", empty state.
- **New job:** category chips, title, "paste/voice/photo intake" actions, continue/save draft.
- **Job overview:** StatusChip, version summary, ack checklist (each row avatar + status), NextAction card (one action only), pending change/question alerts, recent activity preview, actions menu (propose change, pause, cancel, share).
- **Closeout:** two-column state for "My view" / "Other view", own state chips (delivered / received / follow-up / not completed), note, submit.

### 12.3 Brief editor

- Grouped accordion sections (Outcome, Scope, Specifications, Materials, Price, Timing, Delivery, Revisions, Open questions).
- Each field card: label, value, FieldStateBadge, author/source label, edit icon, "not decided" chip, source link.
- Price field: money input + currency + "describe it"; Date field: calendar + "describe it"; Measurement: value + unit + original phrase.
- AI draft panel (if enabled) shows suggestions with source spans, accept/edit/reject per field; `AiDisclosure` banner always visible.
- Conflict card: shows both values side-by-side with "Your version" / "Their version", never auto-chooses.
- Bottom bar: status (Saved/Sending/Needs review), Publish button (disabled when nothing changed), Preview link.

### 12.4 Versions and acknowledgement

- Version list with numbered chips, current version highlighted, superseded muted.
- Version detail: read-only field list with diff from previous, ack checklist, primary "I've reviewed version X", secondary "Ask a question / I disagree / I need more time".
- Accessible confirmation dialog naming the version number and listing material fields still open.
- Acknowledge button: **never** disabled due to open questions — user can choose "I need more time" or "Ask a question", but may also acknowledge with open questions (the UI lists them clearly and marks them "still open").
- Withdraw creates a new row; UI shows "You reviewed this, then withdrew your review on <date>".

### 12.5 Changes and diff

- Change list: tabs Open / Accepted / Rejected; each card shows proposer, affected fields, status, timestamp.
- Change detail: base version header, DiffView (added/removed/changed fields with old/new text, labelled and iconed), reason, response actions.
- Accept/Reject/Ask/Need-time actions with confirmation dialogs (including the explicit "Rejecting leaves the previous plan in place" line).
- Draft-comparison when the user's own pending change conflicts with a newer version.

### 12.6 Questions and history

- Questions list: filter open/answered/deferred; per-question card with field badge, asker, body, response thread, follow-up action.
- History: grouped-by-day timeline, event icons, version chips, filters (versions/questions/changes/other), Export menu (PDF, PNG card, JSON).
- Export progress is shown as a WorkManager notification; result is cached locally and shared via Android Sharesheet.

### 12.7 People and files

- People: participant rows (you / other / invited), invite status, copy invite link, revoke, add button.
- Files: attachment grid with upload state (queued / uploading / scan pending / available / blocked), tap to view with long-press share, voice note player inline, add buttons (Camera / Gallery / Voice / File).
- Upload progress is shown per attachment and in the system notification.

### 12.8 Settings

- Profile (display name, locale), Notifications (push, email, SMS, quiet hours), Privacy (AI opt-out, export, delete, active sessions), Lock (PIN/biometric, hide in app switcher flag), About (version, open source licenses, privacy policy, help), Data saver toggle.
- Deletion flow: re-auth (OTP), scope preview ("what stays / what is removed"), grace period timer, cancel option.

### 12.9 Conflict resolution screen

Opened from `ResolveConflict` route: shows the user's queued action, the server's new state, and explicit choices: Review & resend (re-base), Keep my change as a proposal, Discard. Material fields are shown with a diff; the user must explicitly re-confirm. No auto-merge.

---

## 13. Theming, design tokens, and components

### 13.1 Token pipeline

Design tokens JSON → build script → `Color.kt`, `Type.kt`, `Dimen.kt` generated code. Tokens follow semantic names (same as web) so copy-pasted design specifications apply to both clients.

- Color: `Bg`, `Surface`, `SurfaceMuted`, `Text`, `TextMuted`, `Primary`, `PrimaryHover`, `PrimarySoft`, `Accent`, `Success`, `Warning`, `Danger`, `Border`, `Focus`.
- Type scale: `Display`, `Headline`, `Title`, `Body`, `Label`, `Caption` (mapped to sp sizes; respects system font scale).
- Shape: small/medium/mediumLarge/large.
- Elevation: tonal elevation preferred over shadows.
- Motion: fast/slow durations with `prefersReducedMotion` from system settings.

### 13.2 Component library

Built in `core/ui/` using Material3 components customised with tokens: NwaButton (primary/secondary/danger/ghost × loading/disabled), NwaTextField, NwaTextArea, NwaChip, NwaBadge (status-coloured with text+icon), NwaDialog, NwaBottomSheet, NwaTopAppBar, NwaNavigationBar, NwaScaffold, NwaSegmented, NwaEmptyState, NwaErrorState, NwaAvatar, NwaListCard, NwaSyncBar, NwaDiffTable (card-based on small screens, table on ≥600dp), NwaFieldCard, NwaSourceAttribution, NwaAttachmentCard, NwaVoiceRecorder, NwaCameraCapture.

Every component:

- Has a state-sealed class (default, disabled, loading, error).
- Has `@Preview` for default, dark, large-font, pcm locale.
- Uses semantic tokens only.
- Exposes a `contentDescription` where visual meaning is present.
- Min touch target 48 dp.

### 13.3 Dark mode and contrast

Dark mode uses a dark surface with identical semantic tokens. High-contrast theme supported via Material's dynamic color opt-in (off by default; respect user's system). Contrast is tested via Accessibility Scanner for every component.

---

## 14. Authentication and keystore security

### 14.1 OAuth PKCE flow

- App generates a 64-byte code verifier, SHA-256 `code_challenge`, opens Custom Tabs (not embedded WebView) to `/auth/authorize?code_challenge=…`.
- Server redirects to `naweagree://auth/callback?code=…`; AppAuth-Android exchanges code + verifier for token pair.
- Access token (15 min) stored in memory; refresh token (rotating, 60-day) stored in `EncryptedSharedPreferences` with a Keystore-backed master key (`AndroidKeyStore`, AES256-GCM, user authentication not required at rest but biometric unlock required to launch the app when the user enables app lock).
- Token refresh is serialised across the app via a Mutex; refresh-token reuse revokes the family and forces sign-out.
- When app lock is enabled, the in-memory access token is cleared on background; refresh token stays encrypted. Biometric prompt is required to unlock.

### 14.2 OTP UX on Android

- Use the SMS Retriever API (Google Play Services) to auto-read the SMS verification code without the `READ_SMS` permission (no broad SMS permission; that's a privacy warning in Play).
- Auto-read shows a "Fill code" prompt rather than pasting without user action.
- Code input: single `TextField` with `KeyboardType.NumberPassword`, `imeAction = ImeAction.Done`, 6-character visual segmentation (as on web, one field for a11y).
- Fallback "Resend code" after 60 s, with attempt counter.

### 14.3 Passkeys

- After the first mutually acknowledged job, offer "Sign in faster with fingerprint/face" → create a passkey via Jetpack Credential Manager.
- On subsequent sign-in on the same device the passkey option is shown; other devices fall back to OTP.
- Never require passkeys for login.

### 14.4 App lock and data visibility

- Optional PIN or biometric (BiometricPrompt with `setDeviceCredentialAllowed(true)` so PIN/pattern works too).
- `FLAG_SECURE` on job screens: controlled by a "hide in app switcher" toggle (default ON for jobs with address/measurements flagged sensitive; user can disable).
- Auto-lock after 5 minutes in background (configurable).
- Quick sign-out clears the in-memory session, encrypted prefs, Room database (per user), file cache, and pending uploads only after warning the user that queued changes will be lost.

---

## 15. Camera, voice, and media capture

### 15.1 Camera

- CameraX `ImageCapture` with front/back toggle, flash auto, tap-to-focus.
- Capture → downscale to max 1600 px long edge, rotate to EXIF orientation, compress WebP (quality 80) / fallback JPEG; preserve original only if user chooses "Original quality" (default off to save data).
- Images are written to app-private cache (not gallery), then uploaded via `MediaUploadWorker`.
- Optional cropping is a Compose-based crop screen (no third-party library with broad permissions).

### 15.2 Voice notes

- `MediaRecorder` with AAC LC, 32 kbps, 44.1 kHz mono — small files good for low-bandwidth.
- Visual waveform (Compose Canvas), pause/resume, maximum 5 minutes per note (can be extended), and playback before sending.
- Consent banner on first use: "Voice notes are transcribed to extract details only if you agree. Original audio is deleted by default after 7 days."
- Resume after phone call / permission denial; no crash if recorder is interrupted by another app.

### 15.3 Gallery / file picker

- Use Photo Picker (`ActivityResultContracts.PickVisualMedia`) and `OpenDocument` for PDF — these require no storage permissions on Android 13+.
- On Android < 13 use `READ_MEDIA_IMAGES` (no broad `READ_EXTERNAL_STORAGE`).
- Copy selected files to app cache so a revoked permission doesn't break the queue.

### 15.4 Image rendering

- Coil with OkHttp fetcher for signed R2 URLs; in-memory cache 25% of app memory, disk cache 200 MB LRU; downsample to view size; AVIF/WebP preferred.
- `Content-Disposition` respected; no share of signed URL with other apps (download to cache and share via FileProvider).
- Exif orientation is corrected before render; sensitive metadata is stripped at upload (server also strips it).

---

## 16. Receiving shared content (ACTION_SEND intents)

### 16.1 Intent filters

```xml
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/*" />
  <data android:mimeType="image/*" />
  <data android:mimeType="application/pdf" />
</intent-filter>
<intent-filter>
  <action android:name="android.intent.action.SEND_MULTIPLE" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>
```

### 16.2 Flow

1. User shares text/image from WhatsApp → Android shows NaWeAgree as target.
2. If signed out → SignIn → after sign-in the share payload resumes.
3. If signed in → `ShareInboxViewModel` stores text + copied files (to app cache) in Room as `SharePayloadEntity` (1-hour TTL).
4. Route to `/jobs/new?sharedPayloadId=…`.
5. New-job screen shows the text preview, image thumbnails, "use these" / "start blank" actions; choosing "use these" creates an input artifact and attachments on job creation, then clears the inbox.
6. The user can add a voice note or camera capture on the same screen.
7. Auto-run of AI is **not** performed; the user chooses.

### 16.3 Edge cases

- App is killed while processing → payload resumes on next launch (persisted in Room).
- Cancelled flow → payload purged after 1 hour by `PeriodicCleanupWorker`.
- Large images (> 5 MB) are compressed in the background before upload-intent call.
- Binary files larger than 25 MB are rejected with a clear message.

---

## 17. Notifications (FCM)

### 17.1 Design

- **Data-only messages** so the app controls display (no FCM auto-rendered notifications that could leak content).
- Payload: `{ "type": "ack|change|question|invite|security|closeout", "jobId": "j_…", "eventId": "e_…", "version": <int> }`. No titles, no bodies, no prices/names.
- The app fetches the event details after unlock (or immediately if the user hasn't enabled app lock and the notification is not security-critical).
- On Android 13+, request `POST_NOTIFICATIONS` permission after the first published version (never on first open); explain what will be shown and offer email-only.

### 17.2 Notification channels

| Channel | Importance | Use | Sound |
|---|---|---|---|
| `critical` | HIGH | Invite, first mutual ack, security event | Default alert sound |
| `updates` | DEFAULT | Change proposed, question asked, closeout | Subtle sound |
| `media` | LOW | Upload/download progress | Silent |
| `reminders` | MIN | Periodic "needs action" digest | Silent |
| `worker` | MIN | Sync and exports | Silent, ongoing |

Notification grouping: one group per job, summary for multiple updates; tap opens the relevant screen (deep link with event id).

### 17.3 Quiet hours and delivery

- Respect per-user quiet hours (default 21:00–07:00 local), batching non-critical notifications into a single summary at 08:00.
- Security events bypass quiet hours but not Do Not Disturb policy channels.
- Deduplicate on server (`dedupe_key`) and client (drop duplicate `eventId`s).
- On FCM `onNewToken`, send token to server and invalidate the old one; token is stored encrypted.
- If push is denied or token unavailable, fall back to periodic pull (every 6 hours when app is opened) + email, and a clear banner in Settings.

---

## 18. Accessibility

### 18.1 TalkBack

- Every icon button has a content description from strings (never hard-coded).
- Content descriptions carry state meaning, e.g. "Status: both reviewed version 3", not "green check".
- Status changes are announced via `announceForAccessibility` in ViewModel events (e.g. "Recorded as reviewed").
- Focus is moved after navigation to the screen title; after dialogs close, focus returns to the trigger.
- `TraversalGroup` and `mergeDescendants` used appropriately for cards.
- Form errors: `error` semantic property set; focus moves to error summary after submit failure.

### 18.2 Targets, typography, contrast

- Minimum touch target 48 dp, 8 dp spacing between targets.
- Material type scale respects `fontScale`; avoid `sp` values that bypass user setting.
- Token contrast validated in CI via a screenshot + contrast check against generated colours.
- Color-blind friendly: status uses icon + label + border pattern (success check, warning exclamation, danger x) — never colour alone.
- No time-limited dialogs; auto-dismissing toasts have sufficient duration (≥ 4 s).

### 18.3 Read aloud and voice input

- Optional "Read this plan aloud" uses Android TTS (`TextToSpeech`) with a voice/language chosen per locale; supports stop/pause and reading focus (current paragraph highlighted).
- Voice input for the brief is supported via the platform voice keyboard and dedicated voice-note capture (not free-form dictation into arbitrary fields).
- Audio ducking during TTS playback; respects audio focus.

### 18.4 Switch Access and external keyboards

All interactive controls are focusable and activatable via D-pad/keyboard. Top-level navigation supports Tab/Shift-Tab and Enter to activate.

### 18.5 Testing

- Accessibility Scanner on every screen before PR merge.
- Manual TalkBack walkthrough of P0 journeys for each release.
- Large-font (200%) screenshot tests.
- Snapshot tests with Accessibility Test Framework for Composables in CI.

---

## 19. Internationalization and local formatting

### 19.1 Resources

- All strings in `strings.xml` generated from the ICU catalogue in `packages/i18n`. Plural rules and gender using `<plurals>` and ICU syntax via the `com.ibm.icu` library where Android's native plurals don't cover complex rules.
- Locales at launch: `en-rNG` and `b+pcm` (Nigerian Pidgin, BCP-47 private subtag `pcm`); structure prepared for Yo/Ha/Ig.
- Numbers: `NumberFormat` for amounts; currencies resolved from ISO code; raw phrases preserved alongside formatted display.
- Dates: `java.time` (ThreeTenABP on API <26 is not needed because minSdk 26) with user's timezone; ambiguous stored phrases render as "before month end" plus a note "not a fixed date".
- Layout: `start/end` instead of `left/right`; strings carry formatting markers (`%1$s`) with positional placeholders. No RTL at launch but all code uses start/end.

### 19.2 Content rules

Same as web (grade-6 plain language, no legal language, consistent terminology). Copy review is mandatory for Pidgin. Pseudo-locale `en-XA` build (`xb` resource qualifier) catches hardcoded strings and truncation.

---

## 20. Performance, memory, and battery

### 20.1 Budgets

| Metric | Target (p50 / p90 on reference 2 GB device, 3G) |
|---|---|
| APK (AAB install on device) | ≤ 12 MB APK / ≤ 8 MB download |
| Cold start (app launch to jobs list with data) | < 1.8 s / < 3 s |
| Hot start | < 500 ms |
| Time to first frame of a job overview | < 400 ms / < 900 ms |
| Frame time (jank) | < 5% of frames > 16 ms, 0% > 700 ms |
| Memory (jobs list + job overview) | < 120 MB |
| Battery drain (background 24 h with FCM) | < 1% |
| Queue drain latency (acknowledgement when online) | < 10 s p95 |

### 20.2 Techniques

- Baseline Profiles generated via `benchmark` module for startup and job overview flows.
- R8 + resource shrinking + `minifyEnabled=true` in release.
- Avoid object allocations in hot paths (e.g., diff rendering); use `remember` and immutable state classes.
- Use `derivedStateOf` where appropriate; avoid `collectAsState` in list items.
- Keyed LazyColumn items with `contentType` so View types are reused.
- Paging for history and jobs lists; no unbounded RecyclerView/Compose lists.
- Image decoding in background, downsampled via Coil; no bitmaps held in memory beyond cache.
- Coil memory cache 1/8 of available memory; disk cache 200 MB; aggressively evict when system is low (`ComponentCallbacks2`).
- Sync workers run with `RequiresBatteryNotLow = false` for critical acks, `true` for non-critical (periodic refresh, large uploads).
- WorkManager backoff uses linear for user-initiated, exponential for background; avoid wake locks.
- No web views in production except static policies.
- Disable animations when `ANIMATOR_DURATION_SCALE = 0f`.

### 20.3 Benchmarking

Macrobenchmark module (`benchmark/`) measures startup, scrolling, and job-open latency on CI with an emulator; results are compared to thresholds for each PR. Perfetto traces are captured on demand.

---

## 21. Security and privacy specifics for Android

### 21.1 Manifest permissions (justified, minimal)

| Permission | Why | When requested |
|---|---|---|
| `INTERNET` | All app communication | Install time |
| `ACCESS_NETWORK_STATE` | Sync scheduling | Install time |
| `POST_NOTIFICATIONS` | FCM, uploads, TTS | Contextual, after first action |
| `CAMERA` | Capture attachment photos | When user taps camera |
| `RECORD_AUDIO` | Voice notes | When user starts recording |
| `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (Android 13+) | Gallery attachment | When user taps gallery |
| `READ_EXTERNAL_STORAGE` (Android < 13, scoped) | Gallery fallback | When user taps gallery |
| `USE_BIOMETRIC` | App lock optional | When user enables lock |
| `FOREGROUND_SERVICE_DATA_SYNC` | Large uploads/sync | As needed, shown to user |
| `RECEIVE_BOOT_COMPLETED` | Reschedule WorkManager after reboot | Install time |

**Not requested:** `READ_SMS`, `READ_CONTACTS`, `ACCESS_FINE_LOCATION`, `READ_PHONE_STATE`, `WRITE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`. SMS codes are read via SMS Retriever API (no permission).

### 21.2 Data at rest

- All Room DB encrypted at rest via SQLCipher for Android (opt-in by build flavor; on for prod release builds).
- SharedPreferences via `EncryptedSharedPreferences` with AndroidKeyStore master key (AES256-GCM).
- Cache files in `cacheDir/` (no backup). Important queued commands in DB (encrypted). Attachments in `noBackupFilesDir/`; thumbnails may be in `cacheDir/`.
- `allowBackup=false` (default false) – do not include the user's job content in adb/Google backup. Offer user-initiated export instead.
- App data is deleted on uninstall (documented).

### 21.3 Network

- TLS 1.3 only; OkHttp configured with a narrow cipher set and certificate pinning for the API domain (pinned cert must support easy rotation via backup pin).
- Certificate transparency enforcement (okhttp + cert-transparency) to detect mis-issued certs.
- No cleartext traffic (`usesCleartextTraffic="false"` in prod).
- OkHttp logging interceptor disabled in release; debug-only logging with PII redaction.

### 21.4 Additional safeguards

- `android:exported` set explicitly for all components; deep-link Activity validates URIs before processing.
- Tapjacking protection: `setFilterTouchesWhenObscured(true)` on critical action screens (acknowledge, delete).
- Debug-only menu in dev builds to inject failures (network error, stale version, slow sync) for QA.
- Rooted devices: do not block, but show a warning when app lock is enabled that security is reduced; do not attempt DRM-style enforcement.
- Sensitive fields (address, phone numbers within jobs) are redacted from screenshots when `FLAG_SECURE` is on.

---

## 22. Analytics and crash reporting

### 22.1 Firebase

- Crashlytics with breadcrumbs and no content; custom keys limited to error codes, route names, and app version.
- Performance Monitoring filtered to app startup, HTTP traces, and screen rendering (no URL query strings with IDs).
- Firebase Analytics is **not** used; we use the same first-party event allowlist as web, sent via the same `/api/e` endpoint over Retrofit so the schema stays in sync.

### 22.2 Telemetry

Same event dictionary as web (§17 of `01`) plus Android-specific: `app_cold_start`, `sync_worker_result`, `push_permission_decision`, `biometric_enabled`, `voice_note_recorded`, `app_update_accepted/rejected`.

Opt-out is respected per user setting; opt-in presented on first launch with explanation.

---

## 23. Testing strategy

### 23.1 Pyramid

| Level | Tool | Target |
|---|---|---|
| Unit | JUnit5, MockK, Turbine, kotlinx-coroutines-test | UseCases, ViewModels, sync resolver, formatters |
| DB | Room in-memory, migrations tested against schema dumps | Entities, DAOs, migrations, concurrency |
| Integration | MockWebServer + Hilt + IdlingResources | API + Repository sync flows, token refresh, idempotency |
| Screenshot | Shot / Paparazzi | Components × themes × locales × font scales |
| UI (Compose) | Compose Test | Navigation, form validation, dialogs, TalkBack labels |
| E2E | Maestro flows on Firebase Test Lab | P0 journeys on 4 device tiers |
| Performance | Macrobenchmark | Startup, scroll, open job; compared to thresholds |
| Accessibility | Accessibility Test Framework for Compose + Accessibility Scanner | Zero critical/serious issues |
| Security | MobSF in CI + manual review | Manifests, network pinning, encryption, data leaks |

### 23.2 Critical automated tests

1. App reboot (via WorkManager test driver) replays pending commands in order.
2. `409 VERSION_SUPERSEDED` on an offline ack discards the command and creates a user-visible issue.
3. Token refresh serialises concurrent API calls and doesn't double-refresh.
4. Biometric unlock failure (3 wrong) falls back to PIN; PIN failure (5) signs the user out.
5. Large image is compressed under 1 MB before upload intent.
6. Sharing text from WhatsApp creates a payload that survives process death and is consumed once on job creation.
7. FCM message for a job the user no longer belongs to does not create a notification.
8. Deep link to a job with an invalid ID routes to a helpful "Job not found" screen with no content leak.
9. Withdrawing an acknowledgement never deletes the original row locally or on next sync.
10. Data-saver mode uses unmetered-only workers and no automatic image download.

### 23.3 Device lab

Firebase Test Lab runs Maestro suites before release on: Pixel 7 (Android 14), Samsung A14 (Android 13), Nokia 1.4 (Android 11 Go, 2 GB RAM), Redmi A2+ (Android 12 Go), Tecno Spark 10 (Android 13). Results (screenshots, perf, crashes) block release.

---

## 24. Build, CI/CD, signing, Play release

### 24.1 Build variants

- `devDebug`: local backend, no minification, debug keystore, strict logging, FCM dev project.
- `stagingRelease`: staging backend, minification enabled, upload to Firebase App Distribution for internal testers.
- `prodRelease`: production, signed with Play App Signing key, uploaded to Play tracks.

### 24.2 CI (GitHub Actions)

```yaml
pr:
  - ktlint, detekt
  - unit tests
  - screenshot tests (regression)
  - DB migration tests
  - build all flavors
staging:
  - integration tests
  - Maestro smoke on Test Lab (1 device)
  - deploy to Firebase App Distribution
prod:
  - full Maestro matrix on Test Lab
  - accessibility scan
  - signed AAB build
  - publish to internal track → closed (10%) → 20% → 50% → 100% (staged rollout)
```

### 24.3 Signing

- Upload keystore stored in GitHub Secrets with limited access; Play App Signing handles the production signing key.
- Keystore password rotation procedure documented; backup stored offline.
- Builds are reproducible where Gradle supports it; signed build provenance (SLSA) generated.

### 24.4 Play Store preparation

- **Data safety form:** declare data types collected (name, contact, user content, app activity, diagnostics), purposes, sharing with service providers only, encryption in transit/at rest, deletion pathway, child policy (target audience 18+), no personal/sensitive data in advertising.
- **Content rating:** questionnaire (utility/productivity).
- **Privacy policy** URL live before submission.
- **Screenshots** for phone and 7" tablet in light theme (dark optional).
- **Release notes** per version, short, user-facing.
- **Target SDK:** always latest stable (API 35 in 2026).
- **Pre-launch report** reviewed; any crash must be fixed before rolling past 50%.

### 24.5 App updates

- In-app updates API: flexible updates for minor patches on next app resume; immediate updates for critical security fixes (shown once per session).
- Update kill switch via minimum-supported-version header from API; old clients that cannot communicate safely show an "Update required" screen.

---

## 25. Observability and operations

- Crash-free sessions dashboard (Firebase + Crashlytics) with release annotations.
- ANR rate < 0.2%; alert if any release exceeds.
- Performance traces: cold/warm/hot start, screen open, worker latency, upload success rate, FCM delivery echo (periodic echo ping to compute delivery rate).
- Custom key metrics in Crashlytics: `job_seq_conflict_rate`, `offline_queue_age_seconds`, `sync_failure_rate`, `token_refresh_failure_rate`.
- Alerting: crash rate > 1% in 1 h, ANR spike, worker failure > 5%, FCM delivery echo < 90%, SSL pin failure (possible MITM, block if detected).
- Remote config/feature flags: same flag set as web (`ai_extraction`, `plan_card_pdf`, `sms_fallback`, `voice_notes`, `read_aloud`, `data_saver_default`, `min_supported_version`) fetched via `/v1/flags` at startup and every 6 hours, cached encrypted locally.

---

## 26. Sprint plan with exit criteria

Work begins W6 (in parallel with web phase 3). 1 Android engineer; assumes API contract is frozen by W6.

| Sprint | Weeks | Scope | Exit criteria |
|---|---|---|---|
| W6 | 1 | Project scaffold, Gradle, tokens, Hilt, theme, CI, Crashlytics, tokens sync, Retrofit client, Room DB v1, basic NavGraph, design tokens, primitives library with previews | App builds to device; empty home screen loads with synthetic data |
| W7 | 2 | Auth: OTP, PKCE token handling, EncryptedSharedPreferences, session list, splash routing | Sign-in end-to-end against staging; token refresh works; auto-logout on refresh failure |
| W8 | 3 | Jobs list, create (manual), brief editor with field states, draft autosave to Room, basic Form validation | Create and edit a draft; survives process death; empty/error/loading states |
| W9 | 4 | Sync engine v1: WorkManager, Command, SendCommandWorker, basic PullWorker, conflict types | Queue drains on reconnect; duplicate idempotent call safe |
| W10 | 5 | Versions, immutable view, acknowledgement, ack checklist, next-action, overview screen | Two-device happy path ack over real API; no false mutual ack |
| W11 | 6 | Change request + diff view + responses, questions, conflict resolution screen | Reject preserves old version; superseded ack handled |
| W12 | 7 | Attachments: camera, gallery picker, voice recorder, upload intent + worker, attachment grid, signed URL cache, files screen | Capture photo + voice, queue over flaky network, survive reboot |
| W13 | 8 | Share intent intake, closeout, history, export (PDF/PNG share via FileProvider) | ACTION_SEND flow from WhatsApp works; export shares via Sharesheet |
| W14 | 9 | FCM, notifications channels, deep links, notification centre, quiet hours, SMS/email pref sync | Push arrives on Android 11–14; tap opens correct screen; no content leak |
| W15 | 10 | Settings, app lock (PIN/biometric), FLAG_SECURE, AI opt-out, deletion flow, data saver, pcm locale | Lock and unlock work; deletion flow; pcm screens reviewed |
| W16 | 11 | Accessibility pass, baseline profiles, performance tuning, screenshot/maestro suites, error copy, edge cases, data safety form prep | All a11y checks green; budgets met on reference device |
| W17 | 12 | Hardening: security review, MobSF, pinning verification, migrations, Play metadata, beta upload | Internal track green, closed-testing launch |

Total: 12 weeks from start. By W18 the app is in Play closed testing with parity for P0 flows.

---

## 27. Definition of done

An Android change is done when:

- It is implemented in Compose using tokens, semantic naming, and material components where appropriate.
- Works offline per the queue rules; never shows false confirmed state.
- Process-death tested (use "Don't keep activities" and adb force-stop).
- Works on API 26–35 and on reference devices without layout or performance regression.
- Screenshot and Maestro tests updated.
- TalkBack labels and focus order are correct; Accessibility Scanner raises no serious issues.
- It does not request new permissions without updating the data-safety form and privacy notice.
- Strings are added to the catalogue and reviewed for each shipped locale.
- Analytics event is added only if it's in the shared allowlist.
- Worker backoff/constraints are set appropriately (no battery/network abuse).
- Release notes, flag, and Play store change (if user-visible) are updated.

Quality budget for launch: crash-free sessions ≥ 99.5%, ANR < 0.2%, cold start p90 < 3 s, sync failure rate < 1%, uninstall rate < 10% in first week, zero critical bugs open.

---

## 28. Android-specific risks

| Risk | Impact | Mitigation |
|---|---|---|
| OEM battery-optimisation kills WorkManager and FCM | Missed notifications | Request ignore-battery-optimisation only after user experiences a missed push with a clear explanation; provide email fallback; test on high-kill OEMs (Xiaomi, Tecno, Infinix, Gionee) |
| Low-RAM eviction loses in-memory access token | Logout / state flicker | Token in EncryptedSharedPreferences; unlock via biometric; Room holds all state |
| SMS Retriever failure on some carriers | User has to type OTP | Always allow manual entry; show copy code hint |
| Keystore failures on some devices (known OEM bugs) | App lock fails | Fall back to PIN-only and clear encrypted cache; report via Crashlytics, never crash |
| CameraX quirks across OEMs | Capture failures | CameraX config compatibility overrides; graceful fallback to gallery picker |
| AAB size creep over budget | Install friction | R8, APK splits by ABI/language/density, WebP assets, vector drawables; size gate in CI |
| Play policy rejection (data safety, permissions) | Delayed launch | Pre-review data-safety form early, permissions justified in store listing, run Play pre-launch report |
| Client–server contract drift | Crashes/wrong state | OpenAPI-generated DTOs, contract tests, minimum-supported-version header |
| SQLCipher performance on very low-end devices | Slower open | Profile; consider turning encryption off for devices with file-based encryption + low risk, gated by a flag and security review |
| MITM on public Wi-Fi | Credential capture | TLS pinning + cert transparency; block on pin failure, not silent |
| Accessibility regressions due to Compose updates | TalkBack breaks | Pin Compose BOM; update in its own sprint with a11y regression suite |
