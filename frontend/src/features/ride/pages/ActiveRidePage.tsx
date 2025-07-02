import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Phone, MessageSquare, Shield, Info, User, DollarSign, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Placeholder Imports & Mocks ---
// In a real app, these would be imported from their respective files.
import MultiStopItinerary, { RideLeg } from '../components/MultiStopItinerary';
import { RideLegStatus } from '../dto/ride.dto';
import { UserRole, UUID } from '../../../types/yaluride';

// Mock API Hooks
const useUpdateLegStatusMutation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const mutate = async (dto: { rideId: UUID; passengerId: UUID; status: RideLegStatus }) => {
    setIsLoading(true);
    console.log('Updating leg status:', dto);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    // To test error case: if (dto.passengerId === 'passenger-2') throw new Error("Simulated network failure");
    setIsLoading(false);
    return { success: true };
  };
  return [mutate, { isLoading }] as const;
};

// --- Mock Data ---
const MOCK_SHARED_RIDE_DATA = {
  id: 'ride-shared-123',
  driverId: 'driver-abc',
  status: 'ONGOING',
  passengers: [
    { id: 'passenger-1', name: 'Anura Perera', avatarUrl: 'https://i.pravatar.cc/150?u=passenger-1', phone: '+94771112222' },
    { id: 'passenger-2', name: 'Bhavani Kumar', avatarUrl: 'https://i.pravatar.cc/150?u=passenger-2', phone: '+94713334444' },
  ],
  legs: [
    { legId: 'leg-1-pickup', passengerId: 'passenger-1', rideId: 'ride-shared-123', type: 'pickup', status: RideLegStatus.DROPPED_OFF, passengerName: 'Anura Perera', locationAddress: '123 Galle Road, Colombo 3', order: 1 },
    { legId: 'leg-2-pickup', passengerId: 'passenger-2', rideId: 'ride-shared-123', type: 'pickup', status: RideLegStatus.ON_BOARD, passengerName: 'Bhavani Kumar', locationAddress: '25, Independence Avenue, Colombo 7', order: 2 },
    { legId: 'leg-1-dropoff', passengerId: 'passenger-1', rideId: 'ride-shared-123', type: 'dropoff', status: RideLegStatus.DROPPED_OFF, passengerName: 'Anura Perera', locationAddress: 'Kandy City Center, Kandy', order: 3 },
    { legId: 'leg-2-dropoff', passengerId: 'passenger-2', rideId: 'ride-shared-123', type: 'dropoff', status: RideLegStatus.WAITING_FOR_PICKUP, passengerName: 'Bhavani Kumar', locationAddress: 'Peradeniya Botanical Gardens, Kandy', order: 4 },
  ] as RideLeg[],
};

const useGetRideDetailsQuery = (rideId: string | undefined) => {
    const [data, setData] = useState(MOCK_SHARED_RIDE_DATA);
    // Simulate real-time updates
    useEffect(() => {
        if (!rideId) return;
        const interval = setInterval(() => {
            // This is where you'd receive a WebSocket event and update the Redux store
            // For the mock, we just log it. The UI update is handled by the optimistic update for now.
            // console.log("Simulating real-time data check...");
        }, 15000);
        return () => clearInterval(interval);
    }, [rideId]);
    return { data, isLoading: false, isError: false, refetch: () => setData(MOCK_SHARED_RIDE_DATA) };
};

// --- Main Active Ride Page Component ---

