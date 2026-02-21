// src/components/MemeFeed.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { submitVote } from '@/app/actions';

export default function MemeFeed({ userEmail, userId }: { userEmail: string | undefined; userId: string; }) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get IDs of memes user already voted on
      const { data: voteData, error: voteError } = await supabase
        .from('caption_votes')
        .select('caption_id')
        .eq('profile_id', userId);

      if (voteError) throw voteError;
      const votedIds = new Set(voteData?.map(v => v.caption_id));

      // 2. Fetch all captions (Sorted by 'id' to avoid 'created_at' errors)
      const { data: captionData, error: captionError } = await supabase
        .from('captions')
        .select(`
          id,
          content,
          like_count,
          profiles ( first_name, last_name ),
          images ( url )
        `)
        .order('id', { ascending: true });

      if (captionError) throw captionError;

      // 3. Filter out the ones already voted on
      const unvoted = captionData?.filter(c => !votedIds.has(c.id)) || [];

      setCaptions(unvoted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">The Humor Project</h1>
            <p className="text-slate-500 text-sm">Welcome, <span className="text-blue-600 font-bold">{userEmail}</span></p>
          </div>
          <form action="/auth/logout" method="POST">
            <button className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Logout</button>
          </form>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400 italic animate-pulse">Finding fresh memes...</div>
        ) : (
          <div className="flex flex-col items-center">
            {captions.length === 0 ? (
              /* --- ALL CAUGHT UP STATE --- */
              <div className="text-center py-20 w-full bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">You're all caught up! 🏁</h2>
                <p className="text-slate-500">No more memes left to vote on right now.</p>
              </div>
            ) : (
              /* --- THE ACTIVE CARD --- */
              (() => {
                const item = captions[0];
                const fullName = (item.profiles?.first_name || item.profiles?.last_name)
                  ? `${item.profiles?.first_name ?? ''} ${item.profiles?.last_name ?? ''}`.trim()
                  : "Anonymous";

                return (
                  <div key={item.id} className="w-full bg-white rounded-3xl border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in duration-300">
                    {/* Meme Image Section */}
                    <div className="relative h-80 w-full bg-slate-200 border-b-4 border-slate-900">
                      {item.images?.url ? (
                        <img src={item.images.url} alt="Meme" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 italic">No image available</div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-10 text-center">
                      <p className="text-3xl text-slate-900 font-black italic leading-tight mb-4">"{item.content}"</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Submitted by {fullName}</p>
                    </div>

                    {/* Vote Buttons Section */}
                    <div className="px-10 py-8 bg-slate-50 border-t-4 border-slate-900 flex justify-around items-center">
                      <form action={submitVote} onSubmit={() => setTimeout(fetchData, 500)}>
                        <input type="hidden" name="captionId" value={item.id} />
                        <input type="hidden" name="userId" value={userId} />
                        <input type="hidden" name="vote" value="-1" />
                        <button type="submit" className="text-7xl hover:scale-110 active:scale-90 transition-transform cursor-pointer">👎</button>
                      </form>

                      <form action={submitVote} onSubmit={() => setTimeout(fetchData, 500)}>
                        <input type="hidden" name="captionId" value={item.id} />
                        <input type="hidden" name="userId" value={userId} />
                        <input type="hidden" name="vote" value="1" />
                        <button type="submit" className="text-7xl hover:scale-110 active:scale-90 transition-transform cursor-pointer">👍</button>
                      </form>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Queue Counter */}
            {captions.length > 0 && (
              <p className="mt-10 text-slate-400 font-bold uppercase text-xs tracking-widest">
                {captions.length} memes remaining in your queue
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}