package com.naweagree.nwa.net

/**
 * NaWeAgree API client — thin OkHttp wrapper.
 *
 * Deliberately simple: no Retrofit, no kotlinx-serialization. We use
 * [org.json.JSONObject] (ships in Android) so the dep surface stays
 * small. The Hilt-provided [okhttp3.OkHttpClient] already carries the
 * [com.naweagree.nwa.auth.DeviceKeyInterceptor] so the nwa_dk cookie is
 * attached automatically.
 *
 * Offline behaviour (PLAN §T-W10): when the device is offline, non-GET
 * requests are enqueued in [com.naweagree.nwa.sync.OutboxStore] and
 * replayed by [com.naweagree.nwa.sync.OutboxWorker] when connectivity
 * returns. The method throws [OfflineQueuedException] so UI can show
 * "Saved — will send when you're back online" (mirrors web smartFetch).
 */

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.naweagree.nwa.sync.OutboxStore
import com.naweagree.nwa.sync.OutboxWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

open class ApiException(
    val status: Int,
    val code: String,
    override val message: String,
    val fields: List<FieldError> = emptyList(),
) : IOException(message) {
    val isNetwork: Boolean get() = status == 0
}

class OfflineQueuedException : ApiException(0, "QUEUED", "Saved — will send when you're back online.")

data class FieldError(val path: String, val message: String)

data class JobSummary(
    val id: String,
    val title: String,
    val status: String,
    val updatedAt: String,
)

data class CreatedJob(
    val job: JobSummary,
    val inviteToken: String,
    val inviteUrl: String,
    val creatorParticipantId: String,
)

data class AckResult(val status: String, val jobStatus: String)

data class PrivacyRequest(
    val id: String,
    val kind: String,
    val status: String,
    val createdAt: String,
)

data class AbuseReportResult(val id: String, val status: String)

private val JSON = "application/json; charset=utf-8".toMediaType()

