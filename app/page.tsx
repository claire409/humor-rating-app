// src/app/page.tsx
import { createClient } from '@/lib/supabaseServer';
import MemeFeed from '@/components/MemeFeed';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. GATED UI: If no user, show the Login screen
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="bg-slate-800 p-12 rounded-3xl shadow-2xl border border-slate-700 max-w-sm">
          <h1 className="text-3xl font-black mb-4 tracking-tight">The Humor Project</h1>
          <p className="text-slate-400 mb-8 font-medium text-sm">This content is protected. Please sign in to explore the feed.</p>
          <form action="/auth/login" method="POST">
            <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all shadow-lg text-white">
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 2. PROTECTED UI: Show original Assignment 2 visual
  return <MemeFeed userEmail={user.email} />;
}