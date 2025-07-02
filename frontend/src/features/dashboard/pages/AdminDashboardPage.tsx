import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  Route,
  Ticket,
  Banknote,
  BarChart3,
  Settings,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  UserPlus,
  CircleDollarSign,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Mock Data & Hooks (Replace with actual RTK Query hooks) ---

// In a real app, this would be imported from a centralized auth hook
const useAuth = () => ({
  user: { role: 'ADMIN' }, // Mocking an admin user
  // user: { role: 'DEVELOPER' }, // Use this to test the forbidden state
  isLoading: false,
});

// Mock RTK Query hook for dashboard stats
const useGetAdminDashboardStatsQuery = () => {
    // Simulate a loading state for 1.5 seconds
    const [isLoading, setIsLoading] = React.useState(true);
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return {
        data: {
            totalUsers: 1250,
            verifiedDrivers: 320,
            ongoingRides: 45,
            monthlyRevenue: 1500000,
        },
        error: null,
        isLoading,
    };
};

// Mock RTK Query hook for recent activity
const useGetRecentActivityQuery = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = React.useState(true);
    React.useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1800);
        return () => clearTimeout(timer);
    }, []);
    
    return {
        data: [
            { id: 1, icon: UserPlus, text: t('dashboard.activity.newUser', { name: 'K. Perera' }), time: '2m ago' },
            { id: 2, icon: UserCheck, text: t('dashboard.activity.driverVerified', { name: 'S. Silva' }), time: '15m ago' },
            { id: 3, icon: CircleDollarSign, text: t('dashboard.activity.highValueRide', { amount: '5,000' }), time: '30m ago' },
            { id: 4, icon: AlertTriangle, text: t('dashboard.activity.disputedRide', { rideId: 'RIDE-789' }), time: '1h ago' },
            { id: 5, icon: Ticket, text: t('dashboard.activity.promoUsed', { code: 'YALU25' }), time: '2h ago' },
        ],
        error: null,
        isLoading,
    }
};


// --- Types ---

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
}

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
}

interface ActivityItemProps {
    icon: React.ElementType;
    text: string;
    time: string;
}

// --- Reusable UI Components ---

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center justify-between border border-gray-200 dark:border-gray-700"
  >
    {isLoading ? (
      <div className="w-full h-20 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ) : (
      <>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </>
    )}
  </motion.div>
);

const ChartPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 min-h-[300px] flex flex-col">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
    <div className="flex-grow flex items-center justify-center">
      <div className="text-center text-gray-400 dark:text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12" />
        <p className="mt-2 text-sm">Chart data will be displayed here.</p>
      </div>
    </div>
  </div>
);

const ActivityItem: React.FC<ActivityItemProps> = ({ icon: Icon, text, time }) => (
    <li className="flex items-center space-x-4 py-3">
      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800 dark:text-gray-200">{text}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500">{time}</span>
    </li>
);


// --- Main Admin Dashboard Page Component ---

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: stats, isLoading: areStatsLoading } = useGetAdminDashboardStatsQuery();
  const { data: activities, isLoading: areActivitiesLoading } = useGetRecentActivityQuery();

  const navItems: NavItem[] = [
    { to: '/admin/dashboard', labelKey: 'dashboard.nav.overview', icon: LayoutDashboard },
    { to: '/admin/users', labelKey: 'dashboard.nav.users', icon: Users },
    { to: '/admin/drivers', labelKey: 'dashboard.nav.drivers', icon: Car },
    { to: '/admin/rides', labelKey: 'dashboard.nav.rides', icon: Route },
    { to: '/admin/promotions', labelKey: 'dashboard.nav.promotions', icon: Ticket },
    { to: '/admin/payments', labelKey: 'dashboard.nav.payments', icon: Banknote },
    { to: '/admin/reports', labelKey: 'dashboard.nav.reports', icon: BarChart3 },
    { to: '/admin/settings', labelKey: 'dashboard.nav.settings', icon: Settings },
  ];

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // This is the route guard logic. In a real app, this would be handled by a wrapper component in your router setup.
  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-center">
        <div>
          <ShieldCheck className="mx-auto h-16 w-16 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-red-600 dark:text-red-400">{t('errors.accessDenied')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{t('errors.adminOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">YALURIDE Admin</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/dashboard'} // `end` prop for exact match on the root dashboard link
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('dashboard.title')}</h2>
            {/* User profile dropdown can go here */}
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Main content for the selected route will be rendered here */}
          {/* For the dashboard overview page: */}
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title={t('dashboard.stats.totalUsers')} value={stats?.totalUsers ?? 0} icon={Users} isLoading={areStatsLoading} />
              <StatCard title={t('dashboard.stats.verifiedDrivers')} value={stats?.verifiedDrivers ?? 0} icon={UserCheck} isLoading={areStatsLoading} />
              <StatCard title={t('dashboard.stats.ongoingRides')} value={stats?.ongoingRides ?? 0} icon={Car} isLoading={areStatsLoading} />
              <StatCard title={t('dashboard.stats.monthlyRevenue')} value={t('currency.lkr', { value: stats?.monthlyRevenue.toLocaleString() ?? '0' })} icon={Banknote} isLoading={areStatsLoading} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartPlaceholder title={t('dashboard.charts.ridesPerDay')} />
              <ChartPlaceholder title={t('dashboard.charts.revenueGrowth')} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('dashboard.activity.title')}</h3>
                {areActivitiesLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {activities?.map(activity => (
                            <ActivityItem key={activity.id} icon={activity.icon} text={activity.text} time={activity.time} />
                        ))}
                    </ul>
                )}
            </div>
          </div>
          
          {/* Outlet for nested admin routes like /admin/users, /admin/drivers etc. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
