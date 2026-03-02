// src/app/page.tsx
import { createClient } from '@/lib/supabaseServer';
import MemeFeed from '@/components/MemeFeed';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const emojis = ['😂', '🔥', '💀', '😭', '🤡', '🤣', '💯', '✨'];

    return (
      <main className="min-h-screen bg-[#FEF9C3] relative flex items-center justify-center p-6 overflow-hidden">

        {/* INLINE CSS FOR EMOJI ANIMATION */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes floatUp {
            0% { transform: translateY(120vh); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateY(-120vh); opacity: 0; }
          }
          .emoji-particle {
            position: absolute;
            animation: floatUp linear infinite;
            will-change: transform;
          }
        `}} />

        {/* FULL SCREEN EMOJI LAYER */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="emoji-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${12 + Math.random() * 8}s`,
                animationDelay: `${Math.random() * -20}s`,
                fontSize: `${20 + Math.random() * 30}px`
              }}
            >
              {emojis[i % emojis.length]}
            </div>
          ))}
        </div>

        {/* --- MAIN CONTENT STACK --- */}
        <div className="relative z-10 max-w-5xl w-full flex flex-col gap-6 items-center">

          {/* MAIN LOGIN CARD (TOP) */}
          <div className="w-full bg-white p-16 rounded-[4rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-1000">
            <span className="text-8xl mb-8 block transition-transform hover:rotate-12 duration-300 cursor-default">😂</span>
            <h1 className="text-7xl font-black mb-4 tracking-tighter uppercase text-slate-900 leading-[0.85]">
              The Humor <br className="md:hidden"/> Project
            </h1>
            <p className="text-slate-400 mb-12 font-bold text-xs uppercase tracking-[0.4em]">
              The world's first funny AI
            </p>

            <form action="/auth/login" method="POST" className="w-full max-w-sm">
              <button className="w-full bg-slate-900 text-white py-6 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all duration-500 active:scale-90 shadow-xl shadow-slate-900/10">
                Sign in with Google
              </button>
            </form>
          </div>

          {/* STEPS ROW (BOTTOM) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Step 01 */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-8 delay-200 duration-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Step 01</p>
              <p className="text-md font-bold text-slate-800 leading-tight">Upload any picture.</p>
            </div>

            {/* Step 02 */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-8 delay-400 duration-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Step 02</p>
              <p className="text-md font-bold leading-tight">Create your own meme with funny AI-generated captions.</p>
            </div>

            {/* Step 03 */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-8 delay-600 duration-700">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Step 03</p>
               <p className="text-md font-bold leading-tight text-slate-800">Explore and vote on the best memes in the feed.</p>
            </div>
          </div>

        </div>
      </main>
    );
  }

  return <MemeFeed userEmail={user?.email || ''} userId={user?.id || ''} />;
}