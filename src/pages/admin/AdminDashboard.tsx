import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  CreditCard, 
  CheckCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingSubmissions: 0,
    pendingWithdrawals: 0,
    pendingActivations: 0,
    totalVolume: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('status', '==', 'available')));
      const subsSnap = await getDocs(query(collection(db, 'submissions'), where('status', '==', 'pending')));
      const withdrawsSnap = await getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending')));
      const actsSnap = await getDocs(query(collection(db, 'activations'), where('status', '==', 'pending')));
      
      let volume = 0;
      usersSnap.forEach(doc => {
        volume += (doc.data().balance || 0);
      });

      setStats({
        totalUsers: usersSnap.size,
        activeTasks: tasksSnap.size,
        pendingSubmissions: subsSnap.size,
        pendingWithdrawals: withdrawsSnap.size,
        pendingActivations: actsSnap.size,
        totalVolume: volume
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Tasks', value: stats.activeTasks, icon: Briefcase, color: 'bg-green-500' },
    { label: 'Pending Activations', value: stats.pendingActivations, icon: AlertCircle, color: 'bg-amber-500' },
    { label: 'Pending Subs', value: stats.pendingSubmissions, icon: CheckCircle, color: 'bg-orange-500' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: CreditCard, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">System overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="text-white w-6 h-6" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
        <AlertCircle className="text-blue-600 shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900">System Health</h3>
          <p className="text-blue-700 text-sm mt-1">
            All services are running normally. Remember to review pending withdrawals and submissions daily.
          </p>
        </div>
      </div>
    </div>
  );
};
