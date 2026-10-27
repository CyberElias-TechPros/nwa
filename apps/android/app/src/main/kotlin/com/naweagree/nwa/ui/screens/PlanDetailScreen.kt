package com.naweagree.nwa.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.naweagree.nwa.R
import com.naweagree.nwa.design.NwaColors

data class ParticipantRow(val name: String, val role: String, val acknowledged: Boolean)
data class FieldRow(val label: String, val value: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanDetailScreen(
    title: String,
    status: String,
    versionNumber: Int,
    participants: List<ParticipantRow>,
    fields: List<FieldRow>,
    canDownloadReceipt: Boolean,
    onBack: () -> Unit,
    onAgree: () -> Unit,
    onQuestion: () -> Unit,
    onNeedTime: () -> Unit,
    onDisagree: () -> Unit,
    onDownloadReceipt: () -> Unit,
    onResetInvite: () -> Unit,
    onShare: () -> Unit,
    onCopyLink: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(title, maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onCopyLink) { Icon(Icons.Filled.ContentCopy, contentDescription = stringResource(R.string.plan_cta_reset)) }
                    IconButton(onClick = onShare) { Icon(Icons.Filled.Share, contentDescription = stringResource(R.string.plan_cta_share)) }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(colors = CardDefaults.cardColors(containerColor = NwaColors.primary_soft)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Version $versionNumber", style = MaterialTheme.typography.labelMedium, color = NwaColors.primary_hover)
                    Spacer(Modifier.height(4.dp))
                    Text(statusLabel(status), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                }
            }

            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("People", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    participants.forEach { p ->
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(p.name)
                            AssistChip(
                                onClick = {},
                                label = { Text(if (p.acknowledged) "✓ Reviewed" else "Awaiting") },
                            )
                        }
                    }
                }
            }

            Card {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("What we agreed", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    fields.forEach { f ->
                        Column {
                            Text(f.label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(f.value, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
            }

            Text("Your response", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                FilledTonalButton(onClick = onAgree, modifier = Modifier.weight(1f, fill = false)) { Text(stringResource(R.string.plan_cta_agree)) }
                OutlinedButton(onClick = onQuestion) { Text(stringResource(R.string.plan_cta_question)) }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onNeedTime) { Text(stringResource(R.string.plan_cta_need_time)) }
                OutlinedButton(onClick = onDisagree) { Text(stringResource(R.string.plan_cta_disagree)) }
            }

            Spacer(Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDownloadReceipt, enabled = canDownloadReceipt) {
                    Icon(Icons.Filled.Download, contentDescription = null); Text("  " + stringResource(R.string.plan_cta_receipt))
                }
                OutlinedButton(onClick = onResetInvite) {
                    Icon(Icons.Filled.Refresh, contentDescription = null); Text("  " + stringResource(R.string.plan_cta_reset))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
