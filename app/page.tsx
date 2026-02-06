'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [captions, setCaptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 24; // Updated to 24 as requested

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const from = currentPage * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // { count: 'exact' } retrieves the total number of rows in the table
      const { data, error, count } = await supabase
        .from('captions')
        .select(`
          id,
          content,
          like_count,
          profiles ( first_name, last_name ),
          images ( url )
        `, { count: 'exact' })
        .range(from, to)
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setCaptions(data || []);
        if (count !== null) setTotalCount(count);
      }
      setLoading(false);
    }
    fetchData();
  }, [currentPage]);

  // Calculation for the "Showing X-Y of Z" text
  const startItem = currentPage * itemsPerPage + 1;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalCount);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (error) return <p className="p-10 text-red-500 text-center font-bold">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">The Humor Project</h1>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-slate-500 font-medium">
            <p>Page {currentPage + 1} of {totalPages || 1}</p>
            <p>
              Showing <span className="text-slate-900 font-bold">{startItem}-{endItem}</span> of{' '}
              <span className="text-slate-900 font-bold">{totalCount}</span> captions ({itemsPerPage} per page)
            </p>
          </div>
        </header>



        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {captions.map((item) => {
                const fullName = (item.profiles?.first_name || item.profiles?.last_name)
                  ? `${item.profiles?.first_name ?? ''} ${item.profiles?.last_name ?? ''}`.trim()
                  : "Anonymous";

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-all">
                    <div className="relative h-48 w-full bg-slate-200">
                      {item.images?.url ? (
                        <img
                          src={item.images.url}
                          alt="Meme"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">No image</div>
                      )}
                    </div>

                    <div className="p-4 flex-grow">
                      <p className="text-md text-slate-800 font-bold italic leading-tight">"{item.content}"</p>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700 truncate mr-2">By {fullName}</span>
                      <div className="text-blue-600 font-black text-xs whitespace-nowrap">
                        {item.like_count || 0} <span className="text-[8px] text-slate-400 uppercase">Likes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="mt-12 py-6 border-t border-slate-200 flex justify-center items-center gap-6">
              <button
                onClick={() => {
                   setCurrentPage((prev) => Math.max(0, prev - 1));
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 0}
                className="px-6 py-2 bg-white border border-slate-300 rounded-full font-bold text-slate-700 disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Previous
              </button>

              <span className="font-bold text-slate-600 text-sm">
                Page {currentPage + 1} / {totalPages}
              </span>

              <button
                onClick={() => {
                  setCurrentPage((prev) => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage >= totalPages - 1}
                className="px-6 py-2 bg-white border border-slate-300 rounded-full font-bold text-slate-700 disabled:opacity-30 hover:bg-slate-50 transition-colors shadow-sm"
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