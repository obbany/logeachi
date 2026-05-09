import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  Users, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Trophy,
  Activity,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2.5 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="text-emerald-500 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
          <ArrowUpRight size={12} />
          {trend}
        </span>
      )}
    </div>
    <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
  </motion.div>
);

export const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [teamSize, setTeamSize] = useState(0);
  const [newTeamSize, setNewTeamSize] = useState(0);
  const [teamLevels, setTeamLevels] = useState({ 1: 0, 2: 0, 3: 0 });
  const [earnings24h, setEarnings24h] = useState(0);
  const [payouts, setPayouts] = useState<Array<{amount: number, time: string}>>([]);
  const [supportLinks, setSupportLinks] = useState<any>(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!userData?.uid) return;
      
      const supportSnap = await getDoc(doc(db, 'settings', 'support'));
      if (supportSnap.exists()) {
        setSupportLinks(supportSnap.data());
      }
      
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      let level1 = [];
      let level2 = [];
      let level3 = [];

      if (userData.referralCode) {
        const level1Snap = await getDocs(query(collection(db, 'users'), where('referredBy', '==', userData.referralCode)));
        level1 = level1Snap.docs.map(doc => ({ ...doc.data() }));
        const level1Codes = level1.map(u => u.referralCode).filter(Boolean);

        for (let i = 0; i < level1Codes.length; i += 30) {
          const chunk = level1Codes.slice(i, i + 30);
          if (chunk.length === 0) continue;
          const q = query(collection(db, 'users'), where('referredBy', 'in', chunk));
          const snap = await getDocs(q);
          level2.push(...snap.docs.map(doc => ({ ...doc.data() })));
        }
        
        const level2Codes = level2.map(u => u.referralCode).filter(Boolean);
        for (let i = 0; i < level2Codes.length; i += 30) {
          const chunk = level2Codes.slice(i, i + 30);
          if (chunk.length === 0) continue;
          const q = query(collection(db, 'users'), where('referredBy', 'in', chunk));
          const snap = await getDocs(q);
          level3.push(...snap.docs.map(doc => ({ ...doc.data() })));
        }
      }

      setTeamLevels({ 
        1: level1.length, 
        2: level2.length, 
        3: level3.length 
      });
      setTeamSize(level1.length + level2.length + level3.length);

      const allTeam = [...level1, ...level2, ...level3];
      const newTeam = allTeam.filter(u => {
        if (!u.activatedAt) return false;
        const activatedAtDate = typeof u.activatedAt.toDate === 'function' ? u.activatedAt.toDate() : new Date(u.activatedAt);
        return activatedAtDate >= todayMidnight;
      });
      setNewTeamSize(newTeam.length);

      // Fetch 24h Earnings
      const q = query(collection(db, 'transactions'), 
        where('userId', 'in', [userData.uid, userData.phone].filter(Boolean))
      );
      
      const tSnap = await getDocs(q);
      
      const totalEarnings = tSnap.docs
        .filter(d => {
          const data = d.data();
          if (!data.createdAt) return false;
          const createdAt = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
          return createdAt >= todayMidnight;
        })
        .reduce((sum, d) => sum + (d.data().amount || 0), 0);
      
      setEarnings24h(totalEarnings);
    };

    // Generate payouts based on current hour to ensure it changes roughly every hour
    const hourChunk = Math.floor(Date.now() / (1000 * 60 * 60));
    
    const seededRandom = (seed: number, index: number) => {
        let x = Math.sin(seed + index) * 10000;
        return x - Math.floor(x);
    };

    const newPayouts = Array.from({ length: 5 }).map((_, i) => ({
      amount: 200 + Math.floor(seededRandom(hourChunk, i) * 101), // 200 to 300
      time: Math.floor(seededRandom(hourChunk + 1, i) * 12) + 1 + " hours ago"
    }));
    
    setPayouts(newPayouts);
    fetchTeamData();
  }, [userData]);

  const referralLink = `${window.location.origin}/register?ref=${userData?.referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = userData?.planExpiresAt && new Date(userData.planExpiresAt).getTime() < Date.now();
  const displayStatus = userData?.status === 'active' ? (isExpired ? 'Expired' : 'Active') : 'Inactive';
  const statusColor = userData?.status === 'active' ? (isExpired ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-400';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Activation Banner */}
      {(userData?.status === 'inactive' || isExpired) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] shadow-xl shadow-amber-50/50"
        >
          <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
            <Lock size={32} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-amber-900 text-xl font-black tracking-tight">{isExpired ? 'Plan Expired' : 'Account Restricted'}</h4>
            <p className="text-amber-700 text-sm mt-1 max-w-lg">
              {isExpired 
                ? 'Your current plan has expired. Please upgrade or renew your plan to continue earning.' 
                : 'Your account is currently inactive. Activate now to unlock premium high-reward tasks, team earnings, and fast withdrawals.'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/activation-payment')}
            className="w-full sm:w-auto bg-amber-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-amber-200 hover:bg-amber-700 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
          >
            {isExpired ? 'Renew Plan' : 'Activate Now'}
          </button>
        </motion.div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Main Balance" 
          value={formatCurrency(userData?.balance || 0)} 
          icon={Wallet} 
          color="bg-blue-600"
        />
        <StatCard 
          title="Total Withdraw" 
          value={formatCurrency(userData?.totalWithdraw || 0)} 
          icon={ArrowUpRight} 
          color="bg-emerald-600"
        />
        <StatCard 
          title="Team Members" 
          value={teamSize} 
          icon={Users} 
          color="bg-purple-600"
          trend={`+${newTeamSize} new`}
        />
        <StatCard 
          title="Account Status" 
          value={displayStatus} 
          icon={Activity} 
          color={statusColor}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Telegram Channel Banner */}
          <div className="bg-gradient-to-r from-[#0088cc] to-[#33a8ff] p-6 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md shadow-blue-100">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <svg className="w-8 h-8 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.509-.165-.914-.253-.88-.535.017-.146.212-.294.526-.457 2.112-.917 5.09-2.2 7.15-3.056 3.42-1.42 4.126-1.666 4.582-1.674z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Main Telegram Channel</h3>
                <p className="text-blue-100 text-sm mt-1 max-w-sm">Join our official channel for real-time task updates, payment proofs, and latest announcements.</p>
              </div>
            </div>
            <a 
              href={supportLinks?.mainChannel || '#'} 
              target="_blank" 
              rel="noreferrer"
              className="w-full sm:w-auto bg-white text-[#0088cc] px-8 py-4 rounded-xl font-black tracking-wide text-sm shrink-0 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Join Channel
              <ChevronRight size={18} strokeWidth={3} />
            </a>
          </div>

          {/* Referral Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="text-amber-500 w-5 h-5" />
              Refer & Earn
            </h3>
            <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded-full">
              Up to Level 3
            </span>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-[2rem] border-2 border-dashed border-slate-100 relative group">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Your Invitation Link</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-600 flex items-center overflow-hidden shadow-sm">
                <span className="truncate">{referralLink}</span>
              </div>
              <button 
                onClick={copyToClipboard}
                className={cn(
                  "shrink-0 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 whitespace-nowrap",
                  copied ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800"
                )}
              >
                {copied ? <CheckCircle2 size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            {[1, 2, 3].map(lv => (
              <div key={lv} className="flex-1 min-w-[120px] bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Team LV-{lv}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{teamLevels[lv as keyof typeof teamLevels]}</p>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
            <h4 className="font-bold text-lg mb-1">Daily Task</h4>
            <p className="text-blue-100 text-xs mb-4">Complete your jobs today and earn up to ৳50</p>
            <button 
              onClick={() => navigate('/tasks')}
              className="w-full bg-white text-blue-600 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2"
            >
              Start Work
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Recent Payouts</h4>
            <div className="space-y-4">
              {payouts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <ExternalLink size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Withdrawal Success</p>
                      <p className="text-[10px] text-slate-500">{p.time}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-emerald-600">+৳{p.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

