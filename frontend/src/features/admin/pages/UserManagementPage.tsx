import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Activity,
  Map,
  Settings,
  LogOut,
  Car,
  DollarSign,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { IconType } from 'react-icons';
// import the actual user management table
import UserManagementPage from './UserManagementPage';
// Driver verification queue component
import VerificationQueue from '../components/VerificationQueue';

// --- Type Definitions ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  isLoading: boolean;
  colorClass: string;
}

interface DashboardSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

interface AdminSidebarProps {
  // Add props if needed, e.g., for active link
}

// --- Reusable UI Components ---

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, isLoading, colorClass }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between border-l-4"
      style={{ borderLeftColor: colorClass }}
    >
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</p>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mt-1"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        )}
      </div>
      <div className={`p-3 rounded-full bg-opacity-20 ${colorClass.replace('border-', 'bg-')}`}>
        <Icon className={`h-6 w-6 ${colorClass.replace('border-', 'text-')}`} />
      </div>
    </motion.div>
  );
};

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, children, className = '' }) => (
  <section className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md ${className}`}>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">{title}</h2>
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      {children}
    </div>
  </section>
);

const AdminSidebar: React.FC<AdminSidebarProps> = () => {
    const { t } = useTranslation();
    const navItems = [
        { name: t('admin.nav.dashboard'), icon: LayoutDashboard, href: '#' },
        { name: t('admin.nav.userManagement'), icon: Users, href: '#' },
        { name: t('admin.nav.verificationQueue'), icon: ShieldCheck, href: '#' },
        { name: t('admin.nav.activityFeed'), icon: Activity, href: '#' },
        { name: t('admin.nav.rideMonitoring'), icon: Map, href: '#' },
    ];
    const bottomItems = [
        { name: t('admin.nav.settings'), icon: Settings, href: '#' },
        { name: t('admin.nav.logout'), icon: LogOut, href: '#' },
    ];

    return (
        <aside className="w-64 flex-shrink-0 bg-gray-900 text-white flex flex-col">
            <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
                YALURIDE
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                    </a>
                ))}
            </nav>
            <div className="px-4 py-6 border-t border-gray-700">
                 {bottomItems.map((item) => (
                    <a
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                    </a>
                ))}
            </div>
        </aside>
    );
};

// --- Main Page Component ---

const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  // Mocking data for now, will be replaced with real data from the API
  const stats = {
    totalUsers: 12345,
    activeRides: 67,
    totalRevenue: 567890.12,
    pendingVerifications: 12,
  };
  const error = null;
  const isLoading = false;
  const isFetching = false;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.dashboard.title', 'Admin Dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.dashboard.subtitle', 'Welcome back, Admin!')}
          </p>
        </header>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
              <div className="flex">
                <div className="py-1"><AlertTriangle className="h-6 w-6 text-red-500 mr-4" /></div>
                <div>
                  <p className="font-bold">{t('errors.fetchErrorTitle')}</p>
                  <p className="text-sm">{t('errors.generic')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={t('admin.stats.totalUsers', 'Total Users')}
              value={isLoading ? 0 : stats?.totalUsers.toLocaleString() || 'N/A'}
              icon={Users}
              isLoading={isLoading || isFetching}
              colorClass="border-blue-500 text-blue-500 bg-blue-100"
            />
            <StatCard
              title={t('admin.stats.activeRides', 'Active Rides')}
              value={isLoading ? 0 : stats?.activeRides || 'N/A'}
              icon={Car}
              isLoading={isLoading || isFetching}
              colorClass="border-green-500 text-green-500 bg-green-100"
            />
            <StatCard
              title={t('admin.stats.totalRevenue', 'Total Revenue')}
              value={isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
              icon={DollarSign}
              isLoading={isLoading || isFetching}
              colorClass="border-purple-500 text-purple-500 bg-purple-100"
            />
            <StatCard
              title={t('admin.stats.pendingVerifications', 'Pending Verifications')}
              value={isLoading ? 0 : stats?.pendingVerifications || 'N/A'}
              icon={ShieldCheck}
              isLoading={isLoading || isFetching}
              colorClass="border-yellow-500 text-yellow-500 bg-yellow-100"
            />
          </div>

          {/* Integrated User Management Table */}
          <DashboardSection title={t('admin.userManagement.title')}><UserManagementPage /></DashboardSection>
          <DashboardSection title={t('admin.verificationQueue.title', 'Verification Queue')} className="mt-6">
            {/* Render the live verification queue */}
            <VerificationQueue />
          </DashboardSection>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DashboardSection title={t('admin.activityFeed.title', 'Real-Time Activity Feed')} className="lg:col-span-1">
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t('common.comingSoon', 'Live activity feed will be displayed here.')}
              </p>
            </DashboardSection>
            
            <DashboardSection title={t('admin.rideMonitoring.title', 'Live Ride Monitoring Map')} className="lg:col-span-2">
               <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t('common.comingSoon', 'A real-time map of active rides will be displayed here.')}
              </p>
            </DashboardSection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
