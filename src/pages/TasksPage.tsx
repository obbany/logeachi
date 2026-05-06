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

const LiveCountdown = ({ targetDate }: { targetDate: number }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, targetDate - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, targetDate - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft <= 0) return <span className="text-emerald-500 font-bold">Refresh page to see task!</span>;

  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  return (
    <span className="font-mono tabular-nums">
      {h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </span>
  );
};

export const TasksPage = () => {
  const { userData, setUserData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
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

        // We don't fetch user cooldown status anymore.
        // Each task has its own 24 hour cooldown based on submission time.

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

        // Fetch Available Tasks (Active plan + Bonus)
        const tasksQuery = query(
          collection(db, 'tasks'), 
          where('status', '==', 'available')
        );
        const tasksSnap = await getDocs(tasksQuery);
        let taskData = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        
        // Filter tasks:
        // If user has an active package, show tasks for that package OR tasks marked for all packages.
        // If user has NO active package, show ONLY bonus (Free) tasks.
        if (activePlan) {
          taskData = taskData.filter(t => (t.packageId === activePlan.id || !t.packageId) && t.type !== 'bonus');
        } else {
          taskData = taskData.filter(t => t.type === 'bonus');
        }
        
        setTasks(taskData);

        // Fetch User's Submissions (General History)
        const subQuery = query(collection(db, 'submissions'), where('userId', '==', userData.uid));
        const subSnap = await getDocs(subQuery);
        const subMap: Record<string, Submission> = {};
        const allSubs: (Submission & { id: string })[] = [];
        subSnap.docs.forEach(doc => {
          const data = doc.data() as Submission;
          const sub = { id: doc.id, ...data };
          allSubs.push(sub);
          const existingTime = subMap[data.taskId] ? new Date(subMap[data.taskId].createdAt).getTime() : 0;
          const newTime = new Date(data.createdAt).getTime();
          if (newTime >= existingTime) {
            subMap[data.taskId] = sub;
          }
        });
        setSubmissions(subMap);
        setAllSubmissions(allSubs);

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
      const isBonus = task.type === 'bonus';
      
      const submissionData = {
        userId: userData.uid,
        userShortId: userData.shortId || 'N/A',
        taskId: task.id,
        reward: task.reward,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
      };
      
      const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
      
      if (!isBonus) {
        await addDoc(collection(db, 'daily_task_completions'), {
          userId: userData.uid,
          taskId: task.id,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
        setCompletedTodayCount(prev => prev + 1);
      }

      // No longer using global blocked state. Tasks reset individually.

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
      const newSubmission = { id: submissionRef.id, ...submissionData };
      setSubmissions(prev => ({
        ...prev,
        [task.id]: newSubmission
      }));
      setAllSubmissions(prev => [newSubmission, ...prev]);

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

  const isSubmissionActive = (task: Task) => {
    const sub = submissions[task.id];
    if (!sub) return false;
    const subTime = new Date(sub.createdAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (Date.now() - subTime) < twentyFourHours;
  };

  const regularTasks = tasks.filter(t => t.type !== 'bonus' && !isSubmissionActive(t));
  const bonusTasks = tasks.filter(t => t.type === 'bonus' && !isSubmissionActive(t));
  const availableTasks = [...regularTasks, ...bonusTasks];
  const completedTasks = tasks.filter(t => isSubmissionActive(t));

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
            Work History ({allSubmissions.length})
            {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
          </button>
        </div>

      {activeTab === 'available' ? (
        <div className="space-y-6">
          {availableTasks.length === 0 && (
            <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm mb-4">
               <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
               <h2 className="text-xl font-black text-slate-900 mb-1">No Jobs Available</h2>
               <p className="text-slate-500 font-medium text-sm mb-4">Please check back later. Completed jobs will reappear 24 hours after completion.</p>
               {completedTasks.length > 0 && (
                 <div className="max-w-xs mx-auto bg-blue-50 border border-blue-100 text-blue-700 py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-sm">
                   <div className="text-xs text-blue-600/80 uppercase tracking-widest uppercase">Next job available in</div>
                   <div className="text-2xl"><LiveCountdown targetDate={Math.min(...completedTasks.map(t => new Date(submissions[t.id]?.createdAt || 0).getTime() + (24 * 60 * 60 * 1000)))} /></div>
                 </div>
               )}
            </div>
          )}

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
                  {task.type === 'bonus' && (
                    <div className="absolute bottom-3 left-3 bg-yellow-500/90 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                      <span className="text-[10px] text-white uppercase font-bold tracking-wider">Free Bonus Job</span>
                    </div>
                  )}
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

          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {allSubmissions.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
          }).map(sub => {
            const task = tasks.find(t => t.id === sub.taskId);
            const title = task?.title || 'Completed Job';
            const platform = task?.platform || 'other';
            const reward = sub.reward || task?.reward || 0;
            return (
            <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-1">{title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Completed: {new Date(sub.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <PlatformIcon platform={platform} size={14} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{platform}</span>
                </div>
                <div className="text-emerald-600 font-black text-lg">
                  +৳{reward}
                </div>
              </div>
            </div>
          )})}
          {allSubmissions.length === 0 && (
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
