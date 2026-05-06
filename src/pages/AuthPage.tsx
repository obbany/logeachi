import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ShieldCheck, Phone, Lock, User, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthPage = ({ mode }: { mode: 'login' | 'register' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referral, setReferral] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferral(refCode);
    }
  }, [searchParams]);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const userEmail = `${phone}@logeachi.com`;
        const res = await createUserWithEmailAndPassword(auth, userEmail, password);
        
        // Generate a random 6-digit number for shortId
        const shortId = Math.floor(100000 + Math.random() * 900000).toString();

        try {
          await setDoc(doc(db, 'users', phone), {
            uid: res.user.uid,
            shortId,
            phone,
            name,
            status: 'inactive',
            balance: 0,
            totalWithdraw: 0,
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referredBy: (referral || null)?.toUpperCase(),
            country: 'Bangladesh',
            role: 'user',
            createdAt: new Date().toISOString(),
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${phone}`);
        }
      } else {
        const userEmail = `${phone}@logeachi.com`;
        await signInWithEmailAndPassword(auth, userEmail, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('এই নম্বর দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে আগে রেজিস্ট্রেশন করুন। (No account found with this number)');
      } else if (err.code === 'auth/wrong-password') {
        setError('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন। (Incorrect password)');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('এই নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। (Account already exists)');
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError(`সার্ভার কনফিগারেশন ত্রুটি। 
১. Firebase Console > Auth > Settings > User actions এ গিয়ে "Email enumeration protection" আনচেক করে সেভ (Save) করেছেন কিনা নিশ্চিত হোন। 
২. "Authorized domains" এ "${window.location.hostname}" যোগ করা আছে কিনা চেক করুন। 
৩. পরিবর্তন করার পর ২-৩ মিনিট অপেক্ষা করে আবার চেষ্টা করুন।`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('আপনার Firebase কনসোল থেকে "Sign-in method" এ গিয়ে Email/Password অপশনটি Enable করুন।');
      } else if (err.code === 'auth/invalid-credential') {
        setError('ভুল নম্বর বা পাসওয়ার্ড দেওয়া হয়েছে। অথবা Firebase-এ আপনার ডোমেইনটি অথরাইজড করা নেই।');
      } else if (err.code === 'auth/network-request-failed') {
        setError('ইন্টারনেট সংযোগ বিচ্ছিন্ন। আবার চেষ্টা করুন। (Network error)');
      } else {
        setError(err.message || 'অথেন্টিকেশন ব্যর্থ হয়েছে।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-200">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'register' ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {mode === 'register' ? 'Join LogeAchi - Bangladesh\'s leading micro-task platform' : 'Enter your credentials to continue'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                required
                placeholder="017XXXXXXXX"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Referral Code (Optional)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="CODE123"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-sm">
            {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link 
              to={mode === 'register' ? '/login' : '/register'}
              className="text-blue-600 font-semibold hover:underline"
            >
              {mode === 'register' ? 'Sign In' : 'Create Account'}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
