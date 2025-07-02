import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, DollarSign, Star, User, ArrowRight } from 'lucide-react';

// --- Type Definition ---
// This should ideally be imported from a shared types file.
export interface TourPackage {
  id: string;
  package_name: string;
  description: string;
  cover_image_url: string;
  duration_days: number;
  price: number;
  currency: 'LKR' | 'USD';
  driver: {
    name: string;
    avg_rating: number;
  };
}

interface JourneyCardProps {
  tour: TourPackage;
  index: number; // For staggered animation delay
}

// --- Animation Variants ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

/**
 * A visually appealing card component to display a tour package in the marketplace.
 * It emphasizes the cover image and provides key details with a clear call-to-action.
 */
const JourneyCard: React.FC<JourneyCardProps> = ({ tour, index }) => {
  const { t } = useTranslation();
  const fallbackImage = 'https://placehold.co/600x400/1a202c/ffffff?text=YALURIDE';

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden h-full transition-all duration-300 group"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden aspect-w-16 aspect-h-9">
        <img
          src={tour.cover_image_url || fallbackImage}
          alt={tour.package_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <div className="flex items-center text-sm">
            <User size={14} className="mr-1.5" />
            <span>{tour.driver.name}</span>
            <Star size={14} className="ml-2 mr-1 text-yellow-400" />
            <span>{tour.driver.avg_rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={tour.package_name}>
          {tour.package_name}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3 flex-grow">
          {tour.description}
        </p>

        {/* Info Row */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center">
            <Clock size={16} className="mr-1.5 text-blue-500" />
            <span>{t('tours.card.duration', { count: tour.duration_days })}</span>
          </div>
          <div className="flex items-center">
            <DollarSign size={16} className="mr-1.5 text-green-500" />
            <span className="font-semibold">{tour.currency} {tour.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Link
            to={`/tours/${tour.id}`}
            className="btn-primary w-full flex items-center justify-center group-hover:bg-blue-700"
          >
            <span>{t('tours.card.viewDetails')}</span>
            <ArrowRight size={16} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default JourneyCard;
