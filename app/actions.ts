'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { runCaptionPipeline } from '@/lib/captionPipeline'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export async function processImageUpload(formData: FormData, token: string, userId: string) {
  const file = formData.get('image') as File;
  const result = await runCaptionPipeline({ file, token, userId })
  if (result.success) revalidatePath('/')
  return result
}

export async function deleteUserMeme(formData: FormData) {
  const imageId = formData.get('imageId') as string;
  const userId = formData.get('userId') as string;

  if (!imageId || !userId) throw new Error('Missing imageId or userId');

  const { data: img, error: imgErr } = await supabaseAdmin
    .from('images')
    .select('id, profile_id')
    .eq('id', imageId)
    .maybeSingle();

  if (imgErr) throw new Error(imgErr.message);
  if (!img || img.profile_id !== userId) throw new Error('Not allowed');

  const { data: caps, error: capsErr } = await supabaseAdmin
    .from('captions')
    .select('id')
    .eq('image_id', imageId);

  if (capsErr) throw new Error(capsErr.message);

  const captionIds = (caps || []).map((c) => c.id);
  if (captionIds.length > 0) {
    const { error: votesErr } = await supabaseAdmin
      .from('caption_votes')
      .delete()
      .in('caption_id', captionIds);
    if (votesErr) throw new Error(votesErr.message);
  }

  const { error: delCapsErr } = await supabaseAdmin
    .from('captions')
    .delete()
    .eq('image_id', imageId);
  if (delCapsErr) throw new Error(delCapsErr.message);

  const { error: delImgErr } = await supabaseAdmin
    .from('images')
    .delete()
    .eq('id', imageId)
    .eq('profile_id', userId);
  if (delImgErr) throw new Error(delImgErr.message);

  revalidatePath('/');
}