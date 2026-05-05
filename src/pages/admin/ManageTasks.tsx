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
    const allTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    setTasks(allTasks.filter(t => t.type !== 'bonus'));
    
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
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <Layout className="w-10 h-10 text-slate-200 animate-pulse mb-2" />
          <p className="text-slate-400 font-medium">Syncing database...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {activeTab === 'jobs' && (
            <div className="space-y-6">
               {isAddingTask ? (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative">
                    <button onClick={() => setIsAddingTask(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                      <X size={24} />
                    </button>
                    <h2 className="text-xl font-bold mb-6">{editingTask ? 'Edit Job' : 'Add New Job'}</h2>
                    <form onSubmit={handleTaskSubmit} className="space-y-4 max-w-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                          <input type="text" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Reward Amount (৳)</label>
                          <input type="number" value={taskFormData.reward} onChange={e => setTaskFormData({...taskFormData, reward: Number(e.target.value)})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3}></textarea>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Task URL</label>
                          <input type="url" value={taskFormData.url} onChange={e => setTaskFormData({...taskFormData, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                          <select value={taskFormData.category} onChange={e => setTaskFormData({...taskFormData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Thumbnail Link (Or Upload below)</label>
                          <input type="url" value={taskFormData.thumbnail} onChange={e => setTaskFormData({...taskFormData, thumbnail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Upload Image</label>
                          <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Package Plan</label>
                        <select value={taskFormData.packageId || ''} onChange={e => setTaskFormData({...taskFormData, packageId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">All Packages (Default)</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Check size={20} /> Save Job
                      </button>
                    </form>
                  </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(task => (
                      <div key={task.id} className={cn("bg-white rounded-3xl p-6 border border-slate-100 shadow-sm", task.status === 'paused' && "opacity-75")}>
                        <div className="flex justify-between items-start mb-4">
                          {task.thumbnail ? (
                            <img src={task.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                              <ImageIcon size={24} />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => toggleTaskStatus(task)} className={cn("p-2 rounded-lg transition-colors", task.status === 'available' ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")}>
                               {task.status === 'available' ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <button onClick={() => handleTaskEdit(task)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleTaskDelete(task.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg mb-2">
                          {task.category}
                        </span>
                        <h3 className="font-black text-lg text-slate-900 mb-1">{task.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4">{task.description}</p>
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-blue-600">৳{task.reward}</span>
                          <span className={task.status === 'available' ? 'text-emerald-500' : 'text-amber-500'}>{task.status}</span>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="col-span-full py-10 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-100">No jobs found.</div>
                    )}
                 </div>
               )}
            </div>
          )}
          {activeTab === 'plans' && (
            <div className="space-y-6">
               {isAddingPlan ? (
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative">
                    <button onClick={() => setIsAddingPlan(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                      <X size={24} />
                    </button>
                    <h2 className="text-xl font-bold mb-6">{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h2>
                    <form onSubmit={handlePlanSubmit} className="space-y-4 max-w-2xl">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Package Name</label>
                        <input type="text" value={planFormData.name} onChange={e => setPlanFormData({...planFormData, name: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Price (৳)</label>
                          <input type="number" value={planFormData.price} onChange={e => setPlanFormData({...planFormData, price: Number(e.target.value)})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Daily Income (৳)</label>
                          <input type="number" value={planFormData.dailyIncome} onChange={e => setPlanFormData({...planFormData, dailyIncome: Number(e.target.value)})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Validity (Days)</label>
                          <input type="number" value={planFormData.validity} onChange={e => setPlanFormData({...planFormData, validity: Number(e.target.value)})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Daily Tasks Allowed</label>
                          <input type="number" value={planFormData.taskCount} onChange={e => setPlanFormData({...planFormData, taskCount: Number(e.target.value)})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>

                      <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <Check size={20} /> Save Plan
                      </button>
                    </form>
                  </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                      <div key={plan.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handlePlanEdit(plan)} className="p-2 bg-slate-100 text-blue-600 rounded-lg hover:bg-slate-200 transition-colors shadow">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handlePlanDelete(plan.id)} className="p-2 bg-slate-100 text-red-600 rounded-lg hover:bg-slate-200 transition-colors shadow">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h3 className="font-black text-xl text-slate-900 mb-4">{plan.name}</h3>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold">Price</span>
                            <span className="font-black text-slate-900">৳{plan.price}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold">Daily Income</span>
                            <span className="font-black text-emerald-600">৳{plan.dailyIncome}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold">Validity</span>
                            <span className="font-black text-slate-900">{plan.validity} Days</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-bold">Daily Tasks</span>
                            <span className="font-black text-slate-900">{plan.taskCount}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-50 text-slate-400 py-3 rounded-xl text-center text-xs font-bold uppercase tracking-widest break-all px-2">
                           ID: {plan.id}
                        </div>
                      </div>
                    ))}
                    {plans.length === 0 && (
                      <div className="col-span-full py-10 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-100">No plans found.</div>
                    )}
                 </div>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
