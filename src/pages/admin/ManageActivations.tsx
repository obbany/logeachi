import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, where, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  UserCheck,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Activation } from '../../types';
import { cn } from '../../lib/utils';

const CopyButton = ({ text, title = "Copy" }: { text: string, title?: string }) => {
  const [copied, setCopied] = React.useState(false);
  return (
    <button 
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded transition-all focus:outline-none flex-shrink-0"
      title={title}
    >
      {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <UserCheck size={14} className="opacity-0 group-hover/uid:opacity-100" />}
    </button>
  );
};

export const ManageActivations = () => {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activationFee, setActivationFee] = useState<number>(0);
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activationsEnabled, setActivationsEnabled] = useState(true);
  const [savingFeature, setSavingFeature] = useState(false);

  useEffect(() => {
    fetchActivations();
    fetchSettings();
    fetchFeatureStatus();
  }, []);

  const fetchFeatureStatus = async () => {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const featuresDoc = snap.docs.find(d => d.id === 'features');
      if (featuresDoc) {
        setActivationsEnabled(featuresDoc.data().activationsEnabled ?? true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFeature = async () => {
    setSavingFeature(true);
    try {
      const newState = !activationsEnabled;
      const docRef = doc(db, 'settings', 'features');
      await setDoc(docRef, { activationsEnabled: newState }, { merge: true });
      setActivationsEnabled(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingFeature(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists()) {
        setActivationFee(docSnap.data().activationFee || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFee = async () => {
    setIsUpdatingFee(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        activationFee: Number(activationFee)
      }, { merge: true });
      alert('Activation fee updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating fee');
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const fetchActivations = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'activations')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation));
      const sorted = data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setActivations(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (activation: Activation, status: 'approved' | 'rejected' | 'pending') => {
    setProcessingId(activation.id);
    try {
      // 1. Update Activation Record
      const actRef = doc(db, 'activations', activation.id);
      await updateDoc(actRef, { status });

      // 2. Update User Status if Approved
      if (status === 'approved') {
        const userRef = doc(db, 'users', activation.phone);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.status !== 'active') {
            const { distributeCommission } = await import('../../lib/referral');
            await distributeCommission(userData);
          }

          const updates: any = {
            status: 'active',
            activatedAt: new Date().toISOString()
          };
          if (activation.packageId) {
            updates.packageId = activation.packageId;
            updates.packageName = activation.packageName;
          }
          await updateDoc(userRef, updates);
        }
      } 

      setActivations(prev => prev.map(a => a.id === activation.id ? { ...a, status } : a));
      alert(`Request marked as ${status}`);
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setProcessingId(null);
    }
  };

  const stats = {
    totalCount: activations.length,
    totalAmount: activations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0),
    pendingCount: activations.filter(a => a.status === 'pending').length,
    pendingAmount: activations.filter(a => a.status === 'pending').reduce((sum, a) => sum + (Number(a.amount) || 0), 0),
    rejectedCount: activations.filter(a => a.status === 'rejected').length,
    rejectedAmount: activations.filter(a => a.status === 'rejected').reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
  };

  const filteredActivations = activations.filter(a => {
    const matchesFilter = a.status === filter;
    const matchesSearch = a.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.phone.includes(searchTerm) ||
      a.userShortId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center justify-between xl:justify-start gap-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage Activations</h1>
            <p className="text-slate-500 text-sm">Verify and approve account activation payments.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activations</span>
               <span className={cn("text-xs font-black", activationsEnabled ? "text-emerald-500" : "text-red-500")}>
                 {activationsEnabled ? 'ENABLED' : 'DISABLED'}
               </span>
             </div>
             <button
               disabled={savingFeature}
               onClick={toggleFeature}
               className={cn(
                 "relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none",
                 activationsEnabled ? "bg-emerald-500" : "bg-slate-300",
                 savingFeature && "opacity-50 cursor-not-allowed"
               )}
             >
               <span
                 className={cn(
                   "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                   activationsEnabled ? "translate-x-8" : "translate-x-1"
                 )}
               />
             </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <input 
              type="text"
              placeholder="Search TrxID/Phone..."
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-900 transition-all w-64 shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner">
                {(['pending', 'approved', 'rejected'] as const).map((s) => {
                  const count = s === 'pending' ? stats.pendingCount : s === 'rejected' ? stats.rejectedCount : (stats.totalCount - stats.pendingCount - stats.rejectedCount);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilter(s)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2",
                        filter === s 
                          ? "bg-white text-slate-900 shadow-sm translate-y-0" 
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/30"
                      )}
                    >
                      {s}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px]",
                        filter === s ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Activations</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.totalCount}</h3>
            <span className="text-[8px] font-bold text-slate-300 uppercase">Requests</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Pending Activations</p>
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
          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Rejected Users</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-red-600">{stats.rejectedCount}</h3>
            <span className="text-[8px] font-bold text-red-200 uppercase">Users</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Rejected Amount</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-red-600">৳{stats.rejectedAmount.toLocaleString()}</h3>
            <span className="text-[8px] font-bold text-red-200 uppercase">Amount</span>
          </div>
        </div>
      </div>

      {/* Fee Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activation Fee</p>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-300 text-2xl italic">৳</span>
              <input 
                type="number"
                className="w-24 bg-transparent border-none p-0 font-black text-slate-900 text-2xl outline-none"
                value={activationFee}
                onChange={(e) => setActivationFee(Number(e.target.value))}
              />
            </div>
          </div>
          <button 
            onClick={handleUpdateFee}
            disabled={isUpdatingFee}
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {isUpdatingFee ? <Loader2 size={14} className="animate-spin" /> : 'UPDATE'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Loading Records...</p>
          </div>
        ) : filteredActivations.length === 0 ? (
          <div className="p-32 text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Clock size={40} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">User Identity</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Package</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Method</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Transaction ID</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredActivations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col group/uid">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-xs tracking-widest bg-slate-100 w-fit px-2 py-0.5 rounded-lg">ID: {a.userShortId || 'N/A'}</span>
                          {a.userShortId && <CopyButton text={a.userShortId} title="Copy User ID" />}
                        </div>
                        <span className="font-bold text-slate-400 text-[10px] font-mono mt-1">{a.phone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        {a.packageName || 'Legacy Plan'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-600 tracking-widest">
                        {a.method}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 group/trx">
                        <span className="font-mono text-blue-600 font-black text-sm tracking-widest">{a.transactionId}</span>
                        <CopyButton text={a.transactionId} title="Copy Transaction ID" />
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900 text-base italic">৳{a.amount}</td>
                    <td className="px-8 py-6 text-right">
                      {filter === 'pending' ? (
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            disabled={processingId === a.id}
                            onClick={() => handleStatusUpdate(a, 'rejected')}
                            className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all border border-red-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                          <button 
                            disabled={processingId === a.id}
                            onClick={() => handleStatusUpdate(a, 'approved')}
                            className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200/50 flex items-center gap-2 transition-all active:scale-95"
                          >
                            {processingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Approve
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-4">
                           <span className={cn(
                             "text-[10px] font-black uppercase tracking-[0.2em]",
                             filter === 'approved' ? "text-emerald-500" : "text-red-500"
                           )}>
                             {filter}
                           </span>
                           <button 
                             onClick={() => handleStatusUpdate(a, 'pending')}
                             className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
                             title="Reset to Pending"
                           >
                             <Clock size={16} />
                           </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
