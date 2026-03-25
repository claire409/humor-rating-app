// src/app/auth/login/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        // Force Google to show the account chooser instead of silently reusing
        // the last signed-in Google session.
        prompt: 'select_account',
      },
    },
  });

  if (data.url) {
    return NextResponse.redirect(data.url, { status: 303 }); // 303 is better for POST-to-GET redirects
  }

  return NextResponse.redirect(`${origin}/?error=failed`);
}