import React from "react";

function StatCard({ icon: Icon, count, label, colorClass = "text-primary" }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`flex items-center gap-2 ${colorClass}`}>
        <Icon size={22} />
        <span className="text-3xl font-bold">{count}</span>
      </div>

      <div className="border-t border-gray-200" />

      <p className="text-sm font-bold text-gray-700">{label}</p>
    </div>
  );
}

export default StatCard;