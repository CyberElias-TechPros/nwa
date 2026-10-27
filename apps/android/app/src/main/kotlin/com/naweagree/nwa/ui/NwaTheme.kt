package com.naweagree.nwa.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.naweagree.nwa.design.NwaColors

private val Light = lightColorScheme(
    primary = NwaColors.primary,
    onPrimary = Color.White,
    primaryContainer = NwaColors.primary_soft,
    secondary = NwaColors.teal,
    secondaryContainer = NwaColors.teal_soft,
    tertiary = NwaColors.gold,
    background = NwaColors.bg,
    surface = NwaColors.surface,
    surfaceVariant = NwaColors.surface_muted,
    onBackground = NwaColors.text,
    onSurface = NwaColors.text,
    onSurfaceVariant = NwaColors.text_muted,
    outline = NwaColors.border,
    outlineVariant = NwaColors.border_strong,
    error = NwaColors.danger,
    errorContainer = NwaColors.danger_soft,
)

private val Dark = darkColorScheme(
    primary = Color(0xFFF4A261),
    onPrimary = Color(0xFF3A1A00),
    primaryContainer = NwaColors.primary_hover,
    secondary = Color(0xFF5CC2B8),
    background = Color(0xFF0C0A09),
    surface = Color(0xFF171310),
    surfaceVariant = Color(0xFF2A2420),
    onBackground = Color(0xFFF4EDE4),
    onSurface = Color(0xFFF4EDE4),
    onSurfaceVariant = Color(0xFFB5A99B),
    outline = Color(0xFF3B332C),
    error = Color(0xFFFF6B6B),
)

@Composable
fun NwaTheme(content: @Composable () -> Unit) {
    val scheme = if (isSystemInDarkTheme()) Dark else Light
    MaterialTheme(colorScheme = scheme, typography = NwaTypography, content = content)
}
