import React, { useEffect, useState } from 'react';
import { Task, TaskStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { analyzeTeamProductivity } from '../services/geminiService';
import { Lightbulb } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = ['#e5e7eb', '#3b82f6', '#10b981', '#2563eb'];

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const [summary, setSummary] = useState<string>("Analyzing productivity...");

  useEffect(() => {
    const fetchAnalysis = async () => {
        const result = await analyzeTeamProductivity(tasks);
        setSummary(result);
    };
    fetchAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const statusData = [
      { name: 'To Do', value: tasks.filter(t => t.status === TaskStatus.TODO).length },
      { name: 'In Progress', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
      { name: 'Completed', value: tasks.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.VERIFIED).length },
  ];

  // Filter out zero values for cleaner pie chart
  const pieData = statusData.filter(d => d.value > 0);

  const priorityData = [
      { name: 'Low', count: tasks.filter(t => t.priority === 'LOW').length },
      { name: 'Med', count: tasks.filter(t => t.priority === 'MEDIUM').length },
      { name: 'High', count: tasks.filter(t => t.priority === 'HIGH').length },
      { name: 'Urg', count: tasks.filter(t => t.priority === 'URGENT').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-3">
             <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                 <Lightbulb size={24} className="text-yellow-300" />
             </div>
             <div>
                 <h3 className="font-bold text-lg mb-1">AI Insight</h3>
                 <p className="text-sm text-blue-100 leading-relaxed opacity-90">{summary}</p>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length + 1]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                  {pieData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length + 1]}}></div>
                          {entry.name} ({entry.value})
                      </div>
                  ))}
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Workload by Priority</h3>
              <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;