@Singleton
class NwaApiService @Inject constructor(
    private val client: OkHttpClient,
    @ApiBaseUrl private val baseUrl: String,
    private val outbox: OutboxStore,
    @ApplicationContext private val ctx: Context,
) {
    private fun url(path: String) = baseUrl.trimEnd('/') + path

    private fun jsonBody(obj: JSONObject) = obj.toString().toRequestBody(JSON)

    private fun isOnline(): Boolean {
        val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val net = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private suspend fun execute(req: Request): JSONObject = withContext(Dispatchers.IO) {
        val resp = try {
            client.newCall(req).execute()
        } catch (e: IOException) {
            throw ApiException(0, "NETWORK", e.message ?: "Network error")
        }
        val body = resp.body?.string() ?: ""
        val parsed = runCatching { JSONObject(body) }.getOrElse { JSONObject() }
        if (!resp.isSuccessful) {
            val err = parsed.optJSONObject("error")
            val code = err?.optString("code")?.takeIf { !it.isNullOrEmpty() } ?: "HTTP_${resp.code}"
            val msg = err?.optString("message")?.takeIf { !it.isNullOrEmpty() } ?: "Something went wrong."
            val fieldsArr = err?.optJSONArray("fields") ?: JSONArray()
            val fields = (0 until fieldsArr.length()).map { i ->
                val f = fieldsArr.getJSONObject(i)
                FieldError(f.optString("path"), f.optString("message", "Check this field."))
            }
            throw ApiException(resp.code, code, msg, fields)
        }
        parsed
    }

    private suspend fun get(path: String): JSONObject =
        execute(Request.Builder().url(url(path)).get().build())

    /** Execute a POST; if offline, enqueue and throw [OfflineQueuedException]. */
    private suspend fun postQueued(path: String, body: JSONObject): JSONObject {
        val fullUrl = url(path)
        if (!isOnline()) {
            withContext(Dispatchers.IO) {
                outbox.enqueue("POST", fullUrl, body)
                OutboxWorker.enqueueDrain(ctx)
            }
            throw OfflineQueuedException()
        }
        return execute(Request.Builder().url(fullUrl).post(jsonBody(body)).build())
    }

    suspend fun ready(): Boolean =
        runCatching { get("/v1/ready").optString("status") == "ready" }.getOrDefault(false)

    suspend fun listMine(): List<JobSummary> {
        val res = get("/v1/jobs/mine")
        val arr = res.optJSONArray("jobs") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            val j = arr.getJSONObject(i)
            JobSummary(j.getString("id"), j.getString("title"), j.getString("status"), j.getString("updatedAt"))
        }
    }

    /** Mutations — all `suspend` so they're called from viewModelScope. */
    suspend fun createJob(
        title: String,
        categoryKey: String? = null,
        creatorName: String? = null,
        initialNotes: String? = null,
    ): CreatedJob {
        val body = JSONObject().apply { put("title", title) }
        categoryKey?.takeIf { it.isNotBlank() }?.let { body.put("categoryKey", it) }
        creatorName?.takeIf { it.isNotBlank() }?.let { body.put("creatorName", it) }
        initialNotes?.takeIf { it.isNotBlank() }?.let { body.put("initialNotes", it) }
        val res = postQueued("/v1/jobs", body)
        val job = res.getJSONObject("job")
        val inv = res.getJSONObject("invite")
        return CreatedJob(
            job = JobSummary(job.getString("id"), job.getString("title"), job.getString("status"), job.getString("updatedAt")),
            inviteToken = inv.getString("token"),
            inviteUrl = inv.getString("url"),
            creatorParticipantId = res.getString("creatorParticipantId"),
        )
    }

    suspend fun claimInvite(token: String, displayName: String): String {
        val res = postQueued("/v1/invites/$token/claim", JSONObject().put("displayName", displayName))
        return res.getString("participantId")
    }

    suspend fun ackInvite(
        token: String,
        participantId: String,
        action: String,
        comment: String? = null,
    ): AckResult {
        val body = JSONObject().put("participantId", participantId).put("action", action)
        comment?.takeIf { it.isNotBlank() }?.let { body.put("comment", it) }
        val res = postQueued("/v1/invites/$token/ack", body)
        return AckResult(
            status = res.getString("status"),
            jobStatus = res.getJSONObject("job").getString("status"),
        )
    }

    suspend fun getReceipt(jobId: String): JSONObject =
        get("/v1/jobs/$jobId/receipt")

    suspend fun verifyReceipt(envelope: JSONObject): Boolean {
        val res = postQueued("/v1/receipts/verify", envelope)
        return res.optBoolean("ok", false)
    }

    suspend fun reportAbuse(
        reason: String,
        description: String,
        jobId: String? = null,
        token: String? = null,
        contact: String? = null,
    ): AbuseReportResult {
        val body = JSONObject().put("reason", reason).put("description", description)
        jobId?.takeIf { it.isNotBlank() }?.let { body.put("jobId", it) }
        token?.takeIf { it.isNotBlank() }?.let { body.put("token", it) }
        contact?.takeIf { it.isNotBlank() }?.let { body.put("contact", it) }
        val res = postQueued("/v1/abuse/report", body)
        return AbuseReportResult(res.getString("id"), res.getString("status"))
    }

    suspend fun requestPrivacy(kind: String): PrivacyRequest {
        val res = postQueued("/v1/privacy/requests", JSONObject().put("kind", kind))
        val r = res.getJSONObject("request")
        return PrivacyRequest(r.getString("id"), r.getString("kind"), r.getString("status"), r.getString("createdAt"))
    }

    suspend fun listPrivacy(): List<PrivacyRequest> {
        val res = get("/v1/privacy/requests")
        val arr = res.optJSONArray("requests") ?: return emptyList()
        return (0 until arr.length()).map { i ->
            val r = arr.getJSONObject(i)
            PrivacyRequest(r.getString("id"), r.getString("kind"), r.getString("status"), r.getString("createdAt"))
        }
    }
}
