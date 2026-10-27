package com.naweagree.nwa.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.naweagree.nwa.R
import org.json.JSONObject

@Composable
fun SettingsScreen(
    onVerifyReceipt: () -> Unit,
    onPrivacy: () -> Unit,
    onReport: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.prototype_warning), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onVerifyReceipt, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.verify_title)) }
                OutlinedButton(onClick = onPrivacy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.privacy_title)) }
                OutlinedButton(onClick = onReport, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.report_title)) }
            }
        }
    }
}

@Composable
fun ReportAbuseScreen(
    onBack: () -> Unit,
    onSubmit: suspend (reason: String, description: String) -> Result<String>,
) {
    var reason by remember { mutableStateOf("other") }
    var desc by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(stringResource(R.string.report_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        OutlinedTextField(
            value = desc, onValueChange = { desc = it },
            label = { Text(stringResource(R.string.report_description_hint)) },
            modifier = Modifier.fillMaxWidth().height(160.dp),
        )
        if (message != null) Text(message!!, color = MaterialTheme.colorScheme.primary)
        if (busy) CircularProgressIndicator()
        Button(
            onClick = {
                busy = true; message = null
                kotlinx.coroutines.MainScope().launch {
                    val r = onSubmit(reason, desc)
                    busy = false
                    message = r.fold({ id -> "Report #$id sent. Thanks." }, { it.message ?: "Failed." })
                }
            },
            enabled = desc.length >= 10 && !busy,
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.report_submit)) }
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
    }
}

@Composable
fun PrivacyScreen(
    onExport: suspend () -> Result<String>,
    onDelete: suspend () -> Result<String>,
) {
    var msg by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.privacy_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.privacy_body), style = MaterialTheme.typography.bodyMedium)
        if (msg != null) Text(msg!!)
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                busy = true; msg = null
                kotlinx.coroutines.MainScope().launch {
                    msg = onExport().fold({ "Export requested." }, { it.message ?: "Failed." })
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy,
        ) { Text(stringResource(R.string.privacy_export)) }
        OutlinedButton(
            onClick = {
                busy = true; msg = null
                kotlinx.coroutines.MainScope().launch {
                    msg = onDelete().fold({ "Deletion requested." }, { it.message ?: "Failed." })
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy,
        ) { Text(stringResource(R.string.privacy_delete)) }
    }
}

@Composable
fun VerifyReceiptScreen(
    onVerify: suspend (String) -> Result<Boolean>,
) {
    var json by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.verify_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.verify_hint), style = MaterialTheme.typography.bodyMedium)
        OutlinedTextField(value = json, onValueChange = { json = it }, modifier = Modifier.fillMaxWidth().height(180.dp), label = { Text("Receipt JSON") })
        Button(
            onClick = {
                busy = true; result = null
                kotlinx.coroutines.MainScope().launch {
                    result = onVerify(json).fold({ ok -> if (ok) "Verified ✓" else "Bad receipt" }, { it.message ?: "Check the JSON." })
                    busy = false
                }
            },
            enabled = !busy && json.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (busy) "Verifying…" else "Verify") }
        result?.let {
            Text(it, color = if (it.startsWith("Verified")) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
fun OfflineScreen() {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(stringResource(R.string.offline_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.offline_body), style = MaterialTheme.typography.bodyMedium)
    }
}

@Suppress("unused")
private fun parseOrNull(s: String): JSONObject? =
    runCatching { JSONObject(s) }.getOrNull()
