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
import { collection, query, where, getDocs } from 'firebase/firestore';
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

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!userData?.uid) return;
      
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const snap = await getDocs(query(collection(db, 'users'), where('status', '==', 'active')));
      const allUsers = snap.docs.map(doc => ({ ...doc.data() }));

      const level1 = allUsers.filter(u => u.referredBy === userData.referralCode);
      const level1Codes = level1.map(u => u.referralCode);
      const level2 = allUsers.filter(u => level1Codes.includes(u.referredBy) && u.referredBy);
      const level2Codes = level2.map(u => u.referralCode);
      const level3 = allUsers.filter(u => level2Codes.includes(u.referredBy) && u.referredBy);

      setTeamLevels({ 
        1: level1.length, 
        2: level2.length, 
        3: level3.length 
      });
      setTeamSize(level1.length + level2.length + level3.length);

      const allTeam = [...level1, ...level2, ...level3];
      const newTeam = allTeam.filter(u => u.activatedAt && u.activatedAt.toDate() >= last24h);
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
          return createdAt >= last24h;
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Activation Banner */}
      {userData?.status === 'inactive' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] shadow-xl shadow-amber-50/50"
        >
          <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
            <Lock size={32} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="text-amber-900 text-xl font-black tracking-tight">Account Restricted</h4>
            <p className="text-amber-700 text-sm mt-1 max-w-lg">Your account is currently inactive. Activate now to unlock premium high-reward tasks, team earnings, and fast withdrawals.</p>
          </div>
          <button 
            onClick={() => navigate('/activate')}
            className="w-full sm:w-auto bg-amber-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-amber-200 hover:bg-amber-700 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
          >
            Activate Account Now
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
          trend={`+${formatCurrency(earnings24h || 0)}`}
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
          value={userData?.status === 'active' ? 'Active' : 'Inactive'} 
          icon={Activity} 
          color={userData?.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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