const ActiveRidePage: React.FC = () => {
  const { t } = useTranslation();
  const { rideId } = useParams<{ rideId: string }>();
  
  // Local state to manage optimistic updates for legs
  const [rideLegs, setRideLegs] = useState<RideLeg[]>([]);
  const [isLoadingLegId, setIsLoadingLegId] = useState<string | null>(null);

  // API Data Fetching
  const { data: rideData, isLoading, isError, refetch } = useGetRideDetailsQuery(rideId);
  const [updateLegStatus] = useUpdateLegStatusMutation();

  useEffect(() => {
    if (rideData) {
      // Sort legs by order and set initial state
      const sortedLegs = [...rideData.legs].sort((a, b) => a.order - b.order);
      setRideLegs(sortedLegs);
    }
  }, [rideData]);

  const handleUpdateLegStatus = async (rideId: string, passengerId: string, newStatus: RideLegStatus) => {
    const legToUpdate = rideLegs.find(leg => leg.passengerId === passengerId && leg.status !== RideLegStatus.DROPPED_OFF);
    if (!legToUpdate) return;

    setIsLoadingLegId(legToUpdate.legId);
    
    // Optimistic UI Update
    setRideLegs(currentLegs =>
      currentLegs.map(leg =>
        leg.legId === legToUpdate.legId ? { ...leg, status: newStatus } : leg
      )
    );

    try {
      await updateLegStatus({ rideId, passengerId, status: newStatus });
      toast.success(t('sharedRides.itinerary.statusUpdateSuccess', { status: t(`rideLegStatus.${newStatus}`) }));
      // On success, refetch data to ensure consistency with the backend state
      refetch();
    } catch (error: any) {
      toast.error(t('sharedRides.itinerary.statusUpdateFailed', { message: error.message }));
      // Revert optimistic update on failure
      setRideLegs(rideData?.legs || []);
    } finally {
      setIsLoadingLegId(null);
    }
  };

  const currentLeg = useMemo(() => rideLegs.find(leg => leg.status !== RideLegStatus.DROPPED_OFF), [rideLegs]);
  const currentPassenger = useMemo(() => {
      if (!currentLeg || !rideData) return null;
      return rideData.passengers.find(p => p.id === currentLeg.passengerId) || null;
  }, [currentLeg, rideData]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-10 w-10" /></div>;
  }

  if (isError || !rideData) {
    return <div className="p-8 text-center text-red-500">{t('common.error.fetchFailed')}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 dark:bg-gray-900">
      {/* Left Panel: Itinerary and Controls */}
      <div className="w-full lg:w-1/3 xl:w-1/4 p-4 sm:p-6 flex flex-col h-full overflow-y-auto">
        <div className="flex-grow">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('activeRide.title')}</h2>
            
            {/* Current Stop Info */}
            <AnimatePresence>
            {currentLeg && currentPassenger && (
                <motion.div 
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6"
                >
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{t(`sharedRides.itinerary.${currentLeg.type === 'pickup' ? 'nextPickup' : 'nextDropoff'}`)}</p>
                    <div className="flex items-center mt-3">
                        <img src={currentPassenger.avatarUrl} alt={currentPassenger.name} className="h-12 w-12 rounded-full mr-4" />
                        <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">{currentPassenger.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{currentPassenger.phone}</p>
                        </div>
                    </div>
                    <div className="flex justify-between mt-4 space-x-2">
                        <button className="btn-secondary flex-1"><MessageSquare size={16} className="mr-2"/>{t('activeRide.message')}</button>
                        <button className="btn-secondary flex-1"><Phone size={16} className="mr-2"/>{t('activeRide.call')}</button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Itinerary Component */}
            <MultiStopItinerary
                legs={rideLegs}
                onUpdateLegStatus={handleUpdateLegStatus}
                isLoadingLegId={isLoadingLegId}
            />
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="btn-danger w-full flex items-center justify-center">
                <AlertTriangle size={18} className="mr-2" />
                {t('activeRide.emergencySOS')}
            </button>
        </div>
      </div>

      {/* Right Panel: Map */}
      <div className="flex-1 h-1/2 lg:h-full bg-gray-300 dark:bg-gray-700">
        {/* Placeholder for the actual map component */}
        <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
                <Map size={64} />
                <p className="mt-4 font-semibold">{t('activeRide.mapPlaceholder.title')}</p>
                <p className="text-sm mt-1">{t('activeRide.mapPlaceholder.subtitle')}</p>
                {/* In a real implementation, you would render markers here */}
                <div className="text-left mt-4 text-xs p-4 bg-gray-200 dark:bg-gray-600 rounded-lg">
                    <h4 className="font-bold mb-2">Map State:</h4>
                    <p>Driver Position: [Lat, Lng]</p>
                    <p>Route: Plotted</p>
                    <p>Current Leg: {currentLeg ? `${currentLeg.type} ${currentLeg.passengerName}` : 'None'}</p>
                    <p>Waiting Passengers: {rideLegs.filter(l => l.status === RideLegStatus.WAITING_FOR_PICKUP).length}</p>
                </div>
            </div>
        </div>
        {/* <MapComponent
            driverLocation={driverLocation}
            routePolyline={rideData.routePolyline}
            stops={rideLegs}
            currentLegId={currentLeg?.legId}
        /> */}
      </div>
    </div>
  );
};

export default ActiveRidePage;
