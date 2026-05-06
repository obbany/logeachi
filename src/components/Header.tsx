import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, User, LogOut, UserCircle, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { userData } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 lg:px-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <Link to="/dashboard" className="flex items-center lg:hidden text-lg font-bold tracking-tight">
          <span className="text-slate-900">Loge</span><span className="text-green-600">aci</span><span className="text-slate-900">.com</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-100 rounded-full relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 border-l border-slate-200 pl-4 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{userData?.name || 'User'}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {userData?.status || 'inactive'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 overflow-hidden">
                <img 
                    src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${userData?.uid || 'guest'}`} 
                    alt="User" 
                    className="w-full h-full object-cover" 
                />
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isProfileOpen && "rotate-180")} />
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 z-50 overflow-hidden"
              >
                <div className="px-4 py-2 mb-2 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
                </div>
                
                <Link
                  to="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <UserCircle size={18} />
                  My Profile
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <ShieldCheck size={18} />
                  Settings
                </Link>
                
                <button
                  onClick={() => {
                    auth.signOut();
                    setIsProfileOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
