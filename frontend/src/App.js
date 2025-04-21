import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import PromptLogs from './components/PromptLogs';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-amazon-teal text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">Amazon Q Developer Productivity</h1>
              </div>
              <div className="flex space-x-4">
                <Link to="/" className="px-3 py-2 rounded hover:bg-amazon-teal-dark">Dashboard</Link>
                <Link to="/prompt-logs" className="px-3 py-2 rounded hover:bg-amazon-teal-dark">Prompt Logs</Link>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prompt-logs" element={<PromptLogs />} />
          </Routes>
        </div>
        
        <footer className="bg-gray-200 py-4 mt-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>© 2025 Amazon Q Developer Productivity Dashboard</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
