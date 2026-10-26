package com.naweagree.nwa.auth

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Attaches `X-Device-Key` to every outgoing API request so the server can
 * identify this Android device (T-W2-04 tier 0+1). If the server ever echoes
 * a new key back (edge case: the cookie flow used on web never mints for us
 * because we don't persist cookies across app restarts), we pick it up and
 * replace our stored key with it.
 *
 * The web client relies on the `nwa_dk` HTTP-only cookie. On Android we send
 * the header instead because (a) HttpCookieHandler + DataStore is more plumbing
 * than it's worth and (b) the server already supports the header explicitly
 * for non-browser clients.
 */
@Singleton
class DeviceKeyInterceptor @Inject constructor(
    private val store: DeviceKeyStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val dk = store.getOrCreate()
        val req = chain.request().newBuilder()
            .header(HEADER_NAME, dk)
            .build()
        val res = chain.proceed(req)
        // If the server echoes a key back that differs from ours, adopt it
        // (covers the case where the server mints one for a fresh install that
        // sent a placeholder — in our impl we always send the minted key so
        // this is a defensive measure only).
        val echoed = res.header(HEADER_NAME)
        if (!echoed.isNullOrBlank() && echoed != dk) {
            // Fire-and-forget on a background dispatcher. We don't want to
            // block the response pipeline for this.
            Thread {
                try {
                    runBlocking { store.setForTest(echoed) }
                } catch (_: Throwable) { /* never crash on key sync */ }
            }.apply { isDaemon = true }.start()
        }
        return res
    }

    companion object {
        const val HEADER_NAME = "x-device-key"
    }
}

private fun runBlocking(block: suspend () -> Unit) {
    kotlinx.coroutines.runBlocking(kotlinx.coroutines.Dispatchers.IO) { block() }
}
