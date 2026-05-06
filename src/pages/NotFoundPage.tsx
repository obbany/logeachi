import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Home, Compass } from 'lucide-react';

export const NotFoundPage = () => {
  // subtle particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    duration: Math.random() * 10 + 15,
  }));

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden flex items-center justify-center font-sans p-6 text-slate-800">
      {/* Soft radial gradients for a premium glow */}
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-50/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-slate-300"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, opacity: 0 }}
          animate={{
            y: [0, -60, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-lg w-full bg-white/70 backdrop-blur-3xl border border-white p-10 md:p-14 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] text-center"
      >
        <motion.div 
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto w-24 h-24 mb-8 bg-gradient-to-tr from-indigo-50 to-indigo-100/50 rounded-[2rem] border border-indigo-50 flex items-center justify-center shadow-inner"
        >
          <Compass className="w-10 h-10 text-indigo-500" />
        </motion.div>

        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-4">
          404
        </h1>
        <h2 className="text-xl md:text-2xl font-bold text-slate-700 mb-4 tracking-tight">
          Looks like you've wandered off
        </h2>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-10 font-medium">
          The page you are looking for doesn't exist or has been moved. Let's guide you back to familiar territory.
        </p>

        <div className="flex flex-col gap-4">
          <Link to="/dashboard" className="block relative">
            <motion.div
              animate={{ 
                boxShadow: ["0 0 0 0px rgba(99, 102, 241, 0)", "0 0 0 12px rgba(99, 102, 241, 0.1)", "0 0 0 0px rgba(99, 102, 241, 0)"]
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-2xl"
            >
              <div className="group w-full inline-flex items-center justify-center gap-3 bg-indigo-600 text-white font-black tracking-widest text-sm uppercase py-4 px-6 rounded-2xl transition-all hover:bg-indigo-700 active:scale-[0.98]">
                <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Go to Dashboard</span>
              </div>
            </motion.div>
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full inline-flex items-center justify-center gap-3 bg-transparent text-slate-500 hover:text-slate-900 font-bold tracking-widest text-sm uppercase py-4 px-6 rounded-2xl transition-all hover:bg-slate-100 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
