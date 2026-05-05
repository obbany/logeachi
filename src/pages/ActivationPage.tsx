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
  const [selectedPlan, setSelectedPlan] = useState<PackagePlan | null>(null);
  
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<Activation | null>(null);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState('bkash');
  const [trxId, setTrxId] = useState('');

  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [history, setHistory] = useState<Activation[]>([]);

  useEffect(() => {
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    try {
      const configSnap = await getDoc(doc(db, 'settings', 'global'));
      if (configSnap.exists()) {
        setConfig(configSnap.data() as Config);
      }

      // Fetch Plans
    const plansSnap = await getDocs(collection(db, 'packages'));
    const plansData = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagePlan)).sort((a,b) => a.price - b.price);
      setPlans(plansData);
      if (plansData.length > 0 && !selectedPlan) {
        setSelectedPlan(plansData[0]);
      }

      if (userData) {
        const qActivations = query(collection(db, 'activations'), where('userId', '==', userData.uid));
        const qPurchases = query(collection(db, 'plan_purchases'), where('userId', '==', userData.uid));
        
        const [hSnapActivations, hSnapPurchases] = await Promise.all([
          getDocs(qActivations),
          getDocs(qPurchases)
        ]);

        const hData = [
          ...hSnapActivations.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation)),
          ...hSnapPurchases.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation))
        ].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        
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

  const getActivePlan = () => {
    return history.find(h => {
      if (h.status !== 'approved') return false;
      const plan = plans.find(p => p.id === h.packageId);
      if (!plan) return false;
      const createdAt = new Date(h.createdAt).getTime();
      const validity = plan.validity * 24 * 60 * 60 * 1000;
      return (createdAt + validity) > Date.now();
    });
  };

  const activePlanActivation = getActivePlan();
  const activePlanDetails = plans.find(p => p.id === activePlanActivation?.packageId);

  const copyNumber = (num: string, type: string) => {
    navigator.clipboard.writeText(num);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !config || !selectedPlan || isSubmitting) return;
    if (trxId.length < 5) {
      alert('Please enter a valid Transaction ID');
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
        amount: selectedPlan.price,
        packageId: selectedPlan.id,
        packageName: selectedPlan.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert('সফলভাবে সাবমিট হয়েছে! অনুগ্রহ করে অপেক্ষা করুন।');
      setTrxId('');
      fetchData();
      setActiveTab('history');
    } catch (err) {
      console.error(err);
      alert('দুঃখিত, আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
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

  const currentMethod = methods.find(m => m.id === method) || methods[0];

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
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Your Plan</h2>
                  </div>

                  {activePlanActivation && activePlanDetails ? (
                    <div className="bg-emerald-600 text-white p-6 rounded-3xl mb-6 shadow-xl shadow-emerald-100">
                      <h3 className="text-lg font-bold">{activePlanDetails.name}</h3>
                      <p className="text-emerald-100 text-sm opacity-80 mt-1">Active until {new Date(new Date(activePlanActivation.createdAt).getTime() + activePlanDetails.validity * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <div className="text-slate-400 p-6 rounded-3xl mb-6 border-2 border-dashed border-slate-200 text-center">
                      No active plan found.
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2 px-2">
                    <ShieldCheck size={20} className="text-emerald-500" />
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Choose Your Plan</h2>
                  </div>

                  {userData?.status !== 'active' ? (
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 text-center border-2 border-dashed border-slate-200 shadow-sm">
                      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600">
                        <AlertCircle size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Account Activation Required</h3>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto mb-8">
                        You must activate your account before you can subscribe to any earning plans. Please contact admin or follow the activation process.
                      </p>
                      <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest inline-block">
                        Status: <span className="text-amber-600">{userData?.status || 'Inactive'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                      {plans.map(p => (
                        <div
                          key={p.id}
                          className={cn(
                            "p-4 md:p-5 rounded-3xl border-2 text-left relative overflow-hidden transition-all duration-300 flex flex-col justify-between border-slate-100 bg-white hover:border-emerald-200 shadow-sm h-full"
                          )}
                        >
                          <div>
                            <h3 className="text-base md:text-lg font-black leading-tight text-slate-900 truncate">{p.name}</h3>
                            
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between text-xs md:text-sm font-medium">
                                <span className="text-slate-500">Daily Income</span>
                                <span className="font-bold text-slate-800">৳{p.dailyIncome}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs md:text-sm font-medium">
                                <span className="text-slate-500">Daily Ads</span>
                                <span className="font-bold text-slate-800">{p.taskCount || 0}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs md:text-sm font-medium">
                                <span className="text-slate-500">Validity</span>
                                <span className="font-bold text-slate-800">{p.validity} Days</span>
                              </div>
                              <div className="flex items-center justify-between text-xs md:text-sm font-medium">
                                <span className="text-slate-500">Total</span>
                                <span className="font-bold text-slate-800">৳{(p.dailyIncome * p.validity).toFixed(0)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Price</span>
                              <span className="text-lg md:text-2xl font-black tracking-tight text-emerald-600">৳{p.price}</span>
                            </div>
                            <button
                              onClick={() => navigate('/payment', { state: { plan: p } })}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-100 transition-all text-xs uppercase tracking-wider"
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <p className="text-xs font-bold text-blue-600 mt-4">Plan: {existingRequest.packageName}</p>
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
