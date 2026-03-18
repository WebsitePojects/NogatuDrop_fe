import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
      <h1 className="text-8xl font-black text-gray-200 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-6 py-3 bg-[#FF8C00] text-white font-semibold rounded-xl hover:bg-[#E07B00] transition-colors shadow-lg"
      >
        <FiHome />
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
