import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Loader2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ManageReferral = () => {
    const [commission, setCommission] = useState({
        gen1: 50,
        gen2: 30,
        gen3: 20
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        const fetchCommission = async () => {
            const docRef = doc(db, 'settings', 'commission');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setCommission(docSnap.data() as { gen1: number, gen2: number, gen3: number });
            }
            setLoading(false);
        };
        fetchCommission();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setIsSaved(false);
        try {
            await setDoc(doc(db, 'settings', 'commission'), commission);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert('Failed to update. Please try again.');
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <Loader2 className="animate-spin text-blue-600" size={40}/>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Referral Commission Settings</h1>
                {isSaved && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">
                        <Check size={14} /> Saved Successfully
                    </span>
                )}
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <p className="text-slate-500 text-sm">Configure commission amounts for each referral generation. Active accounts will trigger automatic commission distribution.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['gen1', 'gen2', 'gen3'].map((key) => (
                        <div key={key}>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Generation {key.replace('gen', '')} Amount</label>
                            <input 
                                type="number" 
                                value={commission[key as keyof typeof commission]} 
                                onChange={(e) => setCommission(prev => ({...prev, [key]: Number(e.target.value)}))}
                                className="w-full p-4 border border-slate-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            />
                        </div>
                    ))}
                </div>

                <button 
                  onClick={handleSave} 
                  className={cn(
                    "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
                    isSaved ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800",
                    saving && "opacity-70 cursor-not-allowed"
                  )}
                  disabled={saving}
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin" size={20}/>
                            Saving...
                        </>
                    ) : isSaved ? (
                        <>
                            <Check size={20}/>
                            Configuration Saved
                        </>
                    ) : (
                        <>
                            <Save size={20}/>
                            Save Commission Settings
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
