import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Phone, 
  MapPin, 
  Wallet,
  TrendingUp,
  Users,
  Award,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const InfoRow = ({ icon: Icon, label, value }: any) => (
  <div className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0 font-sans">
    <div className="bg-slate-50 p-2.5 rounded-xl text-slate-400">
      <Icon size={18} />
    </div>
    <div className="flex-1">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, colorClass }: any) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <div className={`p-2.5 rounded-2xl ${colorClass.bg}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">{label}</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        </div>
    </div>
  );
};

export const ProfilePage = () => {
  const { userData } = useAuth();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const [teamSize, setTeamSize] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    const fetchProfileStats = async () => {
      if (!userData?.uid) return;

      // Fetch team data
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const allUsers = usersSnap.docs.map(doc => ({ ...doc.data() }));

      const level1 = allUsers.filter(u => u.referredBy === (userData.referralCode || '').toUpperCase() && u.referredBy);
      const level1Codes = level1.map(u => (u.referralCode || '').toUpperCase());
      const level2 = allUsers.filter(u => level1Codes.includes((u.referredBy || '').toUpperCase()) && u.referredBy);
      const level2Codes = level2.map(u => (u.referralCode || '').toUpperCase());
      const level3 = allUsers.filter(u => level2Codes.includes((u.referredBy || '').toUpperCase()) && u.referredBy);

      setTeamSize(level1.length + level2.length + level3.length);

      // Fetch Total Earned (Lifetime)
      const q = query(collection(db, 'transactions'), 
        where('userId', 'in', [userData.uid, userData.phone].filter(Boolean))
      );
      
      const tSnap = await getDocs(q);
      
      const earnings = tSnap.docs
        .filter(d => {
          const data = d.data();
          // Count positive transaction amounts as earnings, excluding deposits/withdrawals
          if (!data.amount || data.amount <= 0) return false;
          return data.type !== 'deposit' && data.type !== 'withdrawal' && data.type !== 'payment'; 
        })
        .reduce((sum, d) => sum + (d.data().amount || 0), 0);
      
      setTotalEarned(earnings);
    };

    fetchProfileStats();
  }, [userData]);

  const copyId = () => {
    const idToCopy = userData?.shortId || userData?.uid;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!userData) return (
      <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
  );

  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${userData.uid}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile Summary</h1>
        <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${userData.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {userData.status?.toUpperCase() || 'N/A'}
        </div>
      </div>
        
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Balance" value={formatCurrency(userData.balance || 0).replace('BDT', '৳')} colorClass={{ bg: 'bg-blue-600', text: 'text-blue-600' }} />
        <StatCard icon={TrendingUp} label="Total Earned" value={formatCurrency(totalEarned).replace('BDT', '৳')} colorClass={{ bg: 'bg-emerald-600', text: 'text-emerald-600' }} />
        <StatCard icon={Users} label="My Team" value={teamSize} colorClass={{ bg: 'bg-indigo-600', text: 'text-indigo-600' }} />
        <StatCard icon={Award} label="Referral ID" value={userData.referralCode || 'N/A'} colorClass={{ bg: 'bg-amber-600', text: 'text-amber-600' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-3xl bg-slate-100 p-1 mb-4 border border-slate-200">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{userData.name}</h2>
            <div className="flex items-center gap-2 mt-1 mb-6">
                <p className="text-xs font-mono text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">ID: {userData.shortId || '......'}</p>
                <button onClick={copyId} className="text-slate-400 hover:text-blue-600 transition-colors">
                    {copied ? <Award size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3 w-full">
              <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Join Date</span>
                <span className="text-xs font-semibold text-slate-700">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-md font-bold text-slate-900 mb-2 flex items-center gap-2">
              <UserIcon size={18} className="text-blue-600" />
              Account Details
            </h3>
            <div className="space-y-1">
              <InfoRow icon={UserIcon} label="Full Name" value={userData.name} />
              <InfoRow icon={Phone} label="Contact Phone" value={userData.phone} />
              <InfoRow icon={MapPin} label="Country / Region" value={userData.country || 'Bangladesh'} />
            </div>
          </div>

          <button 
            onClick={() => navigate('/settings')}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-colors uppercase tracking-widest text-sm shadow-xl"
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
};


