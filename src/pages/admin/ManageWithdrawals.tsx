import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, runTransaction } from 'firebase/firestore';
import { Check, X, Clock, Banknote, Smartphone, Search, Filter, Loader2, User, CreditCard, History, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const CopyButton = ({ text, title = "Copy" }: { text: string, title?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button 
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 transition-all focus:outline-none"
      title={title}
    >
      {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
};

export const ManageWithdrawals = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'withdrawals'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, status: 'completed' | 'rejected') => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    try {
      await runTransaction(db, async (transaction) => {
        const reqRef = doc(db, 'withdrawals', requestId);
        const reqSnap = await transaction.get(reqRef);
        if (!reqSnap.exists()) throw new Error('Withdrawal request document missing');
        
        const reqData = reqSnap.data();
        const userDocId = reqData.userDocId || reqData.userId;
        
        if (!userDocId) throw new Error('User identity missing in request');
        
        const userRef = doc(db, 'users', userDocId);
        
        // Fetch user data before any writes
        const userSnap = await transaction.get(userRef);
        
        // Perform writes
        transaction.update(reqRef, { status, updatedAt: new Date().toISOString() });

        if (status === 'rejected') {
          if (userSnap.exists()) {
            const currentBalance = userSnap.data().balance || 0;
            const currentTotalWithdraw = userSnap.data().totalWithdraw || 0;
            transaction.update(userRef, { 
              balance: currentBalance + reqData.amount,
              totalWithdraw: Math.max(0, currentTotalWithdraw - reqData.amount)
            });
          }
        }
      });

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
      alert(`Request marked as ${status}`);
    } catch (e: any) {
      console.error('Transaction Error:', e);
      alert(`Action Failed: ${e.message || 'Unknown error'}`);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesTab = r.status === activeTab;
    const matchesSearch = searchTerm === '' || 
      (r.userShortId && r.userShortId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.userId.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.phone.includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  const stats = {
    totalCount: requests.length,
    totalAmount: requests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    pendingCount: requests.filter(r => r.status === 'pending').length,
    pendingAmount: requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    rejectedCount: requests.filter(r => r.status === 'rejected').length,
    rejectedAmount: requests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Admin Wallet Header */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Financial Oversight</p>
          <h2 className="text-3xl font-black">Manage Withdrawals</h2>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/10">
          <CreditCard className="text-white" size={32} />
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Withdrawals</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.totalCount}</h3>
            <span className="text-[8px] font-bold text-slate-300 uppercase">Requests</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Pending Withdrawals</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-amber-600">{stats.pendingCount}</h3>
            <span className="text-[8px] font-bold text-amber-200 uppercase">Waiting</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Amount</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">৳{stats.totalAmount.toLocaleString()}</h3>
            <span className="text-[8px] font-bold text-slate-300 uppercase">Total</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Rejected Users</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-red-600">{stats.rejectedCount}</h3>
            <span className="text-[8px] font-bold text-red-200 uppercase">Users</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Rejected Amount</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-red-600">৳{stats.rejectedAmount.toLocaleString()}</h3>
            <span className="text-[8px] font-bold text-red-200 uppercase">Amount</span>
          </div>
        </div>
      </div>

      <section className="bg-transparent">
        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex bg-white rounded-2xl p-1 border border-slate-100 shadow-sm">
            {(['pending', 'completed', 'rejected'] as const).map(tab => {
              const count = tab === 'pending' ? stats.pendingCount : tab === 'rejected' ? stats.rejectedCount : (stats.totalCount - stats.pendingCount - stats.rejectedCount);
              return (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all gap-2 flex items-center", 
                    activeTab === tab ? "bg-slate-900 text-white shadow-xl translate-y-0" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px]",
                    activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Search by ID or Phone..."
               className="w-full bg-white pl-12 pr-4 py-3.5 rounded-2xl text-xs font-bold outline-none border border-slate-100 focus:border-slate-900"
             />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading...</div>
            ) : filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-400"><AlertCircle className="mx-auto mb-2" size={24} /> No requests found</div>
            ) : filteredRequests.map(req => (
                <div key={req.id} className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-between gap-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <User size={20} className="text-slate-400" />
                      </div>
                      <div className="flex flex-col group/uid">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-sm">ID: {req.userShortId || 'N/A'}</p>
                          {req.userShortId && <CopyButton text={req.userShortId} title="Copy User ID" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter">UID: {req.userId.substring(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="uppercase text-[10px] font-black text-slate-400 tracking-widest">{req.method}</p>
                      <div className="flex items-center justify-end gap-2 group/phone">
                        <p className="font-mono text-xs font-bold text-slate-900">{req.phone}</p>
                        <CopyButton text={req.phone} title="Copy Number" />
                      </div>
                    </div>

                    <div className="font-black text-slate-900 text-base">৳{req.amount.toLocaleString()}</div>

                    <div className="flex items-center gap-2">
                        {req.status === 'pending' ? (
                           <div className="flex gap-2">
                             <button 
                               onClick={() => handleAction(req.id, 'rejected')} 
                               className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                             >
                               <X size={14} />
                               Cancel
                             </button>
                             <button 
                               onClick={() => handleAction(req.id, 'completed')} 
                               className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                             >
                               <Check size={14} />
                               Approve
                             </button>
                           </div>
                        ) : (
                          <span className={cn("text-[10px] font-black uppercase px-5 py-2.5 rounded-full", req.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                            {req.status}
                          </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};
