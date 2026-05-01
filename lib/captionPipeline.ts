import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://api.almostcrackd.ai/pipeline'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type CaptionPipelineResult =
  | { success: true; captions: unknown[]; imageUrl: string }
  | { success: false; error: string; aborted?: boolean }

export async function runCaptionPipeline(opts: {
  file: File
  token: string
  userId: string
  signal?: AbortSignal
}): Promise<CaptionPipelineResult> {
  const { file, token, userId, signal } = opts

  try {
    const s1 = await fetch(`${API_BASE}/generate-presigned-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type }),
      signal,
    })
    const presignedPayload = await s1.json().catch(() => ({}))
    if (!s1.ok) {
      throw new Error((presignedPayload as { message?: string })?.message || `Presign failed (${s1.status})`)
    }
    const { presignedUrl, cdnUrl } = presignedPayload as { presignedUrl?: string; cdnUrl?: string }
    if (!presignedUrl || !cdnUrl) throw new Error('Presign response missing URL fields')

    const arrayBuffer = await file.arrayBuffer()
    await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: Buffer.from(arrayBuffer),
      signal,
    })

    const s3 = await fetch(`${API_BASE}/upload-image-from-url`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      signal,
    })
    const regPayload = await s3.json().catch(() => ({}))
    if (!s3.ok) {
      throw new Error((regPayload as { message?: string })?.message || `Register image failed (${s3.status})`)
    }
    const { imageId } = regPayload as { imageId?: string }
    if (!imageId) throw new Error('Register image response missing imageId')

    const s4 = await fetch(`${API_BASE}/generate-captions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId }),
      signal,
    })

    const captionsArray = await s4.json().catch(() => null)
    if (!s4.ok) {
      throw new Error(typeof captionsArray === 'object' && captionsArray && 'message' in captionsArray
        ? String((captionsArray as { message?: string }).message)
        : `Caption generation failed (${s4.status})`)
    }

    const CAPTION_COUNT = 5
    const contents: string[] = (
      Array.isArray(captionsArray)
        ? captionsArray
            .map((c: unknown) => (typeof c === 'string' ? c : (c as { content?: string })?.content))
            .filter((c): c is string => typeof c === 'string')
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        : []
    ).slice(0, CAPTION_COUNT)

    // Insert only 5 captions if none exist yet.
    const { data: existingCaps, error: existingError } = await supabaseAdmin
      .from('captions')
      .select('id')
      .eq('image_id', imageId)
      .limit(1)

    if (existingError) throw new Error(existingError.message)

    const alreadyHasCaptions = (existingCaps || []).length > 0
    if (!alreadyHasCaptions && contents.length > 0) {
      const nowIso = new Date().toISOString()
      const rows = contents.map((content) => ({
        image_id: imageId,
        content,
        created_by_user_id: userId,
        modified_by_user_id: userId,
        created_datetime_utc: nowIso,
        modified_datetime_utc: nowIso,
      }))

      const { error: insertCapsError } = await supabaseAdmin.from('captions').insert(rows)
      if (insertCapsError) throw new Error(insertCapsError.message)
    }

    // If CrackdAI (or any other process) already inserted more than 5 captions for this image,
    // enforce the 5-caption rule by deleting extras.
    const { data: allCaps, error: allCapsErr } = await supabaseAdmin
      .from('captions')
      .select('id, created_datetime_utc')
      .eq('image_id', imageId)
      .order('created_datetime_utc', { ascending: true })

    if (allCapsErr) throw new Error(allCapsErr.message)

    const ids = (allCaps || []).map((c) => c.id)
    if (ids.length > CAPTION_COUNT) {
      const toDelete = ids.slice(CAPTION_COUNT)
      const { error: delErr } = await supabaseAdmin.from('captions').delete().in('id', toDelete)
      if (delErr) throw new Error(delErr.message)
    }

    const trimmedForReturn: string[] = (
      Array.isArray(captionsArray)
        ? captionsArray
            .map((c: unknown) => (typeof c === 'string' ? c : (c as { content?: string })?.content))
            .filter((c): c is string => typeof c === 'string')
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        : []
    ).slice(0, CAPTION_COUNT)

    return {
      success: true,
      captions: trimmedForReturn,
      imageUrl: cdnUrl,
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, error: 'Cancelled', aborted: true }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
