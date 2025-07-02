import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white py-16 text-center">
        <h1 className="text-4xl font-bold mb-2">YALURIDE</h1>
        <p className="text-lg opacity-80">Your Journey, Your Way</p>
      </header>
      
      <main className="p-6 max-w-4xl mx-auto">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          
          <button className="w-full bg-gray-800 text-white py-4 px-6 rounded-lg mb-3 hover:bg-gray-700 transition-colors">
            Book a Ride
          </button>
          
          <button className="w-full bg-gray-800 text-white py-4 px-6 rounded-lg mb-3 hover:bg-gray-700 transition-colors">
            View Ride History
          </button>
          
          <button className="w-full bg-gray-800 text-white py-4 px-6 rounded-lg mb-3 hover:bg-gray-700 transition-colors">
            Manage Profile
          </button>
        </section>
        
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          <p className="text-gray-600 italic">No recent rides</p>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
