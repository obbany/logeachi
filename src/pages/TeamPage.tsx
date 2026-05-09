import React, { useState, useEffect } from 'react';
import { Users, UserPlus, TrendingUp, ShieldCheck, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export const TeamPage = () => {
  const { userData } = useAuth();
  const [teamMembers, setTeamMembers] = useState<{ 1: User[], 2: User[], 3: User[] }>({ 1: [], 2: [], 3: [] });
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(1);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    const fetchTeam = async () => {
      if (!userData?.referralCode) return;
      setLoading(true);
      try {
        let level1 = [];
        let level2 = [];
        let level3 = [];
        
        const level1Snap = await getDocs(query(collection(db, 'users'), where('referredBy', '==', userData.referralCode)));
        level1 = level1Snap.docs.map(doc => ({ ...doc.data() } as User));
        const level1Codes = level1.map(u => u.referralCode).filter(Boolean);

        for (let i = 0; i < level1Codes.length; i += 30) {
          const chunk = level1Codes.slice(i, i + 30);
          if (chunk.length === 0) continue;
          const q = query(collection(db, 'users'), where('referredBy', 'in', chunk));
          const snap = await getDocs(q);
          level2.push(...snap.docs.map(doc => ({ ...doc.data() } as User)));
        }

        const level2Codes = level2.map(u => u.referralCode).filter(Boolean);
        for (let i = 0; i < level2Codes.length; i += 30) {
          const chunk = level2Codes.slice(i, i + 30);
          if (chunk.length === 0) continue;
          const q = query(collection(db, 'users'), where('referredBy', 'in', chunk));
          const snap = await getDocs(q);
          level3.push(...snap.docs.map(doc => ({ ...doc.data() } as User)));
        }

        setTeamMembers({ 1: level1, 2: level2, 3: level3 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [userData]);

  const currentLevelMembers = teamMembers[activeLevel as 1 | 2 | 3];
  
  const levels = [
    { num: 1, label: 'Generation 1', commission: '10%' },
    { num: 2, label: 'Generation 2', commission: '5%' },
    { num: 3, label: 'Generation 3', commission: '3%' },
  ];

  const filteredMembers = filter === 'active' 
    ? currentLevelMembers.filter(m => m.status === 'active')
    : currentLevelMembers;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Network</h1>
          <p className="text-slate-500 text-sm">Manage and track your multi-level team earnings</p>
        </div>
        <button 
          onClick={async () => {
            const referralLink = `${window.location.origin}/register?ref=${userData.referralCode}`;
            const shareData = {
              title: 'Join my team!',
              text: 'Check out this platform and join my team using my referral code.',
              url: referralLink,
            };

            if (navigator.share) {
              try {
                await navigator.share(shareData);
              } catch (err) {
                // If user cancels or share is blocked, fallback to clipboard
                console.log("Sharing cancelled or blocked, falling back to clipboard");
                navigator.clipboard.writeText(referralLink);
                alert('Referral link copied to clipboard!');
              }
            } else {
              navigator.clipboard.writeText(referralLink);
              alert('Referral link copied to clipboard!');
            }
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <UserPlus size={18} />
          Invite Member
        </button>
      </div>

      <div className="bg-emerald-600 text-white p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-200">
        <div>
           <p className="text-emerald-100 text-sm font-medium">Total Referral Earnings</p>
           <h2 className="text-3xl font-black mt-1">৳{(userData?.totalReferralEarnings || 0).toFixed(2)}</h2>
        </div>
        <div className="bg-emerald-500 p-3 rounded-xl">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Level Tabs & Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {levels.map((lv) => (
            <button
              key={lv.num}
              onClick={() => setActiveLevel(lv.num)}
              className={cn(
                "flex-none px-6 py-3 rounded-2xl text-sm font-bold transition-all border",
                activeLevel === lv.num 
                  ? "bg-white border-blue-200 text-blue-600 shadow-sm" 
                  : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200"
              )}
            >
              GEN-{lv.num}
              <span className="ml-2 bg-current opacity-10 px-1.5 py-0.5 rounded-md text-[10px]">
                {lv.commission}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
           <button 
              onClick={() => setFilter('active')}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold", filter === 'active' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600")}
           >
             Active Members
           </button>
           <button 
              onClick={() => setFilter('all')}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold", filter === 'all' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600")}
           >
             Total Members
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4">
          <h3 className="font-bold text-slate-900">{filter === 'active' ? 'Active' : 'All'} Members in Gen {activeLevel}</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search member..." 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-600">Member</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-center">Status</th>
                <th className="px-6 py-4 font-bold text-slate-600">Joined Date</th>
                <th className="px-6 py-4 font-bold text-slate-600 text-right">Earning Contributed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => (
                <tr key={member.phone} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-blue-600">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{member.name}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] text-slate-400 font-mono">ID: {member.shortId || '...'}</p>
                           <span className="w-1 h-1 bg-slate-200 rounded-full" />
                           <p className="text-[10px] text-slate-400">{member.phone}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                        member.status === 'active' 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        {member.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {format(new Date(member.createdAt), 'dd MMMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ৳0.00
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMembers.length === 0 && !loading && (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h4 className="text-slate-900 font-bold">No {filter === 'active' ? 'active ' : ''}members found in this level</h4>
              <p className="text-slate-500 text-xs mt-1">Growth your network to see members here!</p>
            </div>
          )}

          {loading && (
            <div className="py-20 text-center animate-pulse">
              <TrendingUp className="w-12 h-12 text-blue-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Crunching team data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
