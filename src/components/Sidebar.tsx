import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CreditCard, 
  LogOut, 
  ShieldCheck,
  ClipboardCheck,
  Coins,
  Share2,
  Settings,
  UserCheck,
  Lock,
  MessageCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'My Team Leaders', path: '/team' },
  { icon: Briefcase, label: 'My Job', path: '/tasks' },
  { icon: Coins, label: 'Withdraw', path: '/withdraw' },
  { icon: UserCheck, label: 'Premium Membership', path: '/activate' },
  { icon: MessageCircle, label: 'Support Line', path: '/support' },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Admin Home', path: '/admin/dashboard' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Briefcase, label: 'Tasks', path: '/admin/tasks' },
  { icon: ClipboardCheck, label: 'Submissions', path: '/admin/submissions' },
  { icon: Coins, label: 'Withdrawals', path: '/admin/withdrawals' },
  { 
    icon: UserCheck, 
    label: 'Activations', 
    subItems: [
      { label: 'User Activation', path: '/admin/activations' },
      { label: 'User Plan', path: '/admin/plan-requests' }
    ]
  },
  { icon: Share2, label: 'Referral Settings', path: '/admin/referral' },
  { icon: Settings, label: 'Payment Settings', path: '/admin/settings' },
  { icon: MessageCircle, label: 'Support Settings', path: '/admin/support' },
  { icon: Coins, label: 'Account Create Bonus', path: '/admin/bonus' },
];

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { userData } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});
  const isAdminLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
  const isAdminView = location.pathname.startsWith('/admin');

  const [activePlanName, setActivePlanName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPlan = async () => {
      if (!userData || isAdminView) return;
      try {
        const { getDocs, query, collection, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        const qActivations = query(collection(db, 'activations'), where('userId', '==', userData.uid));
        const qPurchases = query(collection(db, 'plan_purchases'), where('userId', '==', userData.uid));
        const [hSnapA, hSnapP, plansSnap] = await Promise.all([
          getDocs(qActivations),
          getDocs(qPurchases),
          getDocs(collection(db, 'packages'))
        ]);
        
        const history = [
          ...hSnapA.docs.map(d => ({ ...d.data() })),
          ...hSnapP.docs.map(d => ({ ...d.data() }))
        ];
        const plansData = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const activeActivation = history.find(h => {
          if (h.status !== 'approved') return false;
          const plan = plansData.find((p: any) => p.id === h.packageId);
          if (!plan) return false;
          const createdAt = new Date(h.createdAt).getTime();
          const validity = (plan as any).validity * 24 * 60 * 60 * 1000;
          return (createdAt + validity) > Date.now();
        });
        
        if (activeActivation) {
          const plan = plansData.find((p: any) => p.id === activeActivation.packageId);
          if (plan) {
            setActivePlanName((plan as any).name);
          }
        } else if (userData.status === 'active') {
          setActivePlanName('Free Active');
        } else {
          setActivePlanName('Inactive');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPlan();
  }, [userData, isAdminView]);


  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const activeNavItems = (isAdminLoggedIn && isAdminView) 
    ? adminNavItems 
    : userNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 overflow-y-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col min-h-full">
          {/* Header Profile Section (User View) */}
          {!isAdminView && userData && (
            <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-indigo-100 shadow-sm overflow-hidden mb-3">
                <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${userData.uid}`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{userData?.name || 'User'}</h2>
              <p className="text-xs text-slate-400 mt-1 font-black tracking-widest bg-slate-100 px-3 py-1 rounded-full uppercase">User ID: {userData?.shortId || '......'}</p>
              <p className="text-[10px] font-black mt-2 uppercase tracking-widest bg-indigo-100/50 text-indigo-700 px-3 py-1 rounded-full">
                Account Level: <span>{activePlanName || '...'}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Reffer ID: <span className="font-mono text-indigo-600">{userData?.referralCode || 'N/A'}</span>
              </p>

              <div className="w-full mt-4 space-y-1.5 text-left text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">📍</span>
                  <span>From {userData?.country || 'Bangladesh'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">❤️</span>
                  <span>Verification: {userData?.status === 'active' ? 'Verified Member' : 'Unverified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">💼</span>
                  <span>Working with LogeAchi</span>
                </div>
              </div>
              
              <div className="mt-4 w-full bg-white/80 rounded-xl p-3 border border-indigo-100/50 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Account Status</div>
                <div className={cn(
                  "py-1 rounded-full text-xs font-bold",
                  userData?.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                )}>
                  {userData?.status?.toUpperCase() || 'INACTIVE'}
                </div>
              </div>
            </div>
          )}

          {/* Header (Admin View) */}
          {isAdminView && (
            <div className="p-6 flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">LogeAdmin</span>
            </div>
          )}

          {/* Section: App Branding (If user not logged in or admin view) */}
          {!isAdminView && !userData && (
            <div className="p-6 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">LogeAchi</span>
            </div>
          )}

          <nav className="flex-1 px-4 py-6 space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 pb-2">
              Menu Links
            </p>
            {userData?.status !== 'active' && (
              <NavLink
                to="/activation-payment"
                onClick={() => onClose()}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-black transition-all bg-red-600 text-white shadow-lg shadow-red-200 mb-4 hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserCheck size={20} />
                Activate Now
              </NavLink>
            )}
            
            {activeNavItems.map((item) => (
              <div key={item.label}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} />
                        {item.label}
                      </div>
                      <span className={cn("text-slate-400 transition-transform", expandedMenus[item.label] && "rotate-180")}>
                        ▼
                      </span>
                    </button>
                    {expandedMenus[item.label] && (
                      <div className="mt-1 ml-6 space-y-1 border-l border-slate-100 pl-3">
                        {item.subItems.map(subItem => (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => onClose()}
                            className={({ isActive }) => cn(
                              "block px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                              isActive && (isAdminView ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600")
                            )}
                          >
                            {subItem.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path!}
                    onClick={(e) => {
                      if (userData?.status !== 'active' && ['/tasks', '/team', '/withdraw', '/activate'].includes(item.path!)) {
                         e.preventDefault();
                      }
                      onClose();
                    }}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? (isAdminView ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600")
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      userData?.status !== 'active' && ['/tasks', '/team', '/withdraw', '/activate'].includes(item.path!) && "opacity-50"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                    {userData?.status !== 'active' && ['/tasks', '/team', '/withdraw', '/activate'].includes(item.path!) && <Lock size={12} className="ml-auto opacity-50" />}
                  </NavLink>
                )}
              </div>
            ))}

            { (userData?.role === 'admin' || isAdminLoggedIn) && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Switch Context
                </p>
                <NavLink
                  to={isAdminView ? "/" : "/admin"}
                  onClick={() => onClose()}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <ShieldCheck size={20} className={isAdminView ? "text-blue-600" : "text-indigo-600"} />
                  {isAdminView ? "User Dashboard" : "Admin Panel"}
                </NavLink>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={async () => {
                await auth.signOut();
                sessionStorage.removeItem('isAdminLoggedIn');
                onClose();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
