import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FilterControls = ({ onFilterChange, users, loading }) => {

  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  const handleApplyFilters = () => {
    onFilterChange({
      userId: selectedUser,
      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
      endDate: endDate ? endDate.toISOString().split('T')[0] : null
    });
  };

  const handleResetFilters = () => {
    setSelectedUser('');
    setStartDate(null);
    setEndDate(null);
    onFilterChange({
      userId: '',
      startDate: null,
      endDate: null
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={loading}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user.substring(user.length - 8)} {/* Show last 8 chars of user ID */}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
            placeholderText="Select start date"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amazon-teal"
            placeholderText="Select end date"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div className="flex items-end space-x-2">
          <button
            className="bg-amazon-teal hover:bg-opacity-90 text-white px-4 py-2 rounded-md"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </button>
          <button
            className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-md"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;

