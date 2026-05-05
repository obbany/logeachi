import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  Youtube, 
  Facebook, 
  Send as Telegram, 
  Globe, 
  Trophy, 
  ArrowRight, 
  Loader2,
  History,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, where, doc, updateDoc, increment, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Task, Submission, Activation, PackagePlan } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PlatformIcon = ({ platform, size = 18 }: { platform: string, size?: number }) => {
  switch (platform.toLowerCase()) {
    case 'youtube': return <Youtube size={size} className="text-red-500" />;
    case 'facebook': return <Facebook size={size} className="text-blue-600" />;
    case 'telegram': return <Telegram size={size} className="text-sky-500" />;
    default: return <Globe size={size} className="text-slate-500" />;
  }
};

export const TasksPage = () => {
  const { userData, setUserData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [taskLimit, setTaskLimit] = useState(0);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isClaimReady, setIsClaimReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [resetAt, setResetAt] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (resetAt) {
        const remaining = resetAt - Date.now();
        if (remaining <= 0) {
          setBlocked(false);
          setResetAt(null);
        } else {
          setTimeLeft(Math.floor(remaining / 1000));
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [resetAt]);

  // Fetch Daily Completions Count first
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return;
      
      try {
        setLoading(true);

        // Fetch User Cooldown Status
        const statusDoc = await getDoc(doc(db, 'user_task_status', userData.uid));
        if (statusDoc.exists()) {
          const status = statusDoc.data();
          if (status.nextAvailableAt > Date.now()) {
            setBlocked(true);
            setResetAt(status.nextAvailableAt);
          }
        }

        // Fetch All Plans
        const plansSnap = await getDocs(collection(db, 'packages'));
        const plansData = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagePlan));

        // Fetch User's Activations
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

        const activeActivation = history.find(h => {
          if (h.status !== 'approved') return false;
          const plan = plansData.find(p => p.id === h.packageId);
          if (!plan) return false;
          const createdAt = new Date(h.createdAt).getTime();
          const validity = plan.validity * 24 * 60 * 60 * 1000;
          return (createdAt + validity) > Date.now();
        });
        const activePlan = plansData.find(p => p.id === activeActivation?.packageId);

        // Fetch Available Tasks (All available tasks for this package)
        const tasksQuery = query(
          collection(db, 'tasks'), 
          where('status', '==', 'available'),
          where('packageId', '==', activePlan?.id || 'none')
        );
        const tasksSnap = await getDocs(tasksQuery);
        let taskData = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(taskData);

        // Fetch User's Submissions (General History)
        const subQuery = query(collection(db, 'submissions'), where('userId', '==', userData.uid));
        const subSnap = await getDocs(subQuery);
        const subMap: Record<string, Submission> = {};
        subSnap.docs.forEach(doc => {
          const data = doc.data() as Submission;
          subMap[data.taskId] = { id: doc.id, ...data };
        });
        setSubmissions(subMap);

        // Fetch Daily Completions Count
        const today = new Date().toISOString().split('T')[0];
        const dailyCompletionsQuery = query(
          collection(db, 'daily_task_completions'), 
          where('userId', '==', userData.uid),
          where('date', '==', today)
        );
        const dailyCompletionsSnap = await getDocs(dailyCompletionsQuery);
        setCompletedTodayCount(dailyCompletionsSnap.size);

        const allowedCount = activePlan?.taskCount || 0;
        setTaskLimit(allowedCount);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  // Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setIsClaimReady(true);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const handleStartTask = (task: Task) => {
    setSelectedTaskId(task.id);
    window.open(task.url, '_blank');
    setTimeLeft(15);
    setIsTimerRunning(true);
    setIsClaimReady(false);
  };

  const handleClaimReward = async (task: Task) => {
    if (!userData || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Use the local count for check instead of re-fetching during write
      const nextCount = completedTodayCount + 1;
      const allowedCount = taskLimit;

      const submissionData = {
        userId: userData.uid,
        userShortId: userData.shortId || 'N/A',
        taskId: task.id,
        reward: task.reward,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
      };
      
      const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
      
      await addDoc(collection(db, 'daily_task_completions'), {
        userId: userData.uid,
        taskId: task.id,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      if (nextCount >= allowedCount) {
        const nextAvailableAt = Date.now() + 24 * 60 * 60 * 1000;
        await setDoc(doc(db, 'user_task_status', userData.uid), {
          nextAvailableAt,
          updatedAt: serverTimestamp()
        });
        setBlocked(true);
        setResetAt(nextAvailableAt);
      }

      setCompletedTodayCount(nextCount);

      // 2. Add Transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: userData.uid,
        amount: task.reward,
        type: 'credit',
        category: 'task',
        title: `Job Reward: ${task.title}`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // 3. Update User Balance
      const userRef = doc(db, 'users', userData.id!);
      await updateDoc(userRef, {
        balance: increment(task.reward)
      });

      // 4. Update Local States
      setSubmissions(prev => ({
        ...prev,
        [task.id]: {
          id: submissionRef.id,
          ...submissionData
        }
      }));

      if (setUserData) {
        setUserData({ ...userData, balance: (userData.balance || 0) + task.reward });
      }

      setSelectedTaskId(null);
      setIsClaimReady(false);
      alert(`Success! ৳${task.reward} added to your account.`);
    } catch (err) {
        console.error(err);
        alert('Something went wrong. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const remainingTasksCount = Math.max(0, taskLimit - completedTodayCount);
  const availableTasks = tasks.filter(t => !submissions[t.id]).slice(0, remainingTasksCount);
  const completedTasks = tasks.filter(t => submissions[t.id]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-200 mb-2">
            <Trophy size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Digital Marketplace</span>
          </div>
          <h1 className="text-3xl font-black mb-2 font-sans tracking-tight">Expert Job Board</h1>
          <p className="text-indigo-100 max-w-lg text-sm opacity-90">
            Complete high-reward tasks and earn money instantly. Verified jobs with automatic payments after 15 seconds.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      </div>      {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('available')}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all relative",
              activeTab === 'available' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Available Jobs ({availableTasks.length})
            {activeTab === 'available' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all relative",
              activeTab === 'history' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Work History ({completedTasks.length})
            {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
          </button>
        </div>

      {activeTab === 'available' ? (
        blocked ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-blue-100 shadow-sm mb-8">
             <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
             <h2 className="text-xl font-black text-slate-900 mb-1">Daily Limit Reached</h2>
             <p className="text-slate-500 mb-4 font-medium text-sm">Your tasks will reset in:</p>
             <div className="text-3xl font-black text-blue-600 font-mono">
               {Math.floor(timeLeft / 3600)}:{Math.floor((timeLeft % 3600) / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
             </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTasks.map((task) => (
            <motion.div 
              layoutId={task.id}
              key={task.id}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {task.thumbnail ? (
                  <img src={task.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlatformIcon platform={task.platform} size={40} />
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <PlatformIcon platform={task.platform} size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-700">{task.platform}</span>
                </div>
                <div className="absolute top-3 right-3 bg-emerald-600 px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-lg">
                  +৳{task.reward}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">{task.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                </div>

                <div className="space-y-2">
                  {isTimerRunning && selectedTaskId === task.id ? (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-xl flex items-center justify-between font-bold text-xs animate-pulse">
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        Wait for verification...
                      </div>
                      <span className="text-sm font-black">{timeLeft}s</span>
                    </div>
                  ) : isClaimReady && selectedTaskId === task.id ? (
                    <button 
                      onClick={() => handleClaimReward(task)}
                      disabled={isSubmitting}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all scale-[1.02]"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <>Claim Reward ৳{task.reward} <Check size={16} /></>}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartTask(task)}
                      disabled={userData?.status !== 'active' || isTimerRunning}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      {userData?.status !== 'active' ? "Activate Account to Work" : "Start Job (15s)"}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {availableTasks.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">No tasks available right now. Check back soon!</p>
            </div>
          )}
        </div>
        )
      ) : (
        <div className="space-y-4">
          {blocked && (
             <div className="text-center py-10 bg-white rounded-3xl border border-blue-100 shadow-sm mb-8">
             <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
             <h2 className="text-xl font-black text-slate-900 mb-1">Daily Limit Reached</h2>
             <p className="text-slate-500 mb-4 font-medium text-sm">Your tasks will reset in:</p>
             <div className="text-3xl font-black text-blue-600 font-mono">
               {Math.floor(timeLeft / 3600)}:{Math.floor((timeLeft % 3600) / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
             </div>
          </div>
          )}
          {completedTasks.sort((a, b) => {
              const dateA = new Date(submissions[a.id]?.createdAt || 0).getTime();
              const dateB = new Date(submissions[b.id]?.createdAt || 0).getTime();
              return dateB - dateA;
          }).map(task => (
            <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-1">{task.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Completed on: {new Date(submissions[task.id]?.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <PlatformIcon platform={task.platform} size={14} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{task.platform}</span>
                </div>
                <div className="text-emerald-600 font-black text-lg">
                  +৳{task.reward}
                </div>
              </div>
            </div>
          ))}
          {completedTasks.length === 0 && !blocked && (
            <div className="py-20 text-center">
              <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">You haven't completed any jobs yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
