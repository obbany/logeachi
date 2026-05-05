import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ExternalLink, 
  Image as ImageIcon,
  Layout,
  Globe,
  Youtube,
  Facebook,
  Send as Telegram,
  Pause,
  Play
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task, PackagePlan } from '../../types';

export const ManageTasks = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'plans'>('plans');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<PackagePlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskFormData, setTaskFormData] = useState<Partial<Task>>({
    title: '', description: '', reward: 0, platform: 'youtube', category: 'Watch & Earn', url: '', thumbnail: '', status: 'available', packageId: ''
  });

  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PackagePlan | null>(null);
  const [planFormData, setPlanFormData] = useState<Partial<PackagePlan>>({
    name: '', price: 0, dailyIncome: 0, validity: 30, taskCount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Tasks
    const snap = await getDocs(collection(db, 'tasks'));
    setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    
    // Fetch Plans
    const plansSnap = await getDocs(collection(db, 'packages'));
    setPlans(plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PackagePlan)).sort((a,b) => a.price - b.price));
    
    setLoading(false);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let thumbnail = taskFormData.thumbnail;
      if (selectedFile) {
        const storageRef = ref(storage, `tasks/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        thumbnail = await getDownloadURL(storageRef);
      }

      const dataToSave = { ...taskFormData, thumbnail };
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), { ...dataToSave, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'tasks'), { ...dataToSave, createdAt: new Date().toISOString(), status: 'available' });
      }
      setIsAddingTask(false);
      setEditingTask(null);
      setSelectedFile(null);
      setTaskFormData({ title: '', description: '', reward: 0, platform: 'youtube', category: 'Watch & Earn', url: '', thumbnail: '', status: 'available', packageId: '' });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error saving task');
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await updateDoc(doc(db, 'packages', editingPlan.id), planFormData);
      } else {
        await addDoc(collection(db, 'packages'), planFormData);
      }
      setIsAddingPlan(false);
      setEditingPlan(null);
      setPlanFormData({ name: '', price: 0, dailyIncome: 0, validity: 30, taskCount: 0 });
      fetchData();
    } catch (e) {
      alert('Error saving plan');
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title || '', 
      description: task.description || '', 
      reward: task.reward || 0,
      platform: task.platform || 'youtube', 
      category: task.category || 'Watch & Earn', 
      url: task.url || '',
      thumbnail: task.thumbnail || '',
      status: task.status || 'available',
      packageId: task.packageId || ''
    });
    setIsAddingTask(true);
  };

  const handlePlanEdit = (plan: PackagePlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name || '', 
      price: plan.price || 0, 
      dailyIncome: plan.dailyIncome || 0, 
      validity: plan.validity || 30, 
      taskCount: plan.taskCount || 0
    });
    setIsAddingPlan(true);
  };

  const handleTaskDelete = async (id: string) => {
    if (!window.confirm('Delete this job permanently?')) return;
    await deleteDoc(doc(db, 'tasks', id));
    fetchData();
  };

  const handlePlanDelete = async (id: string) => {
    if (!window.confirm('Delete this plan permanently?')) return;
    await deleteDoc(doc(db, 'packages', id));
    fetchData();
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'available' ? 'paused' : 'available';
    await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
    fetchData();
  };

  const categories = ['Watch & Earn', 'Social Follow', 'App Review', 'Website Visit', 'Other'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="w-full sm:w-auto">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Inventory</h1>
          <p className="text-slate-500 text-sm">Control and monitor all platform tasks and packages from here.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {activeTab === 'jobs' ? (
            <button 
              onClick={() => {
                setEditingTask(null);
                setTaskFormData({
                  title: '', description: '', reward: 0, platform: 'youtube', category: 'Watch & Earn', url: '', thumbnail: '', status: 'available', packageId: ''
                });
                setIsAddingTask(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
            >
              <Plus size={20} /> Add New Job
            </button>
          ) : (
            <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-2">
              <button 
                onClick={async () => {
                  if (window.confirm('আপনি কি নিশ্চিত যে আপনি সমস্ত প্যাকেজ মুছে ফেলতে চান?')) {
                    setLoading(true);
                    for (const p of plans) {
                      await deleteDoc(doc(db, 'packages', p.id));
                    }
                    fetchData();
                  }
                }}
                className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center w-full sm:w-auto gap-2 justify-center"
              >
                <Trash2 size={20} /> সমস্ত মুছুন
              </button>
              <button 
                onClick={() => {
                  setEditingPlan(null);
                  setPlanFormData({ name: '', price: 0, dailyIncome: 0, validity: 30, taskCount: 0 });
                  setIsAddingPlan(true);
                }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center w-full sm:w-auto gap-2 justify-center relative z-20 cursor-pointer"
              >
                <Plus size={20} /> Add New Plan
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100 mb-6">
        <button 
          onClick={() => setActiveTab('plans')}
          className={cn("pb-4 px-2 text-sm font-bold transition-all border-b-2", activeTab === 'plans' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600")}
        >
          Manage Packages
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={cn("pb-4 px-2 text-sm font-bold transition-all border-b-2", activeTab === 'jobs' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600")}
        >
          Manage Jobs
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <Layout className="w-10 h-10 text-slate-200 animate-pulse mb-2" />
          <p className="text-slate-400 font-medium">Syncing database...</p>
        </div>
      ) : activeTab === 'jobs' ? (
        <div className="space-y-6">
          {isAddingTask && (
            <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-2xl animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900">{editingTask ? 'Edit Existing Job' : 'Configure New Job'}</h2>
                <button onClick={() => setIsAddingTask(false)} className="p-2 text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Job Title</label>
                    <input required type="text" placeholder="e.g. Subscribe to our YouTube Channel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Reward Amount (৳)</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.reward === 0 ? '' : taskFormData.reward} onChange={e => setTaskFormData({...taskFormData, reward: e.target.value ? Number(e.target.value) : 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.platform} onChange={e => setTaskFormData({...taskFormData, platform: e.target.value})}>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook</option>
                      <option value="telegram">Telegram</option>
                      <option value="website">Website</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.category} onChange={e => setTaskFormData({...taskFormData, category: e.target.value})}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target URL</label>
                    <input required type="url" placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.url} onChange={e => setTaskFormData({...taskFormData, url: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Thumbnail Image</label>
                    <input type="file" accept="image/*" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                    {taskFormData.thumbnail && !selectedFile && <img src={taskFormData.thumbnail} className="mt-2 h-20 rounded-lg" />}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Package</label>
                    <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.packageId} onChange={e => setTaskFormData({...taskFormData, packageId: e.target.value})}>
                      <option value="">Select Package</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Instructions</label>
                  <textarea required rows={3} placeholder="Explain the task clearly..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingTask(false)} className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Discard</button>
                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">{editingTask ? 'Apply Changes' : 'Publish Job'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-12">
            {plans.map((plan) => {
              const planTasks = tasks.filter(t => t.packageId === plan.id);
              if (planTasks.length === 0) return null;
              return (
                <div key={plan.id}>
                  <h2 className="text-xl font-black mb-6 text-slate-800 border-b pb-2">{plan.name} Package Jobs ({planTasks.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {planTasks.map((task) => (
                      <div key={task.id} className={cn("group bg-white p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between", task.status === 'paused' ? "border-slate-100 opacity-75" : "border-transparent shadow-sm hover:shadow-xl hover:border-blue-50")}>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", task.status === 'available' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>{task.status}</div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleTaskEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                              <button onClick={() => toggleTaskStatus(task)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl">{task.status === 'available' ? <Pause size={16} /> : <Play size={16} />}</button>
                              <button onClick={() => handleTaskDelete(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="aspect-video w-full bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                            {task.thumbnail ? (
                              <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <ImageIcon size={40} />
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                              {task.category}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="font-black text-slate-900 leading-tight line-clamp-1">{task.title}</h3>
                            <span className="text-lg font-black text-emerald-600">৳{task.reward}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{task.description}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.platform === 'youtube' && <Youtube size={16} className="text-red-500" />}
                            {task.platform === 'facebook' && <Facebook size={16} className="text-blue-600" />}
                            {task.platform === 'telegram' && <Telegram size={16} className="text-sky-500" />}
                            {task.platform === 'website' && <Globe size={16} className="text-slate-400" />}
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">{task.platform}</span>
                          </div>
                          <a href={task.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* Tasks without a package */}
            {tasks.filter(t => !t.packageId || !plans.find(p => p.id === t.packageId)).length > 0 && (
              <div>
                <h2 className="text-xl font-black mb-6 text-slate-800 border-b pb-2">Unassigned Jobs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tasks.filter(t => !t.packageId || !plans.find(p => p.id === t.packageId)).map((task) => (
                      <div key={task.id} className={cn("group bg-white p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between", task.status === 'paused' ? "border-slate-100 opacity-75" : "border-transparent shadow-sm hover:shadow-xl hover:border-blue-50")}>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", task.status === 'available' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>{task.status}</div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleTaskEdit(task)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={16} /></button>
                              <button onClick={() => toggleTaskStatus(task)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl">{task.status === 'available' ? <Pause size={16} /> : <Play size={16} />}</button>
                              <button onClick={() => handleTaskDelete(task.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="aspect-video w-full bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                            {task.thumbnail ? (
                              <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20">
                                <ImageIcon size={40} />
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                              {task.category}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="font-black text-slate-900 leading-tight line-clamp-1">{task.title}</h3>
                            <span className="text-lg font-black text-emerald-600">৳{task.reward}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{task.description}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.platform === 'youtube' && <Youtube size={16} className="text-red-500" />}
                            {task.platform === 'facebook' && <Facebook size={16} className="text-blue-600" />}
                            {task.platform === 'telegram' && <Telegram size={16} className="text-sky-500" />}
                            {task.platform === 'website' && <Globe size={16} className="text-slate-400" />}
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">{task.platform}</span>
                          </div>
                          <a href={task.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isAddingPlan && (
            <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-2xl animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-900">{editingPlan ? 'Edit Existing Plan' : 'Configure New Plan'}</h2>
                <button onClick={() => setIsAddingPlan(false)} className="p-2 text-slate-400 hover:text-slate-900">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handlePlanSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Name</label>
                    <input required type="text" placeholder="e.g. Basic (বেসিক)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={planFormData.name} onChange={e => setPlanFormData({...planFormData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Price (৳)</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={planFormData.price === 0 ? '' : planFormData.price} onChange={e => setPlanFormData({...planFormData, price: e.target.value ? Number(e.target.value) : 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Income (৳)</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={planFormData.dailyIncome === 0 ? '' : planFormData.dailyIncome} onChange={e => setPlanFormData({...planFormData, dailyIncome: e.target.value ? Number(e.target.value) : 0})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Validity (Days)</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={planFormData.validity === 0 ? '' : planFormData.validity} onChange={e => setPlanFormData({...planFormData, validity: e.target.value ? Number(e.target.value) : 0})} />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Tasks/Ads Count</label>
                    <input required type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={planFormData.taskCount === 0 ? '' : planFormData.taskCount} onChange={e => setPlanFormData({...planFormData, taskCount: e.target.value ? Number(e.target.value) : 0})} />
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setIsAddingPlan(false)} className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Discard</button>
                  <button type="submit" className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all">{editingPlan ? 'Apply Changes' : 'Publish Plan'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">{plan.name}</h3>
                    <p className="text-3xl font-black text-emerald-600 mt-2">৳{plan.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handlePlanEdit(plan)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"><Edit2 size={16} /></button>
                    <button onClick={() => handlePlanDelete(plan.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="space-y-3 mt-6 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500">Daily Income</span>
                    <span className="font-black text-slate-900">৳{plan.dailyIncome}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500">Daily Ads</span>
                    <span className="font-black text-slate-900">{plan.taskCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500">Validity</span>
                    <span className="font-black text-slate-900">{plan.validity} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-500">Total Income</span>
                    <span className="font-black text-emerald-600">৳{(plan.dailyIncome * plan.validity).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
