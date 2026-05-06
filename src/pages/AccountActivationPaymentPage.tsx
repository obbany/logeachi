import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Clock,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Config, Activation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AccountActivationPaymentPage = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [features, setFeatures] = useState<any>(null);
  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'history'>('payment');
  const [history, setHistory] = useState<Activation[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  useEffect(() => {
    if (userData) fetchHistory();
  }, [userData]);

  const fetchHistory = async () => {
    if (!userData) return;
    setIsFetchingHistory(true);
    try {
      const q = query(collection(db, 'activations'), where('userId', '==', userData.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation))
        .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (showSuccess) {
      setTimeout(() => {
        setActiveTab('history');
        fetchHistory();
      }, 3000);
    }
  }, [showSuccess]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const configSnap = await getDoc(doc(db, 'settings', 'global'));
    if (configSnap.exists()) {
      setConfig(configSnap.data() as Config);
    }
    const featuresSnap = await getDoc(doc(db, 'settings', 'features'));
    if (featuresSnap.exists()) {
      setFeatures(featuresSnap.data());
    }
  };

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !config || isSubmitting) return;

    if (features?.activationsEnabled === false) {
      alert('Activations are currently disabled by the administrator.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'activations'), {
        userId: userData.uid,
        userShortId: userData.shortId || 'N/A',
        phone: userData.phone,
        method: method,
        transactionId: trxId,
        amount: config.activationFee,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert('দুঃখিত, আবার চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  const renderSuccess = () => (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-600">
        <Check size={40} />
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2">Payment Submitted Successfully!</h3>
      <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xs mx-auto mb-6">
        আপনার পেমেন্টটি সফলভাবে সাবমিট হয়েছে। অনুগ্রহ করে অপেক্ষা করুন, ৩ সেকেন্ডের মধ্যে আপনাকে রিডাইরেক্ট করা হচ্ছে...
      </p>
    </div>
  );

  const methods = [
    { id: 'bkash', name: 'bKash', number: config?.bkashNumber },
    { id: 'nagad', name: 'Nagad', number: config?.nagadNumber },
    { id: 'rocket', name: 'Rocket', number: config?.rocketNumber },
  ];

  const currentMethod = methods.find(m => m.id === method) || methods[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6 gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 gap-1">
             <button 
                type="button" 
                onClick={() => setActiveTab('payment')} 
                className={cn("px-4 py-3 text-[10px] md:text-xs font-bold rounded-lg transition-all min-w-[80px] relative z-10 cursor-pointer", activeTab === 'payment' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
             >
                Payment
             </button>
             <button 
                type="button" 
                onClick={() => { setActiveTab('history'); fetchHistory(); }} 
                className={cn("px-4 py-3 text-[10px] md:text-xs font-bold rounded-lg transition-all min-w-[80px] relative z-10 cursor-pointer", activeTab === 'history' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
             >
                History
             </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          {activeTab === 'history' ? (
              <div className="space-y-4">
                {isFetchingHistory ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-400" /></div> :
                  history.length === 0 ? <p className="text-center py-10 text-slate-500 text-sm">No activation history found</p> :
                  history.map((h) => (
                    <div key={h.id} className="p-4 border rounded-2xl flex justify-between items-center">
                        <div>
                           <p className="text-sm font-bold">{h.method} - ৳{h.amount}</p>
                           <p className="text-xs text-slate-400 capitalize">{h.status} • {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}</p>
                        </div>
                    </div>
                  ))
                }
              </div>
          ) : showSuccess ? renderSuccess() : features?.activationsEnabled === false ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">Activations Disabled</h1>
              <p className="text-slate-500 text-sm font-medium">Account activations are temporarily disabled by the administrator. Please check back later.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-emerald-600" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Account Activation</h1>
                <p className="text-slate-500 text-sm font-medium">Complete the payment to unlock full platform access.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 text-white text-center mb-6 shadow-xl shadow-slate-200">
                   <p className="text-emerald-400 font-black text-sm uppercase tracking-widest mb-1">Total Due</p>
                   <span className="text-5xl font-black tracking-tighter">৳{config?.activationFee}</span>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">1. Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {methods.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 font-black transition-all text-sm uppercase tracking-wide",
                          method === m.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <h2 className="text-amber-900 font-black text-sm mb-2 uppercase tracking-wide">পেমেন্ট নির্দেশনাবলী:</h2>
                  <ul className="text-amber-800 text-xs font-medium space-y-1 list-disc pl-4">
                    <li>আপনার ব্যক্তিগত {currentMethod.name} অ্যাকাউন্ট থেকে সঠিক পরিমাণ টাকা {config?.paymentMode || 'Send Money'} করুন।</li>
                    <li>ট্রানজাকশন সম্পন্ন হওয়ার জন্য অপেক্ষা করুন।</li>
                    <li>{currentMethod.name} থেকে পাওয়া ট্রানজাকশন আইডি (TrxID) টি কপি করুন।</li>
                    <li>নিচের বক্সে ট্রানজাকশন আইডি (TrxID) পেস্ট করুন এবং সাবমিট বাটনে ক্লিক করুন।</li>
                    <li>অ্যাডমিন অনুমোদনের জন্য ১০-৬০ মিনিট অপেক্ষা করুন।</li>
                  </ul>
                </div>

                {config && (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-sm font-bold text-slate-700">Send ৳{config.activationFee} to this {currentMethod.name} number:</p>
                    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-2 border-slate-200">
                      <span className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                        {currentMethod.number}
                      </span>
                      <button type="button" onClick={() => handleCopy(currentMethod.number || '')} className="ml-auto p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">2. Transaction ID</label>
                  <input
                    type="text"
                    value={trxId}
                    onChange={e => setTrxId(e.target.value)}
                    placeholder="Enter TrxID"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none font-mono font-bold text-slate-900 uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !trxId}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 hover:bg-slate-800 shadow-xl text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><Loader2 className="animate-spin" size={18}/> Submitting...</> : 'Submit Activation Payment'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
