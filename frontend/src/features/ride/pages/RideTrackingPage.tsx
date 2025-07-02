import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, Star, ShieldCheck, Car, User, Clock } from 'lucide-react';

import LiveMap from '../../../components/LiveMap';
import { GeoPoint, Driver, VehicleType } from '../../../types/yaluride';

// --- Mock Data & Services ---
// In a real app, this data would come from a Redux store, updated by WebSocket events.
const mockInitialDriver: Driver = {
  id: 'driver-001',
  display_name: 'Suresh Perera',
  photo_url: 'https://i.pravatar.cc/150?u=driver001',
  avg_rating_as_driver: 4.9,
  reviews_count_as_driver: 124,
  trust_score: 95,
  vehicle_details: {
    make: 'Toyota',
    model: 'Aqua',
    year: 2018,
    license_plate: 'CBA-1234',
    type: VehicleType.CAR,
  },
  current_location: { lat: 6.88, lng: 79.865 }, // Initial position slightly away from user
  heading: 120, // Pointing towards the user initially
};

const mockUserLocation: GeoPoint = { lat: 6.902, lng: 79.8612 };

// Simulates the route from driver to user
const mockRouteGeoJSON = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [79.865, 6.88], // Driver start
      [79.866, 6.885],
      [79.865, 6.89],
      [79.862, 6.895],
      [79.8612, 6.902], // User end
    ],
  },
  properties: {},
};


const RideTrackingPage: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [driver, setDriver] = useState<Driver | null>(mockInitialDriver);
  const [eta, setEta] = useState(8); // Initial ETA in minutes
  const [rideStatus, setRideStatus] = useState('Driver is on the way');

  // --- Real-time Simulation Effect ---
  useEffect(() => {
    if (!driver) return;

    // This interval simulates receiving WebSocket updates for the driver's location
    const interval = setInterval(() => {
      setDriver(prevDriver => {
        if (!prevDriver || !prevDriver.current_location) return null;
        
        // Simulate driver moving towards user
        const newLat = prevDriver.current_location.lat + 0.0003;
        const newLng = prevDriver.current_location.lng - 0.00005;
        const newHeading = Math.random() * 360;

        return {
          ...prevDriver,
          current_location: { lat: newLat, lng: newLng },
          heading: newHeading,
        };
      });

      setEta(prevEta => (prevEta > 1 ? prevEta - 1 : 1));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [driver]);

  const handleCancelRide = () => {
    // In a real app, dispatch an action to cancel the ride
    // dispatch(cancelRide(rideId));
    toast.error(t('ride.rideCancelled'));
    navigate('/dashboard');
  };

  const handleContactDriver = () => {
    // In a real app, initiate a call or open an in-app chat
    if (driver) {
      toast.success(t('ride.contactingDriver', { driverName: driver.display_name }));
    }
  };

  if (!driver) {
    // Could show a loading state or an error if driver data is missing
    return (
      <div className="flex items-center justify-center h-screen">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <LiveMap
        initialCenter={mockUserLocation}
        userLocation={mockUserLocation}
        drivers={[driver]} // Pass driver in an array
        routeGeoJSON={mockRouteGeoJSON}
      />

      {/* Ride Information & Driver Card */}
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-2xl rounded-t-2xl p-4 sm:p-6"
        >
          {/* Ride Status */}
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t(`rideStatus.${rideStatus}`, rideStatus)}</h2>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={24} className="mr-2" />
              <span>{t('ride.etaMinutes', { count: eta })}</span>
            </p>
          </div>

          {/* Driver Info Card */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center">
              <img
                src={driver.photo_url}
                alt={driver.display_name}
                className="h-16 w-16 rounded-full object-cover mr-4 border-2 border-gray-300 dark:border-gray-600"
              />
              <div className="flex-grow">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{driver.display_name}</p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                  <span className="flex items-center">
                    <Star size={14} className="text-yellow-500 mr-1" /> {driver.avg_rating_as_driver?.toFixed(1)}
                  </span>
                  <span className="flex items-center">
                    <ShieldCheck size={14} className="text-green-500 mr-1" /> {t('common.verified')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800 dark:text-white">{driver.vehicle_details?.make} {driver.vehicle_details?.model}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-md mt-1">
                  {driver.vehicle_details?.license_plate}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={handleContactDriver}
              className="flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Phone size={18} className="mr-2" />
              {t('ride.contactDriver')}
            </button>
            <button
              onClick={handleCancelRide}
              className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <X size={18} className="mr-2" />
              {t('ride.cancelRide')}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default RideTrackingPage;
