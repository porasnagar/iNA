package dev.ibridge.android

/**
 * Base64 copies of the 3D product renders, decoded with BitmapFactory.decodeByteArray so the
 * art renders even when only the Kotlin sources are copied into a project.
 *
 * This stub is replaced by the fully generated file when you use "Download project (.zip)"
 * or the download button for this file in the iNA source viewer.
 */
object EmbeddedProductArt {
    private val CHUNKS: Map<String, Array<String>> = emptyMap()

    fun base64(resName: String): String? = CHUNKS[resName]?.joinToString(separator = "")
}
