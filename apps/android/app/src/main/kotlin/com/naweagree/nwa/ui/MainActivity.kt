package com.naweagree.nwa.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.naweagree.nwa.R

/**
 * Single-activity entry point. Handles Android App Links in the form
 *   https://naweagree.app/j/<token>
 * by extracting the invite token out of the intent data. T-W2-04 T3.
 */
class MainActivity : ComponentActivity() {

    private var pendingInviteToken by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingInviteToken = extractInviteToken(intent)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    HomeScreen(inviteToken = pendingInviteToken, onClearToken = { pendingInviteToken = null })
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        pendingInviteToken = extractInviteToken(intent)
    }

    private fun extractInviteToken(i: Intent?): String? {
        val data = i?.data ?: return null
        if (data.scheme != "https" && data.scheme != "http") return null
        val segs = data.pathSegments ?: return null
        // Match /j/<token>
        if (segs.size >= 2 && segs[0] == "j") return segs[1]
        return null
    }
}

@Composable
fun HomeScreen(inviteToken: String?, onClearToken: () -> Unit) {
    Column(
        modifier = Modifier.padding(24.dp).fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("NaWeAgree", style = MaterialTheme.typography.headlineMedium)
        Text(stringResource(R.string.prototype_warning), style = MaterialTheme.typography.bodyMedium)
        if (inviteToken != null) {
            Text(
                text = "Opened invite: $inviteToken",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                "W6/W9: this will route to the plan view and attach X-Device-Key automatically.",
                style = MaterialTheme.typography.bodySmall,
            )
        } else {
            Text("Android native app — Kotlin + Jetpack Compose + Room + WorkManager + Hilt. Scaffold ready; see docs/03 for the full plan.")
        }
        Text(
            "Device identity: a CSPRNG key is minted on first launch, stored in DataStore, and sent as X-Device-Key on every API call — matching the web cookie.",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
