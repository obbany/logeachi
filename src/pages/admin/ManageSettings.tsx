import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Smartphone, ShieldCheck, Banknote, Loader2 } from 'lucide-react';
import { Config } from '../../types';
import { cn } from '../../lib/utils';

export const ManageSettings = () => {
  const [config, setConfig] = useState<Config>({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    activationFee: 0,
    minWithdraw: 200,
    paymentMode: 'Send Money'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          bkashNumber: data.bkashNumber || '',
          nagadNumber: data.nagadNumber || '',
          rocketNumber: data.rocketNumber || '',
          activationFee: data.activationFee || 0,
          minWithdraw: data.minWithdraw || 0,
          paymentMode: data.paymentMode || 'Send Money'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), config);
      alert('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global Settings</h1>
        <p className="text-slate-500 text-sm">Configure payment details and platform thresholds.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Numbers */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Smartphone size={18} className="text-blue-600" />
              Payment Numbers
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">bKash Number</label>
                <input 
                  type="text"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.bkashNumber}
                  onChange={e => setConfig({...config, bkashNumber: e.target.value})}
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Nagad Number</label>
                <input 
                  type="text"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.nagadNumber}
                  onChange={e => setConfig({...config, nagadNumber: e.target.value})}
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Rocket Number</label>
                <input 
                  type="text"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.rocketNumber}
                  onChange={e => setConfig({...config, rocketNumber: e.target.value})}
                  placeholder="017XXXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Thresholds */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Banknote size={18} className="text-emerald-600" />
              Pricing & Thresholds
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Activation Fee (৳)</label>
                <input 
                  type="number"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.activationFee}
                  onChange={e => setConfig({...config, activationFee: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Minimum Withdraw (৳)</label>
                <input 
                  type="number"
                  className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.minWithdraw}
                  onChange={e => setConfig({...config, minWithdraw: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Payment Mode (for Activation)</label>
                <div className="flex gap-2 mt-1">
                  {['Send Money', 'Cash Out'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConfig({...config, paymentMode: mode as any})}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border",
                        config.paymentMode === mode 
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" 
                          : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-2xl">
                <ShieldCheck size={20} />
                <p className="text-[10px] font-medium">These settings affect all users instantly. Double check before saving.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
