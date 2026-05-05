import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { TasksPage } from './pages/TasksPage';
import { TeamPage } from './pages/TeamPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { ActivationPage } from './pages/ActivationPage';
import { PlanPaymentPage } from './pages/PlanPaymentPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageUsers } from './pages/admin/ManageUsers';
import { ManageTasks } from './pages/admin/ManageTasks';
import { ManageWithdrawals } from './pages/admin/ManageWithdrawals';
import { ManageSubmissions } from './pages/admin/ManageSubmissions';
import { ManageReferral } from './pages/admin/ManageReferral';
import { ManageSettings } from './pages/admin/ManageSettings';
import { ManageActivations } from './pages/admin/ManageActivations';
import { ManagePlanRequests } from './pages/admin/ManagePlanRequests';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from './lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="bg-blue-600 p-4 rounded-2xl"
        >
          <ShieldCheck className="text-white w-10 h-10" />
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const ActiveRoute = ({ children }: { children: React.ReactNode }) => {
  const { userData, loading } = useAuth();
  
  if (loading) return null;
  
  if (userData?.status !== 'active') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

import { AdminLogin } from './pages/admin/AdminLogin';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = sessionStorage.getItem('isAdminLoggedIn') === 'true';

  if (!isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  return <>{children}</>;
};

const SeedData = () => {
  const { currentUser } = useAuth();
  useEffect(() => {
    const seedTasks = async () => {
      if (!currentUser) return;
      try {
        const tasksSnap = await getDocs(collection(db, 'tasks'));
        if (tasksSnap.empty) {
          const initialTasks = [
            {
              title: 'Subscribe YouTube Channel',
              description: 'Visit the link, subscribe to the channel, and take a screenshot of your subscription.',
              reward: 5,
              platform: 'youtube',
              url: 'https://youtube.com',
              status: 'available'
            },
            {
              title: 'Like Facebook Page',
              description: 'Like our official page and submit a screenshot for verification.',
              reward: 3,
              platform: 'facebook',
              url: 'https://facebook.com',
              status: 'available'
            }
          ];

          for (const task of initialTasks) {
            const newDocRef = doc(collection(db, 'tasks'));
            await setDoc(newDocRef, task);
          }
        }
      } catch (e) {
        console.warn('Seeding skipped or failed:', e);
      }
    };
    seedTasks();
  }, [currentUser]);
  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <SeedData />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="activate" element={<ActivationPage />} />
            <Route path="payment" element={<PlanPaymentPage />} />
            <Route path="tasks" element={<ActiveRoute><TasksPage /></ActiveRoute>} />
            <Route path="team" element={<ActiveRoute><TeamPage /></ActiveRoute>} />
            <Route path="withdraw" element={<ActiveRoute><WithdrawPage /></ActiveRoute>} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="tasks" element={<ManageTasks />} />
            <Route path="withdrawals" element={<ManageWithdrawals />} />
            <Route path="activations" element={<ManageActivations />} />
            <Route path="plan-requests" element={<ManagePlanRequests />} />
            <Route path="submissions" element={<ManageSubmissions />} />
            <Route path="referral" element={<ManageReferral />} />
            <Route path="settings" element={<ManageSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
