package com.naweagree.nwa.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/**
 * WorkManager-based offline outbox drain (PLAN §T-W10).
 *
 * Reads [OutboxStore] and replays pending non-GET requests, one at a
 * time. Each request carries an Idempotency-Key header so retries can't
 * double-send. 5xx/429/network failures → RETRY with backoff; 4xx →
 * mark permanently failed so the UI can surface "one response didn't
 * send" (mirrors web outbox semantics).
 */
@HiltWorker
class OutboxWorker @AssistedInject constructor(
    @Assisted ctx: Context,
    @Assisted params: WorkerParameters,
    private val client: OkHttpClient,
    private val store: OutboxStore,
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        var hadRetryable = false
        for (it in store.pending()) {
            try {
                val body = it.body?.toRequestBody(JSON)
                val req = Request.Builder().url(it.url).method(it.method, body).apply {
                    addHeader("Idempotency-Key", it.idempotencyKey)
                    addHeader("Content-Type", "application/json")
                }.build()
                val resp = client.newCall(req).execute()
                when {
                    resp.isSuccessful -> store.remove(it.id)
                    resp.code in 500..599 || resp.code == 429 -> {
                        store.incrementAttempts(it.id, "http_${resp.code}")
                        hadRetryable = true
                    }
                    else -> store.markFailed(it.id, "http_${resp.code}")
                }
            } catch (e: Exception) {
                store.incrementAttempts(it.id, e.message ?: "network")
                hadRetryable = true
            }
        }
        if (hadRetryable) Result.retry() else Result.success()
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
        private const val WORK_NAME = "nwa-outbox-drain"

        /** Schedule a drain when connectivity returns. Idempotent. */
        fun enqueueDrain(ctx: Context) {
            val req = OneTimeWorkRequestBuilder<OutboxWorker>()
                .setConstraints(
                    androidx.work.Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .setBackoffCriteria(androidx.work.BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(ctx).enqueueUniqueWork(WORK_NAME, ExistingWorkPolicy.REPLACE, req)
        }
    }
}
