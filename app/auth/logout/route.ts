// src/app/auth/logout/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  // 1. must await the helper
  const supabase = await createClient();

  // 2. Sign out from Supabase (clears the session)
  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;

  // 3. Clear the Next.js cache so the "Gate" realizes the user is gone
  revalidatePath('/', 'layout');

  // 4. Redirect back to the home page (where they will see the login screen)
  return NextResponse.redirect(`${origin}/`, {
    status: 303, // Use 303 for redirects after a POST request
  });
}