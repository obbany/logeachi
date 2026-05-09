import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  Smartphone, 
  Check, 
  Loader2, 
  Clock,
  Navigation,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Config, Withdrawal } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export const WithdrawPage = () => {
  const { userData, refreshUserData } = useAuth();
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [wAmount, setWAmount] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wMethod, setWMethod] = useState('bkash');
  const [config, setConfig] = useState<Config | null>(null);
  const [features, setFeatures] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchFeatures();
    if (userData) {
      fetchHistory();
    }
  }, [userData]);

  const fetchConfig = async () => {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) setConfig(snap.data() as Config);
  };

  const fetchFeatures = async () => {
    const snap = await getDoc(doc(db, 'settings', 'features'));
    if (snap.exists()) setFeatures(snap.data());
  };

  const fetchHistory = async () => {
    if (!userData) return;
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', userData.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Withdrawal);
      // Sort in-memory to avoid composite index requirement
      const sortedData = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10);
      
      setHistory(sortedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !config) return;
    if (features?.withdrawalsEnabled === false) {
      alert('Withdrawals are currently disabled by the administrator.');
      return;
    }

    const amount = Number(wAmount);
    if (amount < (config.minWithdraw || 200)) {
       alert(`Minimum withdrawal is ৳${config.minWithdraw || 200}`);
       return;
    }

    if (amount > (userData.balance || 0)) {
      alert('Insufficient balance');
      return;
    }

    if (wPhone.length < 11) {
      alert('Enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Create withdrawal request
      await addDoc(collection(db, 'withdrawals'), {
        userId: userData.uid,
        userDocId: userData.id, // Store the actual document ID
        userShortId: userData.shortId || 'N/A', // Add short ID for display
        amount,
        phone: wPhone,
        method: wMethod,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Deduct balance
      await updateDoc(doc(db, 'users', userData.id!), {
        balance: increment(-amount),
        totalWithdraw: increment(amount)
      });

      alert('Withdrawal request submitted successfully!');
      setWAmount('');
      setWPhone('');
      refreshUserData();
      fetchHistory();
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      {/* Wallet Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Balance</p>
          <h2 className="text-3xl font-black">৳{(userData?.balance || 0).toLocaleString()}</h2>
        </div>
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
          <CreditCard className="text-white" size={24} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1">
        <button
          onClick={() => setActiveTab('payment')}
          className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'payment' ? 'bg-white shadow' : 'text-slate-500')}
        >Withdraw</button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'history' ? 'bg-white shadow' : 'text-slate-500')}
        >History</button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'payment' ? (
          features?.withdrawalsEnabled === false ? (
            <motion.div
              key="disabled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center p-8 bg-slate-50 border border-slate-100 shadow-inner rounded-[2rem] space-y-4"
            >
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-1">Withdrawals Currently Disabled</h3>
                <p className="text-xs font-bold text-slate-400">Our system is undergoing maintenance. You will be able to withdraw funds soon.</p>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleWithdraw}
              className="space-y-4"
            >
              {errorMsg && (
              <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['bkash', 'nagad', 'rocket'].map(m => (
                  <button key={m} type="button" onClick={() => setWMethod(m)} className={cn("py-3 rounded-xl border-2 uppercase font-black text-[10px] transition-all", wMethod === m ? "border-slate-900 bg-white" : "border-slate-100 bg-slate-50")}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                Amount {config ? `(Min ৳${config.minWithdraw || 0})` : <>(Loading... <Loader2 size={10} className="animate-spin" />)</>}
              </label>
              <input type="number" required value={wAmount} onChange={e => setWAmount(e.target.value)} placeholder="0" className="w-full p-4 border-2 rounded-2xl outline-none focus:border-slate-900 font-bold" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Phone Number</label>
              <input type="tel" required value={wPhone} onChange={e => setWPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full p-4 border-2 rounded-2xl outline-none focus:border-slate-900 font-bold" />
            </div>

            <button disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Withdrawal'}
            </button>
          </motion.form>
          )
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
             {loadingHistory ? <Loader2 className="animate-spin mx-auto text-slate-300" /> : history.map(h => (
               <div key={h.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-slate-100 rounded-xl"><History size={16} /></div>
                   <div>
                     <p className="font-black text-xs uppercase">{h.method}</p>
                     <p className="text-[10px] text-slate-400 font-bold">{h.createdAt ? format(new Date(h.createdAt as any), 'dd MMMM yyyy') : 'N/A'}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="font-black text-sm">৳{h.amount.toLocaleString()}</p>
                   <p className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", h.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{h.status}</p>
                 </div>
               </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
