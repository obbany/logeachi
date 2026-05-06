import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { PackagePlan, Config, Activation } from '../types';
import { CheckCircle, AlertCircle, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const PlanPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const plan = location.state?.plan as PackagePlan | undefined;
  
  const [config, setConfig] = useState<Config | null>(null);
  const [features, setFeatures] = useState<any>(null);
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'rocket' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [plans, setPlans] = useState<PackagePlan[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [loadingActivePlan, setLoadingActivePlan] = useState(true);

  useEffect(() => {
    fetchConfig();
    fetchActivePlans();
  }, [userData]);

  const fetchActivePlans = async () => {
    if (!userData) {
      setLoadingActivePlan(false);
      return;
    }
    try {
      const plansSnap = await getDocs(collection(db, 'packages'));
      const plansData = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagePlan));
      setPlans(plansData);

      const qActivations = query(collection(db, 'activations'), where('userId', '==', userData.uid));
      const qPurchases = query(collection(db, 'plan_purchases'), where('userId', '==', userData.uid));
      const [hSnapActivations, hSnapPurchases] = await Promise.all([
        getDocs(qActivations),
        getDocs(qPurchases)
      ]);
      const history = [
        ...hSnapActivations.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation)),
        ...hSnapPurchases.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation))
      ];

      const active = history.find(h => {
        if (h.status !== 'approved') return false;
        const plan = plansData.find(p => p.id === h.packageId);
        if (!plan) return false;
        const createdAt = new Date(h.createdAt).getTime();
        const validity = plan.validity * 24 * 60 * 60 * 1000;
        return (createdAt + validity) > Date.now();
      });

      setHasActivePlan(!!active);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivePlan(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      timer = setTimeout(() => {
        navigate('/activate');
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig(snap.data() as Config);
      }
      const featuresSnap = await getDoc(doc(db, 'settings', 'features'));
      if (featuresSnap.exists()) {
        setFeatures(featuresSnap.data());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!plan) {
    return <Navigate to="/activate" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method || !transactionId) {
      setError('Please fill in Transaction ID');
      return;
    }

    if (features?.plansEnabled === false) {
      setError('Plan purchases are currently disabled.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await addDoc(collection(db, 'plan_purchases'), {
        userId: userData?.uid || currentUser?.uid,
        userName: userData?.name,
        userPhone: userData?.phone,
        packageId: plan.id,
        packageName: plan.name,
        amount: plan.price,
        dailyIncome: plan.dailyIncome,
        validity: plan.validity,
        taskCount: plan.taskCount,
        method,
        senderPhone: userData?.phone || 'Unknown',
        transactionId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Payment request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-sm w-full p-8 text-center bg-white rounded-3xl shadow-2xl"
          >
            <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Submitted</h2>
            <p className="text-slate-500 text-sm mb-8">Admin will verify your payment and activate your plan shortly.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm tracking-wide"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      )}

      {loadingActivePlan ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin w-10 h-10 text-slate-300" />
        </div>
      ) : hasActivePlan ? (
        <div className="max-w-lg mx-auto p-10 text-center bg-white rounded-3xl border border-amber-100 shadow-sm">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Active Plan Exist</h2>
          <p className="text-slate-600 mb-8 px-4">You already have an active plan.</p>
          <button
              onClick={() => navigate('/activate')}
              className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm tracking-wide"
            >
              Go Back
            </button>
        </div>
      ) : (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Complete Payment</h1>
          <p className="text-sm text-slate-500 mt-1">Pay to activate the package.</p>
        </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50 rounded-tr-full -ml-10 -mb-10 opacity-50"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight drop-shadow-sm">{plan.name}</h3>
            <span className="text-sm font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Selected Plan</span>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Daily Income</span>
              <div className="font-black text-slate-900 text-lg">৳{plan.dailyIncome}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Daily Ads</span>
              <div className="font-black text-slate-900 text-lg">{plan.taskCount || 0}</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Validity</span>
              <div className="font-black text-slate-900 text-lg">{plan.validity} Days</div>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Total Income</span>
              <div className="font-black text-slate-900 text-lg">৳{(plan.dailyIncome * plan.validity).toFixed(0)}</div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Package Price</span>
            <span className="text-4xl font-black text-emerald-600 tracking-tighter drop-shadow-md">৳{plan.price}</span>
          </div>
        </div>
      </div>

      {features?.plansEnabled === false ? (
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 relative text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
             <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Currently Unavailable</h2>
          <p className="text-slate-500 text-sm">Plan purchases are temporarily disabled by the administrator. Please check back later.</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6 relative">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400">1. Select Payment Method</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'bkash', label: 'bKash', color: 'bg-pink-50 text-pink-700 border-pink-200 shadow-pink-100' },
              { id: 'nagad', label: 'Nagad', color: 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100' },
              { id: 'rocket', label: 'Rocket', color: 'bg-purple-50 text-purple-700 border-purple-200 shadow-purple-100' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id as any)}
                className={cn(
                  "p-3 rounded-xl border-2 font-black transition-all text-sm uppercase tracking-wide",
                  method === m.id ? m.color + " shadow-md -translate-y-0.5" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {method && config && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative overflow-hidden">
             
            <p className="text-sm font-bold text-slate-700 block">
              Please <strong className="text-slate-900 border-b-2 border-slate-900">{config.paymentMode || 'Send Money'}</strong> to this {method.charAt(0).toUpperCase() + method.slice(1)} number:
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm relative z-10">
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 tracking-wider break-all">
                {method === 'bkash' && config.bkashNumber}
                {method === 'nagad' && config.nagadNumber}
                {method === 'rocket' && config.rocketNumber}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(
                  method === 'bkash' ? config.bkashNumber : method === 'nagad' ? config.nagadNumber : config.rocketNumber
                )}
                className={cn(
                  "sm:ml-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all uppercase tracking-widest",
                  copied ? "bg-emerald-500 text-white shadow-md shadow-emerald-200" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs font-medium space-y-2">
               <p className="font-bold flex items-center gap-1"><AlertCircle size={14}/> জরুরি নির্দেশনা:</p>
               <ul className="list-disc pl-5 space-y-1 text-blue-700/80">
                 <li>আপনার অ্যাপে অবশ্যই {config.paymentMode || 'Send Money'} অপশনটি সিলেক্ট করুন।</li>
                 <li>ঠিক <strong>৳{plan.price}</strong> প্রদান করুন। এর বেশি বা কম করবেন না।</li>
                 <li>সফলভাবে টাকা পাঠানোর পর ট্রানজেকশন আইডি (TrxID) টি কপি করুন।</li>
                 <li>টাকা পাঠানোর সময় কোনো রেফারেন্স বা নোট দেবেন না।</li>
               </ul>
            </div>
          </motion.div>
        )}

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">2. Transaction ID</label>
            <input
              type="text"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              placeholder="e.g. 8G5H9J2K"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-base font-bold text-slate-900 uppercase"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !method || !transactionId}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 hover:bg-slate-800 shadow-xl shadow-slate-200 text-sm uppercase tracking-widest"
        >
          {loading ? 'Submitting...' : 'Submit Payment'}
        </button>
      </form>
       )}
      </div>
      )}
    </>
  );
};

