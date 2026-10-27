package com.naweagree.nwa.net

import javax.inject.Qualifier

/** Qualifier for the API base URL (e.g. https://naweagree.app/api/proxy). */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ApiBaseUrl
