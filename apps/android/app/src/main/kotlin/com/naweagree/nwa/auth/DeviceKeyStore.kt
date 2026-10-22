package com.naweagree.nwa.auth

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.security.SecureRandom
import javax.inject.Inject
import javax.inject.Singleton

/**
 * T-W2-04 tier 0+1: persistent device identity for Android.
 *
 * Mirrors the `nwa_dk` cookie the web/PWA client uses. We persist a 16-byte
 * hex key in DataStore and echo it on every API request via [DeviceKeyInterceptor].
 * The server binds participants to this key on createJob/claimInvite so that
 * returning users land directly on "their plans" without signing in.
 *
 * Keys are minted lazily on first request so we never block app start with IO.
 */
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nwa_device")

private object Keys {
    val DEVICE_KEY = stringPreferencesKey("device_key")
}

@Singleton
class DeviceKeyStore @Inject constructor(
    @ApplicationContext private val ctx: Context,
) {
    private val secureRandom = SecureRandom()

    val deviceKeyFlow: Flow<String?> = ctx.dataStore.data.map { prefs -> prefs[Keys.DEVICE_KEY] }

    /**
     * Returns the device key, minting and persisting one if none exists yet.
     * Safe to call from the okhttp interceptor (which is a suspend-friendly
     * Call, but for simplicity we block there — datastore read is fast).
     */
    fun getOrCreate(): String {
        val prefs = runBlocking { ctx.dataStore.data.first() }
        val existing = prefs[Keys.DEVICE_KEY]
        if (!existing.isNullOrBlank()) return existing
        val newKey = ByteArray(16).also { secureRandom.nextBytes(it) }.joinToString("") { "%02x".format(it) }
        runBlocking { ctx.dataStore.edit { it[Keys.DEVICE_KEY] = newKey } }
        return newKey
    }

    /** Test-only: force a specific key (used on sign-out). */
    suspend fun setForTest(key: String?) {
        ctx.dataStore.edit { prefs ->
            if (key == null) prefs.remove(Keys.DEVICE_KEY) else prefs[Keys.DEVICE_KEY] = key
        }
    }
}
