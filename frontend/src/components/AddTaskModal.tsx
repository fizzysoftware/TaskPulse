import React, { useState, useEffect } from 'react';
import { User, TaskPriority, Recurrence, TaskStatus, TaskDraft } from '../types';
import { expandTaskDescription } from '../services/aiService';
import { Sparkles, X, Loader2, Plus, Trash2, MapPin, Camera, Clock, Calendar, Flag, Repeat } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: any) => void;
  users: User[];
  currentUser: User;
  initialData?: TaskDraft | null;
  isEditing?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd, users, currentUser, initialData, isEditing }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(currentUser.id);
  
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('09:00');

  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  
  const [recurrence, setRecurrence] = useState<Recurrence>(Recurrence.NONE);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [requireLocation, setRequireLocation] = useState(false);
  const [requirePhotoProof, setRequirePhotoProof] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize form with initialData when modal opens
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            if (initialData.priority) setPriority(initialData.priority);
            if (initialData.dueDate) setDueDate(initialData.dueDate);
            if (initialData.dueTime) setDueTime(initialData.dueTime);
            if (initialData.assignedTo) setAssignee(initialData.assignedTo);
            if (initialData.recurrence) setRecurrence(initialData.recurrence);
            if (initialData.recurrenceDays) setRecurrenceDays(initialData.recurrenceDays);
            if (initialData.recurrenceEndDate) setRecurrenceEndDate(initialData.recurrenceEndDate);
            if (initialData.checklist) setChecklist(initialData.checklist);
            if (initialData.requireLocation !== undefined) setRequireLocation(initialData.requireLocation);
            if (initialData.requirePhotoProof !== undefined) setRequirePhotoProof(initialData.requirePhotoProof);
        } else {
            // Reset to defaults if no initial data
            setTitle('');
            setDescription('');
            setAssignee(currentUser.id);
            setDueDate(new Date().toISOString().split('T')[0]);
            setDueTime('09:00');
            setPriority(TaskPriority.MEDIUM);
            setRecurrence(Recurrence.NONE);
            setRecurrenceDays([]);
            setRecurrenceEndDate('');
            setChecklist([]);
            setRequireLocation(false);
            setRequirePhotoProof(false);
        }
    }
  }, [isOpen, initialData, currentUser.id]);

  if (!isOpen) return null;

  const handleMagicExpand = async () => {
    if (!title) return;
    setIsGenerating(true);
    const result = await expandTaskDescription(title);
    setIsGenerating(false);

    if (result) {
        setDescription(result.description);
        setChecklist(prev => [...prev, ...result.checklist]);
    }
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const toggleDay = (dayIndex: number) => {
    setRecurrenceDays(prev => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const finalDueDate = `${dueDate}T${dueTime}`;

      onAdd({
          title,
          description,
          assignedTo: assignee,
          dueDate: finalDueDate,
          priority,
          recurrence,
          recurrenceDays: recurrence === Recurrence.WEEKLY ? recurrenceDays : [],
          recurrenceEndDate: recurrence !== Recurrence.NONE ? recurrenceEndDate : undefined,
          requireLocation,
          requirePhotoProof,
          checklist: checklist.map((text, idx) => ({ id: `cl-${idx}-${Date.now()}`, text, completed: false })),
          createdBy: currentUser.id,
          status: TaskStatus.TODO,
          comments: [],
          createdAt: Date.now()
      });
      onClose();
  };

  const getPriorityColor = (p: TaskPriority) => {
      switch(p) {
          case TaskPriority.LOW: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
          case TaskPriority.MEDIUM: return 'bg-blue-50 text-blue-700 hover:bg-blue-100';
          case TaskPriority.HIGH: return 'bg-orange-50 text-orange-700 hover:bg-orange-100';
          case TaskPriority.URGENT: return 'bg-red-50 text-red-700 hover:bg-red-100';
      }
  };

  const getPriorityActiveColor = (p: TaskPriority) => {
    switch(p) {
        case TaskPriority.LOW: return 'bg-gray-600 text-white shadow-md';
        case TaskPriority.MEDIUM: return 'bg-blue-600 text-white shadow-md';
        case TaskPriority.HIGH: return 'bg-orange-500 text-white shadow-md';
        case TaskPriority.URGENT: return 'bg-red-600 text-white shadow-md';
    }
};

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-slide-up sm:animate-none shadow-xl">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Task' : (initialData ? 'Review & Create Task' : 'New Task')}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={20} className="text-gray-600" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Assign To */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select 
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none bg-white"
                >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </div>

            {/* 2. Task Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Clean the kitchen"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <button 
                        type="button" 
                        onClick={handleMagicExpand}
                        disabled={!title || isGenerating}
                        className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                        title="Auto-generate description"
                    >
                        {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                    </button>
                </div>
            </div>

            {/* 3. Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the task..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            {/* 4. Checklist */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Checklist</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Add step..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(e); }}
                  />
                  <button 
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {checklist.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        {checklist.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm text-gray-700">
                             <span className="truncate flex-1">• {item}</span>
                             <button type="button" onClick={() => handleRemoveChecklistItem(idx)} className="text-gray-400 hover:text-red-500">
                               <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 5. Due Date & Time */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="date" 
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary outline-none text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="time" 
                            required
                            value={dueTime}
                            onChange={(e) => setDueTime(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-primary outline-none text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* 6. Priority */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                    {Object.values(TaskPriority).map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                                priority === p 
                                    ? getPriorityActiveColor(p)
                                    : getPriorityColor(p)
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* 7. Recurrence */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
                <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                    {Object.values(Recurrence).map(r => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRecurrence(r)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                recurrence === r
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {r.toLowerCase().charAt(0).toUpperCase() + r.toLowerCase().slice(1)}
                        </button>
                    ))}
                </div>

                {recurrence === Recurrence.WEEKLY && (
                    <div className="mt-3 animate-fade-in">
                         <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Repeat On</label>
                         <div className="flex justify-between gap-1">
                             {WEEKDAYS.map((day, idx) => {
                                 const isSelected = recurrenceDays.includes(idx);
                                 return (
                                     <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                                            isSelected 
                                            ? 'bg-primary text-white shadow-md scale-105' 
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                     >
                                         {day.charAt(0)}
                                     </button>
                                 )
                             })}
                         </div>
                    </div>
                )}

                {recurrence !== Recurrence.NONE && (
                     <div className="mt-3 animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Repeat (Optional)</label>
                        <input 
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none text-sm"
                        />
                    </div>
                )}
            </div>

            {/* 8. Completion Proof */}
            <div className="pt-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Completion Proof</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setRequireLocation(!requireLocation)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            requireLocation 
                                ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <MapPin size={24} className="mb-2" />
                        <span className="text-xs font-semibold">GPS Location</span>
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setRequirePhotoProof(!requirePhotoProof)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            requirePhotoProof 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Camera size={24} className="mb-2" />
                        <span className="text-xs font-semibold">Photo Proof</span>
                    </button>
                </div>
            </div>

            <div className="sticky bottom-0 bg-white pt-2 pb-1 border-t border-gray-100">
                <button type="submit" className="w-full bg-primary text-white font-semibold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors active:scale-95">
                    {isEditing ? 'Update Task' : 'Create Task'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;