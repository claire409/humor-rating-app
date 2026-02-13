// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    // 1. Await the async helper
    const supabase = await createClient();

    // 2. Exchange the temporary code for a permanent session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Callback Error:', error);
      return NextResponse.redirect(`${origin}/?error=session_failed`);
    }
  }

  // 3. Return to the home page (now with a cookie set)
  return NextResponse.redirect(`${origin}/`);
}