import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  Clock,
  ArrowLeft,
  CreditCard,
  Banknote,
  XCircle,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Config, Activation, PackagePlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const ActivationPage = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [plans, setPlans] = useState<PackagePlan[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<Activation | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [history, setHistory] = useState<Activation[]>([]);

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    try {
      const [configSnap, plansSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'global')),
        getDocs(collection(db, 'packages'))
      ]);
      
      if (configSnap.exists()) {
        setConfig(configSnap.data() as Config);
      }
      
      const plansData = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagePlan)).sort((a,b) => a.price - b.price);
      setPlans(plansData);

      if (userData) {
        const qActivations = query(collection(db, 'activations'), where('userId', '==', userData.uid));
        
        const hSnapActivations = await getDocs(qActivations);

        const hData = hSnapActivations.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Activation))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        
        setHistory(hData);

        const pending = hData.find(a => a.status === 'pending');
        setExistingRequest(pending || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyNumber = (num: string, type: string) => {
    navigator.clipboard.writeText(num);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12">
        <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
      </div>
    );
  }

  const methods = [
    { id: 'bkash', name: 'BKASH', number: config?.bkashNumber },
    { id: 'nagad', name: 'NAGAD', number: config?.nagadNumber },
    { id: 'rocket', name: 'ROCKET', number: config?.rocketNumber },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Toggle Switch */}
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner flex items-center relative z-20">
          <button 
            type="button"
            onClick={() => setActiveTab('apply')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10",
              activeTab === 'apply' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Activate Account
          </button>
          <button 
            type="button"
            onClick={() => {
              setActiveTab('history');
              fetchData();
            }}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10",
              activeTab === 'history' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            History
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'apply' ? (
            <motion.div 
              key="apply"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              
              {!existingRequest ? (
                <>
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <ShieldCheck size={20} className="text-emerald-500" />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Account Status</h2>
                  </div>

                  {userData?.status !== 'active' ? (                
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center mb-6">
                      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600">
                        <AlertCircle size={40} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Account Activation Required</h3>
                      <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xs mx-auto mb-6">
                        Pay ৳{config?.activationFee || 0} to activate your account.
                      </p>
                      <button
                        onClick={() => navigate('/activation-payment')}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all hover:bg-slate-800 shadow-xl text-sm uppercase tracking-widest"
                      >
                         Activate Now
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-700 rounded-3xl p-6 text-center border-2 border-dashed border-emerald-200 mb-6">
                      <ShieldCheck size={32} className="mx-auto mb-2" />
                      <h3 className="text-lg font-black">Account Active</h3>
                      <p className="text-xs font-medium">Your account is fully activated. Choose a premium plan below.</p>
                    </div>
                  )}

                  {/* Plans Section */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-4 px-2">Premium Memberships</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {plans.map((plan) => (
                        <div key={plan.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                          <div className="relative z-10">
                            <h4 className="text-lg font-black text-slate-900">{plan.name}</h4>
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Price</span>
                                <span className="font-black text-slate-900">৳{plan.price}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Validity</span>
                                <span className="font-black text-slate-900">{plan.validity} Days</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Daily Ads</span>
                                <span className="font-black text-slate-900">{plan.taskCount}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Daily Earn</span>
                                <span className="font-black text-emerald-600">৳{plan.dailyIncome}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (userData?.status !== 'active') {
                                  alert('You must activate your account first!');
                                } else {
                                  navigate('/payment', { state: { plan } });
                                }
                              }}
                              className="w-full mt-5 bg-slate-900 text-white font-black py-3 rounded-xl transition-all hover:bg-slate-800 shadow-lg text-[10px] uppercase tracking-widest disabled:opacity-50"
                            >
                              Purchase Plan
                            </button>
                          </div>
                        </div>
                      ))}
                      {plans.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-white rounded-3xl border border-slate-100 text-slate-400 font-bold text-sm">
                          No plans available right now.
                        </div>
                      )}
                    </div>
                  </div>

                </>
              ) : (
                <div className="py-10 text-center space-y-6 max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-[2rem] flex items-center justify-center mx-auto ring-4 ring-slate-50">
                    <Clock size={40} className="animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">Access Pending</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                      আপনার আবেদনটি রিভিউ করা হচ্ছে। অনুগ্রহ করে ১০-৬০ মিনিট অপেক্ষা করুন।
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 max-w-sm mx-auto"
            >
              {history.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No history found</p>
                </div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2",
                        h.status === 'approved' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                        h.status === 'pending' ? "bg-amber-50 border-amber-100 text-amber-600" :
                        "bg-red-50 border-red-100 text-red-600"
                      )}>
                        {h.status === 'approved' ? <ShieldCheck size={24} /> : 
                         h.status === 'pending' ? <Clock size={24} /> : <XCircle size={24} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 tracking-tight">{h.packageName}</p>
                        <p className="text-[9px] font-mono font-bold text-slate-400 uppercase mt-1">TrxID: {h.transactionId}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{h.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-900">৳{h.amount}</p>
                       <p className={cn(
                         "text-[8px] font-black uppercase tracking-[0.2em] mt-1",
                         h.status === 'approved' ? "text-emerald-500" :
                         h.status === 'pending' ? "text-amber-500" : "text-red-500"
                       )}>{h.status}</p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 pt-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};
