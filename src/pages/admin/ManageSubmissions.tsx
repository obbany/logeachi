import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc, runTransaction, addDoc, serverTimestamp } from 'firebase/firestore';
import { Check, X, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const ManageSubmissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'submissions'));
    setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleAction = async (submissionId: string, status: 'approved' | 'rejected') => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;

    try {
      await runTransaction(db, async (transaction) => {
        const subRef = doc(db, 'submissions', submissionId);
        const userRef = doc(db, 'users', sub.userId);
        const taskRef = doc(db, 'tasks', sub.taskId);

        const taskSnap = await transaction.get(taskRef);
        const userSnap = await transaction.get(userRef);

        if (!taskSnap.exists()) throw new Error('Task not found');
        const reward = taskSnap.data().reward;

        transaction.update(subRef, { status });

        if (status === 'approved') {
          if (userSnap.exists()) {
            const currentBalance = userSnap.data().balance || 0;
            transaction.update(userRef, { 
              balance: currentBalance + reward 
            });

            // Log Earning
            const transRef = doc(collection(db, 'transactions'));
            transaction.set(transRef, {
              userId: sub.userId,
              amount: reward,
              type: 'task_earning',
              createdAt: serverTimestamp()
            });
          }
        }
      });

      setSubmissions(submissions.map(s => s.id === submissionId ? { ...s, status } : s));
    } catch (e) {
      console.error(e);
      alert('Failed to process submission');
    }
  };

  const pending = submissions.filter(s => s.status === 'pending');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Task Submissions</h1>
        <p className="text-slate-500">Verify user proof of work</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pending.map((sub) => (
          <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="text-sm font-black text-slate-900 tracking-tight">ID: {sub.userShortId || 'N/A'}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">{format(new Date(sub.createdAt), 'dd MMMM yyyy h:mm a')}</div>
            </div>
            
            <div className="relative aspect-video group cursor-zoom-in" onClick={() => setSelectedImage(sub.screenshotUrl)}>
              <img src={sub.screenshotUrl} alt="Screenshot" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="text-white" />
              </div>
            </div>

            <div className="p-4 flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-4">Task ID: {sub.taskId}</div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleAction(sub.id, 'rejected')}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Reject
                </button>
                <button 
                  onClick={() => handleAction(sub.id, 'approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Approve
                </button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No pending submissions found.
          </div>
        )}
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Preview" className="max-w-full max-h-full rounded-lg shadow-2xl shadow-blue-500/10" />
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
};
