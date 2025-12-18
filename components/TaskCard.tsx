import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import { Calendar, AlertCircle, Camera, CheckCircle2, ChevronDown, ChevronUp, Repeat, MapPin, MessageSquare, Send, BadgeCheck, X, Check, Image as ImageIcon, Sparkles, Navigation, Bell, Copy, Edit3 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  assignee?: User;
  isManagement: boolean;
  users: User[];
  currentUser: User;
  onStatusChange: (taskId: string, status: TaskStatus, photoProof?: string, completionLocation?: {lat: number, lng: number}) => void;
  onAddComment: (taskId: string, text: string, image?: string) => void;
  onToggleChecklist: (taskId: string, itemId: string) => void;
  onClone: (task: Task) => void;
  onRemind: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, assignee, isManagement, users, currentUser, onStatusChange, onAddComment, onToggleChecklist, onClone, onRemind, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [stagedPhoto, setStagedPhoto] = useState<string | undefined>(undefined);
  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<string | undefined>(undefined);
  
  // State for completion flow
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [stagedLocation, setStagedLocation] = useState<{lat: number, lng: number} | undefined>(undefined);

  // Swipe State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const isCreator = currentUser.id === task.createdBy;

  // Determine who to display on the card
  const creator = users.find(u => u.id === task.createdBy);
  // Managers and Owners see who it is assigned to. Employees see who created it.
  const displayedUser = isManagement ? assignee : creator;

  // Auto-collapse when completed
  useEffect(() => {
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.VERIFIED) {
        setExpanded(false);
    }
  }, [task.status]);

  const getPriorityDotColor = (p: TaskPriority) => {
    switch(p) {
        case TaskPriority.URGENT: return 'bg-red-500 shadow-sm';
        case TaskPriority.HIGH: return 'bg-orange-500 shadow-sm';
        case TaskPriority.MEDIUM: return 'bg-yellow-400 shadow-sm';
        default: return 'bg-gray-300';
    }
  };

  const getStatusBadgeStyle = (s: TaskStatus) => {
      switch(s) {
          case TaskStatus.TODO: return 'bg-gray-100 text-gray-600 border-gray-200';
          case TaskStatus.IN_PROGRESS: return 'bg-blue-50 text-blue-700 border-blue-100';
          case TaskStatus.COMPLETED: return 'bg-green-50 text-green-700 border-green-100';
          case TaskStatus.VERIFIED: return 'bg-blue-50 text-blue-700 border-blue-100';
          default: return 'bg-gray-100 text-gray-600 border-gray-100';
      }
  };

  const getDueDateStyles = (dateStr: string, status: TaskStatus) => {
    if (status === TaskStatus.COMPLETED || status === TaskStatus.VERIFIED) {
        return 'text-gray-400';
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const taskDateStr = dateStr.split('T')[0];
    
    if (taskDateStr < todayStr) return 'text-red-500 font-bold';
    if (taskDateStr === todayStr) return 'text-orange-500 font-bold';
    return 'text-gray-400';
  };

  const formatDueDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const isMidnight = dateStr.endsWith('T00:00') || (date.getHours() === 0 && date.getMinutes() === 0);
      
      const day = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return isMidnight ? day : `${day}, ${time}`;
  };

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      if (!isCreator) return;
      touchStartRef.current = e.targetTouches[0].clientX;
      isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isCreator || touchStartRef.current === null) return;
      const currentX = e.targetTouches[0].clientX;
      const diff = currentX - touchStartRef.current;
      
      // Swipe left to reveal buttons (up to 210px for 3 buttons)
      if (diff < 0) {
          const newOffset = Math.max(diff, -210); 
          setSwipeOffset(newOffset);
          if (Math.abs(diff) > 10) isDragging.current = true;
      } else if (swipeOffset < 0) {
           const newOffset = Math.min(0, -210 + diff); 
           setSwipeOffset(newOffset);
           if (Math.abs(diff) > 10) isDragging.current = true;
      }
  };

  const handleTouchEnd = () => {
      if (!isCreator) return;
      const wasDragging = isDragging.current;
      touchStartRef.current = null;
      
      if (swipeOffset < -105) {
          setSwipeOffset(-210); 
      } else {
          setSwipeOffset(0); 
      }

      if (wasDragging) {
          setTimeout(() => {
              isDragging.current = false;
          }, 100);
      }
  };

  const handleCardClick = () => {
      if (isDragging.current) return;
      if (swipeOffset < -10) {
          setSwipeOffset(0);
          return;
      }
      setExpanded(!expanded);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setStagedPhoto(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCommentPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCommentImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePreComplete = () => {
      if (task.requirePhotoProof && !stagedPhoto) {
          alert("This task requires a photo proof to complete. Please tap the camera icon to attach a photo.");
          return;
      }

      if (task.requireLocation) {
          setIsFetchingLocation(true);
          if (!navigator.geolocation) {
              alert("Geolocation is not supported by your browser.");
              setIsFetchingLocation(false);
              return;
          }

          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setStagedLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  });
                  setIsFetchingLocation(false);
                  setShowConfirm(true);
              },
              (error) => {
                  console.error(error);
                  alert("Unable to retrieve location. Please enable GPS/Location services to complete this task.");
                  setIsFetchingLocation(false);
              },
              { enableHighAccuracy: true, timeout: 10000 }
          );
      } else {
          setShowConfirm(true);
      }
  };

  const handleConfirmComplete = () => {
      setShowSuccess(true);
      setTimeout(() => {
        setIsCompleting(true);
        setTimeout(() => {
            onStatusChange(task.id, TaskStatus.COMPLETED, stagedPhoto, stagedLocation);
            setStagedPhoto(undefined);
            setStagedLocation(undefined);
            setShowConfirm(false);
            setShowSuccess(false);
            setIsCompleting(false);
        }, 500); 
      }, 800);
  };

  const handlePostComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() && !commentImage) return;
      onAddComment(task.id, newComment, commentImage);
      setNewComment('');
      setCommentImage(undefined);
  };

  const getCommentUser = (userId: string) => {
      return users.find(u => u.id === userId) || { name: 'Unknown', initials: '??', role: 'EMPLOYEE' } as User;
  };

  const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRecurrenceLabel = () => {
      if (task.recurrence === 'NONE') return null;
      if (task.recurrence === 'WEEKLY' && task.recurrenceDays && task.recurrenceDays.length > 0) {
          const daysMap = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
          const daysStr = task.recurrenceDays.map(d => daysMap[d]).join(', ');
          return `Weekly (${daysStr})`;
      }
      return task.recurrence;
  };

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl">
      {/* Background Actions Layer - Revealed on Swipe */}
      <div className="absolute inset-y-0 right-0 flex w-[210px] z-0">
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 onRemind(task.id);
                 setSwipeOffset(0);
             }}
             className="flex-1 bg-yellow-500 text-white flex flex-col items-center justify-center gap-1 active:bg-yellow-600 transition-colors"
          >
              <Bell size={20} />
              <span className="text-[10px] font-bold">Remind</span>
          </button>
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 onClone(task);
                 setSwipeOffset(0);
             }}
             className="flex-1 bg-blue-400 text-white flex flex-col items-center justify-center gap-1 active:bg-blue-500 transition-colors border-x border-white/10"
          >
              <Copy size={20} />
              <span className="text-[10px] font-bold">Clone</span>
          </button>
          <button 
             onClick={(e) => {
                 e.stopPropagation();
                 onEdit(task);
                 setSwipeOffset(0);
             }}
             className="flex-1 bg-primary text-white flex flex-col items-center justify-center gap-1 active:bg-blue-700 transition-colors"
          >
              <Edit3 size={20} />
              <span className="text-[10px] font-bold">Edit</span>
          </button>
      </div>

      {/* Foreground Card Layer - Swipeable */}
      <div 
         className={`relative z-10 bg-white rounded-xl border shadow-sm transition-transform duration-200 ease-out ${task.status === TaskStatus.COMPLETED ? 'border-green-200 bg-gray-50' : 'border-gray-200'} ${isCompleting ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100'}`}
         style={{ transform: `translateX(${swipeOffset}px)` }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onClick={handleCardClick}
      >
        <div className="p-4">
            {/* Title Row: Priority Dot | Title | Status Badge */}
            <div className="flex justify-between items-start mb-2">
                {/* Priority Dot */}
                <div className={`w-3 h-3 rounded-full mt-1.5 mr-3 shrink-0 ${getPriorityDotColor(task.priority)}`} />

                <h3 className={`font-semibold text-gray-900 leading-snug flex-1 mr-2 ${task.status === TaskStatus.COMPLETED ? 'line-through text-gray-400' : ''}`}>
                    {task.title}
                </h3>
                
                {/* Status Badge */}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wide shrink-0 ${getStatusBadgeStyle(task.status)}`}>
                    {task.status.replace('_', ' ')}
                </span>
            </div>

            {task.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 mb-2">
                    <MapPin size={12} className={task.requireLocation ? 'text-orange-500' : ''} />
                    <span className={`truncate ${task.requireLocation ? 'font-medium text-orange-600' : ''}`}>
                        {task.location}
                        {task.requireLocation && " (GPS)"}
                    </span>
                </div>
            )}
            
            {/* Bottom Row: User + Date (Left), Recurrence + Chevron (Right) */}
            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-xs text-gray-500 overflow-hidden">
                    {displayedUser && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 pr-2 pl-1 py-1 rounded-full shrink-0">
                            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
                                {displayedUser.initials}
                            </span>
                            <span className="max-w-[80px] truncate font-medium text-gray-700">{displayedUser.name}</span>
                        </div>
                    )}
                    
                    <div className={`flex items-center gap-1 shrink-0 ${getDueDateStyles(task.dueDate, task.status)}`}>
                        <Calendar size={12} />
                        <span>{formatDueDate(task.dueDate)}</span>
                    </div>

                    {task.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-400 pl-1 border-l border-gray-200">
                            <MessageSquare size={14} />
                            <span>{task.comments.length}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 pl-2 shrink-0">
                    {task.recurrence !== 'NONE' && (
                        <span className="text-gray-400 flex items-center gap-1 text-[10px] uppercase font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            <Repeat size={10} /> {getRecurrenceLabel()}
                        </span>
                    )}
                    <button className="text-gray-400">
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>
        </div>

        {expanded && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">{task.description}</p>
                
                {task.checklist.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Checklist</p>
                        {task.checklist.map(item => (
                            <div 
                                key={item.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleChecklist(task.id, item.id);
                                }}
                                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer active:opacity-60 transition-opacity"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.completed ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white'}`}>
                                    {item.completed && <Check size={10} />}
                                </div>
                                <span className={item.completed ? 'line-through text-gray-400' : ''}>{item.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                {task.photoProof && (
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Proof of Work</p>
                        <img src={task.photoProof} alt="Proof" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    </div>
                )}

                {task.completionLocation && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                        <Navigation size={14} />
                        <span>Completed at: {task.completionLocation.lat.toFixed(5)}, {task.completionLocation.lng.toFixed(5)}</span>
                    </div>
                )}

                {stagedPhoto && (
                    <div className="mb-4 animate-fade-in">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Ready to Upload
                        </p>
                        <div className="relative">
                                <img src={stagedPhoto} alt="Staged Proof" className="w-full h-32 object-cover rounded-lg border-2 border-green-200" />
                                <button onClick={(e) => { e.stopPropagation(); setStagedPhoto(undefined); }} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm text-gray-500">
                                    <ChevronDown size={16} className="rotate-45" />
                                </button>
                        </div>
                    </div>
                )}
                
                {/* Comments Section */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={14} className="text-gray-400" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase">Updates & Comments</h4>
                    </div>
                    
                    <div className="space-y-4 mb-4">
                        {task.comments.length === 0 && (
                            <p className="text-xs text-gray-400 italic">No updates yet.</p>
                        )}
                        {task.comments.map(comment => {
                            const user = getCommentUser(comment.userId);
                            const isMe = user.id === currentUser.id;
                            return (
                                <div key={comment.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 ${user.role === 'MANAGER' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                                        {user.initials}
                                    </div>
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                        <div className={`px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'} overflow-hidden`}>
                                            {comment.image && (
                                                <img src={comment.image} alt="Attachment" className="w-full max-w-[200px] h-auto rounded-lg mb-2 border border-white/20" />
                                            )}
                                            {comment.text && <p>{comment.text}</p>}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1">
                                            {!isMe && `${user.name} • `}{formatTime(comment.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Comment Input */}
                    <form onSubmit={handlePostComment} onClick={e => e.stopPropagation()}>
                        {commentImage && (
                            <div className="mb-2 relative inline-block">
                                <img src={commentImage} alt="Preview" className="h-20 w-auto rounded-lg border border-gray-200" />
                                <button 
                                    type="button" 
                                    onClick={() => setCommentImage(undefined)}
                                    className="absolute -top-1 -right-1 bg-gray-900 text-white rounded-full p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2 items-center">
                            <label className="p-2 text-gray-400 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                                <ImageIcon size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleCommentPhotoSelect} />
                            </label>
                            <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={commentImage ? "Add a caption..." : "Add a comment..."}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <button 
                                type="submit" 
                                disabled={!newComment.trim() && !commentImage}
                                className="p-2 text-primary hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex flex-wrap justify-end items-center pt-6 gap-3 border-t border-gray-100 mt-4">
                    {(task.status === TaskStatus.TODO || task.status === TaskStatus.IN_PROGRESS) ? (
                        <>
                            {showSuccess ? (
                                <div className="flex items-center gap-2 bg-green-100 border border-green-200 text-green-700 px-6 py-2.5 rounded-xl animate-bounce shadow-sm">
                                    <Sparkles size={18} className="text-green-600" />
                                    <span className="font-bold text-sm">Great Job!</span>
                                </div>
                            ) : !showConfirm ? (
                                <>
                                    <label className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors cursor-pointer ${stagedPhoto ? 'bg-green-100 border-green-300 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'}`} onClick={e => e.stopPropagation()}>
                                        <Camera size={20} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} capture="environment" />
                                    </label>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handlePreComplete(); }}
                                        disabled={isFetchingLocation}
                                        className="bg-primary text-white px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {isFetchingLocation ? <span className="animate-spin">⌛</span> : (
                                            (task.requirePhotoProof && !stagedPhoto) || (task.requireLocation) ? <AlertCircle size={16} className="text-blue-200" /> : null
                                        )}
                                        <span>{isFetchingLocation ? 'Locating...' : 'Complete'}</span>
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 animate-fade-in bg-gray-50 p-1.5 rounded-xl border border-gray-200" onClick={e => e.stopPropagation()}>
                                    <span className="text-xs font-semibold text-gray-600 px-2">Confirm?</span>
                                    <button 
                                        onClick={handleConfirmComplete}
                                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setShowConfirm(false)}
                                        className="bg-white text-gray-500 border border-gray-200 p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : task.status === TaskStatus.COMPLETED && isManagement ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, TaskStatus.VERIFIED); }}
                            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <BadgeCheck size={18} />
                            <span>Verify Completion</span>
                        </button>
                    ) : (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${getStatusBadgeStyle(task.status)}`}>
                            {task.status === TaskStatus.VERIFIED ? <BadgeCheck size={14} /> : <CheckCircle2 size={14} />}
                            {task.status}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;