import React from 'react';

const SummaryCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6" role="article">
      <div className="flex items-center h-full">
        <div className={`rounded-full p-3 ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
