import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { FaFileUpload, FaFilePdf, FaFileImage, FaTrash, FaCheckCircle, FaExclamationCircle, FaHourglassHalf, FaBullhorn, FaMapMarkerAlt, FaUserShield, FaRegClock } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/api/apiClient'; // Assuming a shared API client
import { useAuth } from '../../hooks/useAuth'; // Custom hook to get user info
import { UserRole } from '../../../../libs/common/src/enums/user.enums'; // Assuming shared enums

// --- Type Definitions ---

interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  status: 'active' | 'acknowledged';
}

interface SOSButtonProps {
  currentRideId?: string; // The ID of the current ongoing ride
}

// --- User-Facing Component: SOS Button ---

const SOSButton: React.FC<SOSButtonProps> = ({ currentRideId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const handleSOSClick = () => {
    if (!currentRideId) {
      toast.error(t('sos.error.noActiveRide'));
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirmSOS = async () => {
    if (!user || !currentRideId) return;

    setIsSending(true);
    setIsModalOpen(false);
    const sosToastId = toast.loading(t('sos.toast.sending'));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const payload = {
        userId: user.id,
        rideId: currentRideId,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };

      // In a real app, this would be a call to a dedicated API slice
      await apiClient.post('/emergency-response', payload);

      toast.success(t('sos.toast.success'), { id: sosToastId });
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 10000); // Reset after 10 seconds
    } catch (error: any) {
      let errorMessage = t('sos.error.generic');
      if (error.code === 1) { // Geolocation permission denied
        errorMessage = t('sos.error.locationPermission');
      } else if (error.response) { // API error
        errorMessage = error.response.data.message || errorMessage;
      }
      toast.error(errorMessage, { id: sosToastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSOSClick}
          disabled={isSending || alertSent}
          className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg text-white font-bold transition-all duration-300 ${
            alertSent
              ? 'bg-green-500 cursor-not-allowed'
              : isSending
              ? 'bg-yellow-500 animate-pulse cursor-wait'
              : 'bg-red-600 hover:bg-red-700'
          }`}
          aria-label={t('sos.buttonLabel')}
        >
          {alertSent ? <FaCheckCircle size={24} /> : isSending ? <FaHourglassHalf size={24} /> : <FaBullhorn size={24} />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 text-center max-w-sm w-full"
            >
              <FaExclamationCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('sos.modal.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 my-4">
                {t('sos.modal.message')}
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleConfirmSOS}
                  className="px-6 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  {t('sos.modal.confirmButton')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Admin-Facing Component: Real-time Dashboard ---

const AlertCard: React.FC<{ alert: EmergencyAlert; onResolve: (id: string) => void }> = ({ alert, onResolve }) => {
    const { t } = useTranslation();
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border-l-4 border-red-500"
        >
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-lg text-red-600 dark:text-red-400">{t('adminDashboard.alertTitle')}</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="mt-2 space-y-2 text-sm">
                <p><strong className="text-gray-700 dark:text-gray-300">{t('adminDashboard.user')}:</strong> <span className="text-gray-900 dark:text-white">{alert.userName} ({alert.userId})</span></p>
                <p><strong className="text-gray-700 dark:text-gray-300">{t('adminDashboard.rideId')}:</strong> <span className="text-gray-900 dark:text-white">{alert.rideId}</span></p>
                <p className="flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-gray-500" />
                    <a
                        href={`https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                    >
                        {t('adminDashboard.lastLocation')}: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                    </a>
                </p>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
                <button className="px-3 py-1 text-xs rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">{t('adminDashboard.actions.contactUser')}</button>
                <button
                    onClick={() => onResolve(alert.id)}
                    className="px-3 py-1 text-xs rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                    {t('adminDashboard.actions.resolve')}
                </button>
            </div>
        </motion.div>
    );
};

const AdminEmergencyDashboard: React.FC = () => {
    const { t } = useTranslation();
    const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // In a real app, this would use a proper WebSocket client (e.g., Socket.IO)
        // connecting to the backend's notification service.
        console.log("Admin Dashboard: Initializing mock WebSocket connection...");
        setIsConnected(true);

        const interval = setInterval(() => {
            const newAlert: EmergencyAlert = {
                id: faker.string.uuid(),
                userId: faker.string.uuid(),
                userName: faker.person.fullName(),
                rideId: faker.string.uuid(),
                location: {
                    latitude: 6.9271 + (Math.random() - 0.5) * 0.2,
                    longitude: 79.8612 + (Math.random() - 0.5) * 0.2,
                },
                timestamp: new Date().toISOString(),
                status: 'active',
            };
            toast.error(`New SOS Alert from ${newAlert.userName}!`, { icon: '🚨' });
            setActiveAlerts(prev => [newAlert, ...prev]);
        }, 30000); // Simulate a new alert every 30 seconds for demo purposes

        return () => {
            clearInterval(interval);
            setIsConnected(false);
            console.log("Admin Dashboard: Mock WebSocket connection closed.");
        };
    }, []);

    const handleResolveAlert = (alertId: string) => {
        toast.success(`Alert ${alertId} marked as resolved.`);
        setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
        // In a real app, this would send a message to the backend:
        // socket.emit('resolve_emergency', { alertId });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <FaUserShield className="mr-3 text-red-500"/>
                    {t('adminDashboard.title')}
                </h2>
                <div className="flex items-center space-x-2">
                    <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{isConnected ? t('adminDashboard.connected') : t('adminDashboard.disconnected')}</span>
                </div>
            </div>
            
            <AnimatePresence>
                {activeAlerts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                        <FaCheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">{t('adminDashboard.noAlertsTitle')}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('adminDashboard.noAlertsMessage')}</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {activeAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} onResolve={handleResolveAlert} />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};


// --- Main Component ---

export const EmergencySOSSystem: React.FC = () => {
  // In a real app, useAuth would provide the actual user object
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Example: Get current ride ID from Redux store or context
  const currentRideId = 'ride-ongoing-123';

  if (isAdmin) {
    return <AdminEmergencyDashboard />;
  }
  
  // For passengers and drivers, show the SOS button
  return <SOSButton currentRideId={currentRideId} />;
};
