import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  CreditCard, 
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import CountUp from 'react-countup';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingWithdrawals: 0,
    pendingActivations: 0,
    totalFutureBalance: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('status', '==', 'available')));
      const withdrawsSnap = await getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending')));
      const actsSnap = await getDocs(query(collection(db, 'activations'), where('status', '==', 'pending')));
      
      const txSnap = await getDocs(collection(db, 'transactions'));
      
      let futureBalance = 0;
      
      txSnap.forEach(doc => {
        const data = doc.data();
        // Sum up all user earnings (ignore withdrawals, deposits, or payments)
        if (data.amount && data.amount > 0 && data.type !== 'deposit' && data.type !== 'withdrawal' && data.type !== 'payment') {
           futureBalance += data.amount;
        }
      });

      setStats({
        totalUsers: usersSnap.size,
        activeTasks: tasksSnap.size,
        pendingWithdrawals: withdrawsSnap.size,
        pendingActivations: actsSnap.size,
        totalFutureBalance: futureBalance
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Tasks', value: stats.activeTasks, icon: Briefcase, color: 'bg-indigo-500' },
    { label: 'Pending Activations', value: stats.pendingActivations, icon: AlertCircle, color: 'bg-amber-500' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: CreditCard, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">System overview and statistics</p>
      </div>

      {/* New Total Future Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-emerald-200 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150 transform transition-transform pointer-events-none">
          <Wallet size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={24} className="text-emerald-200" />
              <h2 className="text-emerald-100 font-bold uppercase tracking-widest text-sm">Total Future Balance</h2>
            </div>
            <p className="text-emerald-100 text-sm max-w-sm mb-4">
              Cumulative lifetime earnings of all users combined. This value does not decrease when users withdraw their funds.
            </p>
            <div className="text-5xl md:text-6xl font-black tabular-nums tracking-tight">
              ৳{!loading ? <CountUp end={stats.totalFutureBalance} duration={2} separator="," decimal="." decimals={2} /> : "0.00"}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col pt-8">
            <div className="flex items-center justify-between mb-4 mt-auto">
              <div className={`${stat.color} p-3 rounded-2xl shadow-sm`}>
                <stat.icon className="text-white w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight tabular-nums mt-2">
              {!loading ? <CountUp end={stat.value} duration={1.5} /> : 0}
            </div>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
        <AlertCircle className="text-blue-600 shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900 font-sans">System Health</h3>
          <p className="text-blue-700 text-sm mt-1 font-medium">
            All services are running normally. Remember to review pending withdrawals and submissions daily.
          </p>
        </div>
      </div>
    </div>
  );
};
