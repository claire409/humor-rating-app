'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { submitVote, processImageUpload } from '@/app/actions';

type Tab = 'feed' | 'create';

export default function MemeFeed({ userEmail, userId }: { userEmail: string; userId: string; }) {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Store an array of history items
  const [history, setHistory] = useState<any[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH HISTORY: Gets all user images and their captions ---
  const fetchUploadHistory = useCallback(async () => {
    const { data: images } = await supabase
      .from('images')
      .select('id, url, created_datetime_utc')
      .eq('profile_id', userId)
      .order('created_datetime_utc', { ascending: false });

    if (images && images.length > 0) {
      const historyWithCaptions = await Promise.all(
        images.map(async (img) => {
          const { data: caps } = await supabase
            .from('captions')
            .select('content')
            .eq('image_id', img.id);
          return { ...img, captions: caps || [] };
        })
      );
      setHistory(historyWithCaptions);
    }
  }, [supabase, userId]);

  // --- FETCH FEED: Gets captions for the voting tab ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: vData } = await supabase.from('caption_votes').select('caption_id').eq('profile_id', userId);
    const votedIds = new Set(vData?.map(v => v.caption_id));
    const { data: cData } = await supabase.from('captions')
      .select(`id, content, profiles(first_name), images(url)`)
      .order('id', { ascending: false });

    setCaptions(cData?.filter(c => !votedIds.has(c.id)) || []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchData();
    fetchUploadHistory();
  }, [fetchData, fetchUploadHistory]);

  const handleVote = async (captionId: string, voteValue: number) => {
    const formData = new FormData();
    formData.append('captionId', captionId);
    formData.append('userId', userId);
    formData.append('vote', voteValue.toString());
    await submitVote(formData);
    fetchData();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("File too large. Please keep it under 4MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setDisplayName(file.name);
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';

    if (isHeic) {
      try {
        const module = await import('heic2any');
        const heic2any = module.default || module;
        const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.7 });
        const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const newFile = new File([resultBlob], file.name, { type: 'image/jpeg' });
        setSelectedFile(newFile);
        setPreviewUrl(URL.createObjectURL(resultBlob));
      } catch (err) {
        alert("HEIC conversion failed.");
      }
    } else {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setDisplayName("");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const { data: { session } } = await supabase.auth.getSession();
      const result = await processImageUpload(formData, session?.access_token!);

      if (result.success) {
        handleClearImage();
        setHistory([]); // Force UI reset
        await fetchUploadHistory();
        await fetchData();
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to upload. The AI might be busy!");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] relative">
      <div className="fixed inset-0 bg-dot-grid opacity-[0.03] pointer-events-none"></div>

      <div className="relative z-10 text-slate-900 font-sans">
        <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">😂</span>
            <span className="font-bold tracking-widest text-sm uppercase text-slate-900">The Humor Project</span>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex items-center gap-8">
              {['feed', 'create'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as Tab)}
                  className={`text-[11px] font-bold tracking-[0.2em] uppercase transition-all ${
                    activeTab === tab ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] text-slate-400 font-medium tracking-wider">{userEmail}</span>
              <form action="/auth/logout" method="POST">
                <button className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-900 border border-slate-900 rounded-full hover:bg-slate-900 hover:text-white transition-all">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </nav>

        <main className="max-w-xl mx-auto py-16 px-4">
          {activeTab === 'feed' ? (
             <section className="space-y-12">
             {loading ? (
               <div className="flex flex-col items-center justify-center py-24 gap-4">
                 <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                 <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Loading Feed</p>
               </div>
             ) : captions.length > 0 ? (
               (() => {
                 const item = captions[0];
                 return (
                   <div key={item.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-700">
                     <img src={item.images?.url} className="w-full h-[450px] object-cover border-b border-slate-100" alt="Meme" />
                     <div className="p-12 text-center space-y-4">
                       <p className="text-2xl font-bold text-slate-900 leading-snug">"{item.content}"</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Curated by {item.profiles?.first_name || 'Anonymous'}</p>
                     </div>
                     <div className="flex border-t border-slate-100 divide-x divide-slate-100 h-24">
                       <button onClick={() => handleVote(item.id, -1)} className="flex-1 h-full text-4xl hover:bg-slate-50 transition-colors opacity-60 hover:opacity-100">👎</button>
                       <button onClick={() => handleVote(item.id, 1)} className="flex-1 h-full text-4xl hover:bg-slate-50 transition-colors opacity-60 hover:opacity-100">👍</button>
                     </div>
                   </div>
                 );
               })()
             ) : (
               <div className="text-center py-32 border border-slate-200 rounded-[3rem] bg-white/50">
                 <p className="text-slate-400 font-bold tracking-[0.2em] text-[10px] uppercase">All caught up</p>
               </div>
             )}
           </section>
          ) : (
            <section className="space-y-12 animate-in fade-in duration-500">
              <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold mb-8 text-slate-900 tracking-tight text-center">AI Caption Generator</h2>
                <form onSubmit={handleUpload} className="space-y-8">
                  <div className="relative border border-slate-100 rounded-3xl p-6 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all group overflow-hidden">
                    {!selectedFile ? (
                      <div className="py-6 transition-all text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          name="image"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
                          required
                          onChange={handleFileChange}
                          className="block w-full text-xs text-slate-400 file:mr-6 file:py-2 file:px-5 file:rounded-full file:border file:border-slate-200 file:bg-white file:text-slate-900 file:font-bold hover:file:bg-slate-50 transition-all cursor-pointer"
                        />
                        <div className="mt-4 space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            JPG, PNG, WEBP, GIF, HEIC
                          </p>
                          <p className="text-[9px] text-slate-300 uppercase tracking-[0.2em]">
                            Max file size: 4MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200">
                          <img src={previewUrl || ""} alt="Preview" className="w-full h-48 object-contain bg-slate-50" />
                          <button type="button" onClick={handleClearImage} className="absolute top-2 right-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-red-500 hover:bg-red-50 transition-all shadow-sm">✕ Change</button>
                        </div>
                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayName}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <button disabled={isUploading || !selectedFile} className="w-full bg-slate-900 text-white py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all">
                      {isUploading ? "Processing..." : "Generate captions"}
                    </button>
                    {isUploading && (
                      <p className="text-center text-[10px] font-medium text-slate-400 animate-pulse uppercase tracking-[0.1em]">This may take a few seconds...</p>
                    )}
                  </div>
                </form>
              </div>

              {/* HISTORY SECTION */}
              {history.length > 0 && (
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="h-[1px] flex-1 bg-slate-200"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Your Creation History</p>
                      <div className="h-[1px] flex-1 bg-slate-200"></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-70">Showing from most recent</p>
                  </div>

                  <div className="space-y-12">
                    {history.map((item) => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm animate-in fade-in duration-500">
                         <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                          <img
                            src={`${item.url}?t=${Date.now()}`}
                            className="w-full max-h-[400px] object-contain mx-auto"
                            alt="Uploaded"
                          />
                        </div>
                        <div className="grid gap-3">
                          {item.captions.map((cap: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                              <p className="text-sm font-medium text-slate-800 italic">"{cap.content}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}