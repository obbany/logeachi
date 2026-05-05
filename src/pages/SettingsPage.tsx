import React, { useState } from 'react';
import { Save, User, Mail, Wallet, Phone, Loader2, Shield, Copy, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export const SettingsPage = () => {
  const { userData, refreshUser } = useAuth();
  
  const [name, setName] = useState(userData?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !userData.phone) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', userData.phone), {
        name
      });
      await refreshUser?.();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to update name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
        setPasswordMessage('Passwords do not match');
        return;
    }
    try {
        const user = auth.currentUser;
        if (!user || !user.email) return;
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setPasswordMessage('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } catch (error) {
        setPasswordMessage('Error updating password: ' + (error as Error).message);
    }
}

  if (!userData) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 mt-1">Manage your identity and payout preferences.</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-bold text-sm ${userData.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          Status: {userData.status?.toUpperCase() || 'N/A'}
        </div>
      </div>


        {/* Profile Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-6">
            <User size={20} className="text-blue-600" />
            Profile Details
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <User size={18} className="text-slate-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-transparent text-sm font-semibold text-slate-900 focus:outline-none" />
              </div>
            </div>
            
            <button 
              type="button"
              disabled={isSaving || isSaved}
              onClick={handleSave}
              className={`w-full font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${isSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : isSaved ? <CheckCircle size={20} /> : <Save size={20} />}
              {isSaved ? 'Updated' : 'Update Name'}
            </button>
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-100 opacity-60">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-600">{userData.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock size={18} className="text-indigo-600" />
            Change Password
          </h3>
          <div className="space-y-4">
            <input type="password" placeholder="Old Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100" />
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100" />
            <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100" />
            <button type="button" onClick={handlePasswordChange} className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700">Update Password</button>
            {passwordMessage && <p className="text-sm font-semibold text-center mt-2" style={{ color: passwordMessage.includes('successfully') ? 'green' : 'red' }}>{passwordMessage}</p>}
          </div>
        </div>
    </div>
  );
};
