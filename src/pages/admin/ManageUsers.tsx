import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Search, UserCog, Check, X, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { distributeCommission } from '../../lib/referral';
import { getDoc } from 'firebase/firestore';

const CopyButton = ({ text, title = "Copy" }: { text: string, title?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button 
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 transition-all focus:outline-none flex-shrink-0"
      title={title}
    >
      {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

export const ManageUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const updateStatus = async (userId: string, status: string) => {
    try {
      if (status === 'active') {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        
        if (userData?.status !== 'active') {
             await distributeCommission(userData);
        }
      }
      
      await updateDoc(doc(db, 'users', userId), { status, activatedAt: new Date() });
      setUsers(users.map(u => u.id === userId ? { ...u, status } : u));
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status !== 'active').length,
    totalBalance: users.reduce((sum, u) => sum + (Number(u.balance) || 0), 0)
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone?.includes(searchTerm) ||
    u.shortId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage Users</h1>
          <p className="text-slate-500 text-sm">Control user access and oversee financial health.</p>
        </div>
        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, phone or short ID..."
            className="w-full bg-white pl-12 pr-4 py-3.5 rounded-2xl text-xs font-bold outline-none border border-slate-100 focus:border-slate-900 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Community</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-900">{stats.total}</h3>
            <span className="text-[10px] font-bold text-slate-300 uppercase">Users</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Activated Accounts</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-emerald-600">{stats.active}</h3>
            <span className="text-[10px] font-bold text-emerald-200 uppercase">Live</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Inactive Users</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-red-600">{stats.inactive}</h3>
            <span className="text-[10px] font-bold text-red-200 uppercase">Waiting</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Collective Balance</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-blue-600">৳{stats.totalBalance.toLocaleString()}</h3>
            <span className="text-[10px] font-bold text-blue-200 uppercase">Total</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">User Identity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Contact Details</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Current Balance</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Account Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-white text-lg italic shadow-lg shadow-slate-200">
                        {user.name?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm tracking-tight">{user.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">ID: {user.shortId || '......'}</span>
                          {user.shortId && <CopyButton text={user.shortId} title="Copy User ID" />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-mono text-xs font-bold text-slate-500 tracking-widest">{user.phone}</div>
                    <div className="text-[8px] font-black uppercase text-slate-300 mt-1">{user.role}</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-black text-slate-900 text-base italic">৳{user.balance || 0}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      user.status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {user.status === 'active' ? (
                        <button 
                          onClick={() => updateStatus(user.id, 'inactive')}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <X size={14} />
                          Block
                        </button>
                      ) : (
                        <button 
                          onClick={() => updateStatus(user.id, 'active')}
                          className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <Check size={14} />
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="p-32 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Gathering Data...</p>
            </div>
          )}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-32 text-center text-slate-400 italic">No users found matching your search.</div>
          )}
        </div>
      </div>
    </div>
  );
};
