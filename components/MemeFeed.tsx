// src/components/MemeFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function MemeFeed({ userEmail }: { userEmail: string | undefined }) {
  // Initialize the browser client for the client component
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [captions, setCaptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 24;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const from = currentPage * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error: supabaseError, count } = await supabase
          .from('captions')
          .select(`
            id,
            content,
            like_count,
            profiles ( first_name, last_name ),
            images ( url )
          `, { count: 'exact' })
          .range(from, to)
          .order('id', { ascending: true });

        if (supabaseError) throw supabaseError;

        setCaptions(data || []);
        if (count !== null) setTotalCount(count);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentPage, supabase]);

  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalCount);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">The Humor Project</h1>
            <div className="flex flex-col text-slate-500 font-medium">
              <p>Welcome, <span className="text-blue-600">{userEmail}</span></p>
              <p>Page {currentPage + 1} of {totalPages || 1}</p>
              <p>
                Showing <span className="text-slate-900 font-bold">{startItem}-{endItem}</span> of{' '}
                <span className="text-slate-900 font-bold">{totalCount}</span> captions
              </p>
            </div>
          </div>

          {/* Logout Button integrated into header */}
          <form action="/auth/logout" method="POST">
            <button className="px-5 py-2 bg-white border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all text-sm">
              Logout
            </button>
          </form>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64 italic text-slate-400">Loading captions...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {captions.map((item: any) => {
                const fullName = (item.profiles?.first_name || item.profiles?.last_name)
                  ? `${item.profiles?.first_name ?? ''} ${item.profiles?.last_name ?? ''}`.trim()
                  : "Anonymous";

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="relative h-48 w-full bg-slate-200">
                      {item.images?.url ? (
                        <img src={item.images.url} alt="Meme" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">No image</div>
                      )}
                    </div>
                    <div className="p-4 flex-grow">
                      <p className="text-md text-slate-800 font-bold italic leading-tight">"{item.content}"</p>
                    </div>
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 truncate mr-2">By {fullName}</span>
                      <div className="text-blue-600 font-black text-xs">
                        {item.like_count || 0} <span className="text-[8px] text-slate-400 uppercase">Likes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 py-6 border-t border-slate-200 flex justify-center items-center gap-6">
              <button
                onClick={() => { setCurrentPage(p => p - 1); window.scrollTo(0,0); }}
                disabled={currentPage === 0}
                className="px-6 py-2 bg-white border rounded-full font-bold disabled:opacity-30"
              >
                Previous
              </button>
              <span className="font-bold text-slate-600">Page {currentPage + 1} / {totalPages}</span>
              <button
                onClick={() => { setCurrentPage(p => p + 1); window.scrollTo(0,0); }}
                disabled={currentPage >= totalPages - 1}
                className="px-6 py-2 bg-white border rounded-full font-bold disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}