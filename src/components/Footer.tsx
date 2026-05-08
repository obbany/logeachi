import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 px-4 mt-auto">
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
        {/* Logo Section */}
        <div className="flex items-center mb-4 font-bold tracking-tight text-2xl">
          <span className="text-slate-900">Loge</span><span className="text-green-600">aci</span><span className="text-slate-900">.com</span>
        </div>

        {/* Description */}
        <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-2xl px-4">
          Your trusted platform for online micro-tasks and referral earnings. 
          Complete tasks, build your team, and grow your income with us.
        </p>

        {/* Copyright & Tags */}
        <div className="space-y-3">
          <p className="text-slate-700 text-sm font-medium">
            &copy; {new Date().getFullYear()} Logeaci.com. All rights reserved.
          </p>
          
          <div className="text-green-600 text-xs font-bold tracking-widest uppercase">
            @ Logeaci.com PREMIUM SERVICES
          </div>
          
          <div className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
            TRUSTED BY THOUSANDS OF USERS
          </div>
        </div>
      </div>
    </footer>
  );
};
