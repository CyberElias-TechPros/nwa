package com.naweagree.nwa.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.naweagree.nwa.R
import com.naweagree.nwa.design.NwaColors
import java.text.DateFormat
import java.util.Date

data class PlanSummary(
    val id: String,
    val title: String,
    val status: String,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Composable
fun PlanListScreen(
    plans: List<PlanSummary>,
    isOffline: Boolean,
    onStartPlan: () -> Unit,
    onOpenPlan: (String) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        if (isOffline) {
            androidx.compose.material3.Surface(color = NwaColors.gold_soft) {
                Text(
                    text = stringResource(R.string.home_offline_banner),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                )
            }
        }
        if (plans.isEmpty()) {
            EmptyState(onStartPlan = onStartPlan)
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item { Spacer(Modifier.height(8.dp)) }
                items(plans, key = { it.id }) { plan ->
                    Card(
                        onClick = { onOpenPlan(plan.id) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(plan.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                Text(statusLabel(plan.status), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(plan.updatedAt)),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(88.dp)) }
            }
        }
    }
}

@Composable
private fun EmptyState(onStartPlan: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(stringResource(R.string.home_empty_title), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            stringResource(R.string.home_empty_body),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        ExtendedFloatingActionButton(onClick = onStartPlan) {
            Text(stringResource(R.string.home_cta_start))
        }
    }
}

@Composable
fun statusLabel(s: String): String = when (s) {
    "mutually_acknowledged" -> stringResource(R.string.plan_status_mutual)
    "invited" -> stringResource(R.string.plan_status_invited)
    "ready_for_review" -> stringResource(R.string.plan_status_review)
    "partially_acknowledged" -> stringResource(R.string.plan_status_partial)
    "clarification_needed" -> stringResource(R.string.plan_status_clarification)
    "stalled" -> stringResource(R.string.plan_status_stalled)
    else -> s.replace("_", " ").replaceFirstChar { it.uppercase() }
}
