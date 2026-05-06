import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Clock, 
  AlertCircle,
  Copy,
  Check,
  Filter,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, doc, updateDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export const ManagePlanRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [plansEnabled, setPlansEnabled] = useState(true);
  const [savingFeature, setSavingFeature] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchFeatureStatus();
  }, []);

  const fetchFeatureStatus = async () => {
    try {
      const snap = await getDocs(collection(db, 'settings'));
      const featuresDoc = snap.docs.find(d => d.id === 'features');
      if (featuresDoc) {
        setPlansEnabled(featuresDoc.data().plansEnabled ?? true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFeature = async () => {
    setSavingFeature(true);
    try {
      const newState = !plansEnabled;
      const docRef = doc(db, 'settings', 'features');
      await updateDoc(docRef, { plansEnabled: newState }).catch(async (e) => {
        if (e.code === 'not-found') {
          // Document doesn't exist yet, we can create it
          const { setDoc } = await import('firebase/firestore');
          await setDoc(docRef, { plansEnabled: newState }, { merge: true });
        } else {
          throw e; // rethrow other errors
        }
      });
      setPlansEnabled(newState);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingFeature(false);
    }
  };

  const fetchRequests = () => {
    setLoading(true);
    const q = query(
      collection(db, 'plan_purchases'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to mark this request as ${status}?`)) return;

    try {
      const req = requests.find(r => r.id === id);
      if (!req) return;
      if (!req.userId) {
        alert("Error: User ID is missing for this request.");
        return;
      }

      const batch = writeBatch(db);
      
      // Update the request status
      batch.update(doc(db, 'plan_purchases', id), { 
        status, 
        updatedAt: new Date().toISOString() 
      });

      // If approved, update user's plan info
      if (status === 'approved') {
        const userRef = doc(db, 'users', req.userId);
        const userPhoneRef = req.userPhone ? doc(db, 'users', req.userPhone) : null;
        
        // We do not know for sure if the document exists by req.userId because of the older bug.
        // If it doesn't exist, we will use merge: true so we don't throw an error,
        // but it's better to update the correct document ID. Since user IDs are phone numbers:
        const targetRef = req.userId.includes(req.userPhone) || !req.userPhone ? userRef : userPhoneRef || userRef;
        
        // Read user data to verify status before approving to see if we should distribute commission
        const userSnap = await getDoc(targetRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const { distributeCommission } = await import('../../lib/referral');
          await distributeCommission(userData);
        }

        let planExpiresAt = new Date();
        planExpiresAt.setDate(planExpiresAt.getDate() + (req.validity || 30));
        
        batch.set(targetRef, {
          status: 'active', // Mark active just in case
          packageId: req.packageId || '',
          packageName: req.packageName || '',
          dailyIncome: req.dailyIncome || 0,
          taskCount: req.taskCount || 0,
          planExpiresAt: planExpiresAt.toISOString()
        }, { merge: true });
      }

      await batch.commit();
      alert(`Request marked as ${status}`);
    } catch (e: any) {
      console.error(e);
      alert(`Error updating status: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this record?")) {
      await deleteDoc(doc(db, 'plan_purchases', id));
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch = 
        req.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.userPhone?.includes(searchTerm) ||
        req.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = req.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const totalAmount = useMemo(() => 
    requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  , [requests]);

  const rejectedAmount = useMemo(() => 
    requests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  , [requests]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage User Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Review and process user package purchases.</p>
        </div>

        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User Plans</span>
             <span className={cn("text-xs font-black", plansEnabled ? "text-emerald-600" : "text-red-600")}>
               {plansEnabled ? 'ENABLED' : 'DISABLED'}
             </span>
           </div>
           <button
             disabled={savingFeature}
             onClick={toggleFeature}
             className={cn(
               "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none",
               plansEnabled ? "bg-emerald-500" : "bg-slate-300",
               savingFeature && "opacity-50 cursor-not-allowed"
             )}
           >
             <span
               className={cn(
                 "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                 plansEnabled ? "translate-x-6" : "translate-x-1"
               )}
             />
           </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Total Approved Amount</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">৳{totalAmount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-bold text-slate-400 uppercase">Total Rejected Amount</p>
          <p className="text-3xl font-black text-red-600 mt-2">৳{rejectedAmount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Search name, phone, or TrxID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {(['pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all whitespace-nowrap",
                statusFilter === status 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {status} ({requests.filter(r => r.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Package</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Details</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{req.userName || 'N/A'}</div>
                    <div className="text-sm text-slate-500">{req.userPhone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex py-1 px-3 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                      {req.packageName}
                    </div>
                    <div className="text-sm font-bold text-slate-600 mt-1">৳{req.amount}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{req.method}</span>
                       <span className="text-sm text-slate-500">{req.senderPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono font-bold text-slate-900 uppercase">{req.transactionId}</span>
                      <button 
                        onClick={() => copyToClipboard(req.transactionId, req.id)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copiedId === req.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStatusUpdate(req.id, 'approved')}
                          className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(req.id, 'rejected')}
                          className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Reject"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          req.status === 'approved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {req.status}
                        </span>
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredRequests.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                     No requests found for the selected filters.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
