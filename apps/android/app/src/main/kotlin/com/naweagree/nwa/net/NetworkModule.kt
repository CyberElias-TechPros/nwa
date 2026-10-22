package com.naweagree.nwa.net

import android.content.Context
import com.naweagree.nwa.auth.DeviceKeyInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Cache
import okhttp3.OkHttpClient
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(
        @ApplicationContext ctx: Context,
        deviceKeyInterceptor: DeviceKeyInterceptor,
    ): OkHttpClient {
        val cacheDir = File(ctx.cacheDir, "http").apply { mkdirs() }
        return OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .cache(Cache(cacheDir, 10L * 1024 * 1024))
            .addInterceptor(deviceKeyInterceptor)
            // Future: add AuthInterceptor(email magic link bearer token) in W5.
            .build()
    }
}
