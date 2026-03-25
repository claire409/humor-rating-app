'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_BASE = "https://api.almostcrackd.ai/pipeline";

// --- VOTING LOGIC (Assignments 3 & 4) ---
export async function submitVote(formData: FormData) {
  const captionId = formData.get('captionId') as string;
  const userId = formData.get('userId') as string;
  const voteValue = parseInt(formData.get('vote') as string);

  // Allow users to change their vote by ensuring only one row exists
  // per (caption_id, profile_id). We do this as delete-then-insert to
  // avoid relying on a specific DB unique constraint/index name.
  const { error: deleteError } = await supabaseAdmin
    .from('caption_votes')
    .delete()
    .eq('caption_id', captionId)
    .eq('profile_id', userId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabaseAdmin
    .from('caption_votes')
    .insert([
      {
        caption_id: captionId,
        profile_id: userId,
        vote_value: voteValue,
        // New schema fields (non-nullable): track the actor for insert/update.
        created_by_user_id: userId,
        modified_by_user_id: userId,
        created_datetime_utc: new Date().toISOString(),
        modified_datetime_utc: new Date().toISOString(),
      },
    ]);

  if (insertError) throw new Error(insertError.message);
  revalidatePath('/');
}

// --- AI PIPELINE LOGIC (Assignment 5) ---

export async function processImageUpload(formData: FormData, token: string) {
  const file = formData.get('image') as File;

  try {
    // Step 1: Presigned URL
    const s1 = await fetch(`${API_BASE}/generate-presigned-url`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type })
    });
    const { presignedUrl, cdnUrl } = await s1.json();

    // Step 2: S3 Upload
    const arrayBuffer = await file.arrayBuffer();
    await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: Buffer.from(arrayBuffer)
    });

    // Step 3: Register Image
    const s3 = await fetch(`${API_BASE}/upload-image-from-url`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
    });
    const { imageId } = await s3.json();

    // Step 4: Generate Captions
    const s4 = await fetch(`${API_BASE}/generate-captions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ imageId })
        });

        const captionsArray = await s4.json(); // Array of 5+ captions

        revalidatePath('/');
        return {
          success: true,
          captions: captionsArray, // Return the whole list
          imageUrl: cdnUrl
        };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}