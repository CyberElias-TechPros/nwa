package com.naweagree.nwa.sync

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Tiny persistent queue backed by SharedPreferences (matches the web
 * localStorage outbox shape for parity during port). Uses JSON arrays;
 * fine for the small mutation volume we expect (< 50 items typical).
 */
data class OutboxEntry(
    val id: String,
    val method: String,
    val url: String,
    val body: String?,
    val idempotencyKey: String = UUID.randomUUID().toString(),
    val attempts: Int = 0,
    val lastError: String? = null,
)

@Singleton
class OutboxStore @Inject constructor(
    @ApplicationContext ctx: Context,
) {
    private val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private suspend fun readAll(): List<OutboxEntry> = withContext(Dispatchers.IO) {
        val raw = prefs.getString(KEY, null) ?: return@withContext emptyList()
        val arr = try { JSONArray(raw) } catch (_: Exception) { return@withContext emptyList() }
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            OutboxEntry(
                id = o.getString("id"),
                method = o.getString("method"),
                url = o.getString("url"),
                body = o.optString("body", null),
                idempotencyKey = o.optString("idempotencyKey", o.getString("id")),
                attempts = o.optInt("attempts", 0),
                lastError = o.optString("lastError", null),
            )
        }
    }

    private suspend fun writeAll(items: List<OutboxEntry>) = withContext(Dispatchers.IO) {
        val arr = JSONArray()
        items.forEach {
            arr.put(JSONObject().apply {
                put("id", it.id); put("method", it.method); put("url", it.url)
                if (it.body != null) put("body", it.body)
                put("idempotencyKey", it.idempotencyKey)
                put("attempts", it.attempts)
                if (it.lastError != null) put("lastError", it.lastError)
            })
        }
        prefs.edit().putString(KEY, arr.toString()).apply()
        listeners.forEach { it(items) }
    }

    private val listeners = mutableListOf<(List<OutboxEntry>) -> Unit>()

    fun observe(): Flow<List<OutboxEntry>> = callbackFlow {
        val l: (List<OutboxEntry>) -> Unit = { trySend(it) }
        listeners += l
        // Emit current snapshot
        kotlinx.coroutines.launch(Dispatchers.IO) {
            val snapshot = readAll()
            trySend(snapshot)
        }
        awaitClose { listeners -= l }
    }

    suspend fun enqueue(method: String, url: String, body: JSONObject?): OutboxEntry {
        val entry = OutboxEntry(
            id = "q_" + System.currentTimeMillis().toString(36) + UUID.randomUUID().toString().take(4),
            method = method,
            url = url,
            body = body?.toString(),
        )
        val all = readAll().toMutableList()
        all.add(entry)
        writeAll(all)
        return entry
    }

    suspend fun remove(id: String) {
        writeAll(readAll().filterNot { it.id == id })
    }

    suspend fun markFailed(id: String, err: String) {
        val all = readAll().map { if (it.id == id) it.copy(lastError = err) else it }
        writeAll(all)
    }

    suspend fun incrementAttempts(id: String, err: String?) {
        val all = readAll().map {
            if (it.id == id) it.copy(attempts = it.attempts + 1, lastError = err) else it
        }
        writeAll(all)
    }

    suspend fun pending(): List<OutboxEntry> = readAll().filter { it.lastError == null || it.attempts < 6 }

    companion object {
        private const val PREFS_NAME = "nwa_outbox_v1"
        private const val KEY = "queue"
    }
}
