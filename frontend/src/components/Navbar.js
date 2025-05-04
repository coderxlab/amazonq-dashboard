import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="bg-amazon-blue text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <span className="text-amazon-orange font-bold text-xl mr-2">Amazon Q</span>
            <span className="font-semibold text-lg">Dashboard</span>
          </div>
          <div className="flex space-x-6">
            <Link 
              to="/" 
              className={`hover:text-amazon-orange transition-colors ${
                location.pathname === '/' ? 'text-amazon-orange border-b-2 border-amazon-orange' : ''
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/prompt-logs" 
              className={`hover:text-amazon-orange transition-colors ${
                location.pathname === '/prompt-logs' ? 'text-amazon-orange border-b-2 border-amazon-orange' : ''
              }`}
            >
              Prompt Logs
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
