import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Check, X, Layout, Pause, Play, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Task } from '../../types';

export const ManageBonus = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskFormData, setTaskFormData] = useState<any>({
    title: '', description: '', reward: '', platform: 'youtube', category: 'Account Create Bonus', url: '', thumbnail: '', status: 'available'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const q = query(collection(db, 'tasks'), where('type', '==', 'bonus'));
    const snap = await getDocs(q);
    setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    setLoading(false);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let thumbnail = taskFormData.thumbnail;
      if (selectedFile) {
        const storageRef = ref(storage, `bonus/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        thumbnail = await getDownloadURL(storageRef);
      }

      const dataToSave = { 
        ...taskFormData, 
        reward: Number(taskFormData.reward) || 0,
        thumbnail,
        type: 'bonus',
      };
      
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), { ...dataToSave, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'tasks'), { ...dataToSave, createdAt: new Date().toISOString() });
      }
      setIsAddingTask(false);
      setEditingTask(null);
      setSelectedFile(null);
      setTaskFormData({ title: '', description: '', reward: '', platform: 'youtube', category: 'Account Create Bonus', url: '', thumbnail: '', status: 'available' });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error saving free job');
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title || '', 
      description: task.description || '', 
      reward: task.reward || '',
      platform: task.platform || 'youtube', 
      category: task.category || 'Account Create Bonus', 
      url: task.url || '',
      thumbnail: task.thumbnail || '',
      status: task.status || 'available'
    });
    setIsAddingTask(true);
  };

  const handleTaskDelete = async (id: string) => {
    if (!window.confirm('Delete this Free Job permanently?')) return;
    await deleteDoc(doc(db, 'tasks', id));
    fetchData();
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'available' ? 'paused' : 'available';
    await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
    fetchData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="w-full sm:w-auto">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Create Bonus</h1>
          <p className="text-slate-500 text-sm">Manage free jobs that are automatically assigned to users upon account activation.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => {
              setEditingTask(null);
              setTaskFormData({
                title: '', description: '', reward: '', platform: 'youtube', category: 'Account Create Bonus', url: '', thumbnail: '', status: 'available'
              });
              setIsAddingTask(true);
            }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Plus size={20} /> Add Free Job
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <Layout className="w-10 h-10 text-slate-200 animate-pulse mb-2" />
          <p className="text-slate-400 font-medium">Loading free jobs...</p>
        </div>
      )}

      {!loading && isAddingTask ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative">
          <button onClick={() => setIsAddingTask(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold mb-6">{editingTask ? 'Edit Free Job' : 'Publish New Free Job'}</h2>
          <form onSubmit={handleTaskSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Job Title</label>
                <input type="text" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Subscribe to our YouTube channel" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Reward Amount (৳)</label>
                <input type="number" step="any" value={taskFormData.reward} onChange={e => setTaskFormData({...taskFormData, reward: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Instructions / Description</label>
              <textarea value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3}></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Action URL</label>
                <input type="url" value={taskFormData.url} onChange={e => setTaskFormData({...taskFormData, url: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Platform</label>
                <select value={taskFormData.platform} onChange={e => setTaskFormData({...taskFormData, platform: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Thumbnail URL (Optional)</label>
                <input type="url" value={taskFormData.thumbnail} onChange={e => setTaskFormData({...taskFormData, thumbnail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Or Upload Image</label>
                <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 mt-4">
              <Check size={20} /> {editingTask ? 'Save Changes' : 'Publish Free Job'}
            </button>
          </form>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task.id} className={cn("bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden", task.status === 'paused' && "opacity-75")}>
              <div className="absolute top-0 right-0 p-4 flex gap-2">
                <button onClick={() => toggleTaskStatus(task)} className={cn("p-2 rounded-lg transition-colors shadow-sm", task.status === 'available' ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")}>
                   {task.status === 'available' ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button onClick={() => handleTaskEdit(task)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleTaskDelete(task.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4 mt-2">
                {task.thumbnail ? (
                  <img src={task.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <ImageIcon size={20} />
                  </div>
                )}
                <div>
                  <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-md mb-1 uppercase tracking-wider">
                    Free Job
                  </span>
                  <div className="text-xs text-slate-400 font-medium capitalize">{task.platform}</div>
                </div>
              </div>
              
              <h3 className="font-black text-lg text-slate-900 mb-1">{task.title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-4">{task.description}</p>
              
              <div className="w-full bg-slate-50 p-3 rounded-xl flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Reward</span>
                <span className="text-emerald-600 font-black text-lg">৳{task.reward}</span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
               <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <Plus size={32} />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-1">No Free Jobs Yet</h3>
               <p className="text-slate-500">Click the button above to add the first Account Create Bonus job.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
