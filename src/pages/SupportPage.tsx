import React, { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageCircle, ShieldCheck, Mail, LogIn, ExternalLink } from 'lucide-react';

export const SupportPage = () => {
  const [loading, setLoading] = useState(true);
  const [supportLinks, setSupportLinks] = useState({
    accountActive: '',
    withdrawAdmin: '',
    passwordProblem: '',
    promoteAdmin: ''
  });

  useEffect(() => {
    const fetchLinks = async () => {
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
    fetchLinks();
  }, []);

  const supportOptions = [
    {
      id: 'accountActive',
      title: 'Account Active',
      description: 'Need help activating your account?',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-600',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      id: 'withdrawAdmin',
      title: 'Withdraw Admin',
      description: 'Questions about your withdrawals?',
      icon: MessageCircle,
      color: 'bg-blue-50 text-blue-600',
      btnColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'passwordProblem',
      title: 'Password Problem',
      description: 'Trouble logging in or resetting password?',
      icon: LogIn,
      color: 'bg-amber-50 text-amber-600',
      btnColor: 'bg-amber-600 hover:bg-amber-700'
    },
    {
      id: 'promoteAdmin',
      title: 'Promote Admin',
      description: 'Want to promote or advertise with us?',
      icon: Mail,
      color: 'bg-purple-50 text-purple-600',
      btnColor: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Support Line</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Need assistance? Choose the relevant department below to contact our support team directly via Telegram.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {supportOptions.map((option) => {
            const url = supportLinks[option.id as keyof typeof supportLinks];
            
            return (
              <div key={option.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${option.color}`}>
                  <option.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{option.title}</h3>
                <p className="text-slate-500 text-sm mb-6 flex-1">{option.description}</p>
                
                <a 
                  href={url || '#'} 
                  target={url ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black text-white transition-all shadow-lg ${option.btnColor} ${!url ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                  onClick={(e) => {
                    if (!url) {
                      e.preventDefault();
                      alert('Support link not configured yet.');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Get Support
                  <ExternalLink size={16} className="ml-1 opacity-50" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
