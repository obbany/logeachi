import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save, Layout } from 'lucide-react';

export const ManageSupport = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supportLinks, setSupportLinks] = useState({
    accountActive: '',
    withdrawAdmin: '',
    passwordProblem: '',
    promoteAdmin: ''
  });

  useEffect(() => {
    fetchSupportLinks();
  }, []);

  const fetchSupportLinks = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'support'));
      if (snap.exists()) {
        setSupportLinks(snap.data() as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'support'), supportLinks);
      alert('Support Links saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save support links.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Layout className="w-10 h-10 text-slate-200 animate-pulse mb-2" />
        <p className="text-slate-400 font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Support Settings</h1>
        <p className="text-slate-500 text-sm">Manage the Telegram contact links for different support options.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Account Active URL</label>
            <input 
              type="url" 
              value={supportLinks.accountActive} 
              onChange={e => setSupportLinks({...supportLinks, accountActive: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="https://t.me/your_account_support" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Withdraw Admin URL</label>
            <input 
              type="url" 
              value={supportLinks.withdrawAdmin} 
              onChange={e => setSupportLinks({...supportLinks, withdrawAdmin: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="https://t.me/your_withdraw_admin" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password Problem URL</label>
            <input 
              type="url" 
              value={supportLinks.passwordProblem} 
              onChange={e => setSupportLinks({...supportLinks, passwordProblem: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="https://t.me/your_password_support" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Promote Admin URL</label>
            <input 
              type="url" 
              value={supportLinks.promoteAdmin} 
              onChange={e => setSupportLinks({...supportLinks, promoteAdmin: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="https://t.me/your_promote_admin" 
            />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : <><Save size={20} /> Save Support Links</>}
        </button>
      </div>
    </div>
  );
};
