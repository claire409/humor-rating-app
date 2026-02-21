'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Initialize the Admin client with the Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function submitVote(formData: FormData) {
  // 1. Extract data from the form
  const captionId = formData.get('captionId') // This is the UUID
  const userId = formData.get('userId')       // This is the Profile UUID
  const voteValue = formData.get('vote')      // This is the number (1 or -1)
  const now = new Date().toISOString();

  // 2. Validation
  if (!captionId || !userId || !voteValue) {
    console.error("Missing data:", { captionId, userId, voteValue })
    return
  }

  // 3. Insert into database
  const { error } = await supabaseAdmin
    .from('caption_votes')
    .insert([
      {
        caption_id: captionId as string,
        profile_id: userId as string,
        vote_value: parseInt(voteValue as string),
        created_datetime_utc: now,    // Set both to the same time
        modified_datetime_utc: now     // Set both to the same time
      }
    ]);

  if (error) {
    console.error('Database Insertion Error:', error.message)
    return
  }

  // 4. Update the cache so the UI refreshes
  revalidatePath('/')
}