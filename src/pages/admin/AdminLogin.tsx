import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Hardcoded credentials as requested
    if (username === 'Robbany0070' && password === 'Robbany@#1321') {
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl mb-4">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Admin Control</h1>
            <p className="text-slate-500 text-sm">LogeAchi System Administration</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4 active:scale-[0.98]"
            >
              Sign In to Panel
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-sm">
          Protected Administrative Area &bull; &copy; 2026 LogeAchi
        </p>
      </motion.div>
    </div>
  );
};
