package com.naweagree.nwa.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.naweagree.nwa.R
import com.naweagree.nwa.ui.screens.FieldRow
import com.naweagree.nwa.ui.screens.OfflineScreen
import com.naweagree.nwa.ui.screens.ParticipantRow
import com.naweagree.nwa.ui.screens.PlanDetailScreen
import com.naweagree.nwa.ui.screens.PlanListScreen
import com.naweagree.nwa.ui.screens.PlanSummary
import com.naweagree.nwa.ui.screens.PrivacyScreen
import com.naweagree.nwa.ui.screens.ReportAbuseScreen
import com.naweagree.nwa.ui.screens.SettingsScreen
import com.naweagree.nwa.ui.screens.VerifyReceiptScreen

/**
 * Single-activity entry point. Handles Android App Links of the form
 *   https://naweagree.app/j/<token>
 * by deep-linking to PlanDetail. T-W2-04 T3 extended with W6/W9 UI stubs.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NwaTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    NwaApp(incomingToken = extractInviteToken(intent))
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Deep-link navigation handled by NavController via intent data URI
    }

    private fun extractInviteToken(i: Intent?): String? {
        val data = i?.data ?: return null
        if (data.scheme != "https" && data.scheme != "http") return null
        val segs = data.pathSegments ?: return null
        if (segs.size >= 2 && segs[0] == "j") return segs[1]
        return null
    }
}

private sealed class Tab(val route: String, val labelRes: Int, val icon: @Composable () -> Unit) {
    object Plans : Tab("tab/plans", R.string.nav_plans, { Icon(Icons.Filled.List, contentDescription = null) })
    object New : Tab("tab/new", R.string.nav_new, { Icon(Icons.Filled.Add, contentDescription = null) })
    object Settings : Tab("tab/settings", R.string.nav_settings, { Icon(Icons.Filled.Settings, contentDescription = null) })
}

@Composable
private fun NwaApp(incomingToken: String?) {
    val nav = rememberNavController()
    val tabs = listOf(Tab.Plans, Tab.New, Tab.Settings)

    // Demo data — replace with Room/WorkManager sources in W6/W9.
    var plans by remember {
        mutableStateOf(
            listOf(
                PlanSummary(id = "demo-1", title = "Three ankara blouses", status = "mutually_acknowledged"),
                PlanSummary(id = "demo-2", title = "Generator repair", status = "ready_for_review"),
                PlanSummary(id = "demo-3", title = "Birthday small chops", status = "clarification_needed"),
            ),
        )
    }

    Scaffold(
        bottomBar = {
            val back by nav.currentBackStackEntryAsState()
            val current = back?.destination?.route
            if (current != null && current.startsWith("tab/")) {
                NavigationBar {
                    tabs.forEach { t ->
                        NavigationBarItem(
                            selected = current == t.route,
                            onClick = { nav.navigate(t.route) { launchSingleTop = true; popUpTo("tab/plans") { inclusive = false } } },
                            icon = t.icon,
                            label = { Text(stringResource(t.labelRes)) },
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            val back by nav.currentBackStackEntryAsState()
            if (back?.destination?.route == "tab/plans") {
                SmallFloatingActionButton(onClick = { nav.navigate("tab/new") }) {
                    Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.home_cta_start))
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            NavHost(navController = nav, startDestination = if (incomingToken != null) "plan/$incomingToken" else "tab/plans") {
                composable("tab/plans") {
                    PlanListScreen(
                        plans = plans,
                        isOffline = false,
                        onStartPlan = { nav.navigate("tab/new") },
                        onOpenPlan = { id -> nav.navigate("plan/$id") },
                    )
                }
                composable("tab/new") {
                    NewPlanStub(onCreated = { id ->
                        plans = plans + PlanSummary(id = id, title = "New plan", status = "invited")
                        nav.navigate("plan/$id") { popUpTo("tab/plans") }
                    })
                }
                composable("tab/settings") {
                    SettingsScreen(
                        onVerifyReceipt = { nav.navigate("verify") },
                        onPrivacy = { nav.navigate("privacy") },
                        onReport = { nav.navigate("report") },
                    )
                }
                composable(
                    route = "plan/{id}",
                    arguments = listOf(navArgument("id") { type = NavType.StringType }),
                    deepLinks = listOf(navDeepLink { uriPattern = "https://naweagree.app/j/{id}" }, navDeepLink { uriPattern = "https://naweagree.com/j/{id}" }),
                ) { entry ->
                    val id = entry.arguments?.getString("id").orEmpty()
                    val summary = plans.find { it.id == id }
                    PlanDetailScreen(
                        title = summary?.title ?: "Plan",
                        status = summary?.status ?: "invited",
                        versionNumber = 1,
                        participants = listOf(
                            ParticipantRow("You", "creator", acknowledged = true),
                            ParticipantRow("The other person", "provider", acknowledged = summary?.status == "mutually_acknowledged"),
                        ),
                        fields = listOf(FieldRow("What we talked about", "Demo field — connected to API in W6")),
                        canDownloadReceipt = summary?.status == "mutually_acknowledged",
                        onBack = { nav.popBackStack() },
                        onAgree = {}, onQuestion = {}, onNeedTime = {}, onDisagree = {},
                        onDownloadReceipt = {}, onResetInvite = {}, onShare = {}, onCopyLink = {},
                    )
                }
                composable("verify") { VerifyReceiptScreen() }
                composable("privacy") { PrivacyScreen(onExport = {}, onDelete = {}) }
                composable("report") { ReportAbuseScreen(onBack = { nav.popBackStack() }) }
                composable("offline") { OfflineScreen() }
            }
        }
    }
}

@Composable
private fun NewPlanStub(onCreated: (String) -> Unit) {
    Column(modifier = Modifier.padding(20.dp)) {
        Text(stringResource(R.string.home_cta_start), style = MaterialTheme.typography.headlineSmall)
        Text("W6: this will be the category/title/notes form wired to POST /v1/jobs.", style = MaterialTheme.typography.bodyMedium)
        androidx.compose.material3.Button(onClick = { onCreated("job_new_" + System.currentTimeMillis().toString(36)) }) {
            Text("Create demo plan")
        }
    }
}
