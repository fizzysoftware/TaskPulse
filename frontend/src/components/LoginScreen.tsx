import React, { useState } from 'react';
import { User, UserStatus, UserRole } from '../types';
import { UserCircle2, ArrowRight, Loader2, Smartphone, ShieldCheck, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  onJoinTeam: (name: string, phone: string, code: string) => Promise<User>;
  companyCode: string;
}

type LoginStep = 'PHONE' | 'OTP' | 'REGISTER' | 'PENDING';

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin, onJoinTeam, companyCode }) => {
  const [step, setStep] = useState<LoginStep>('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [showDevLogin, setShowDevLogin] = useState(true);

  // Filter only active users for dev login, ignoring PENDING ones for clarity unless you want to test PENDING behavior via dev list too (but dev list usually bypasses AUTH).
  // Let's show all for dev convenience, but mark their status.
  const devUsers = users;

  const handleSendOtp = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (phoneNumber.length < 3) {
          setError('Please enter a valid phone number');
          return;
      }
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
          setIsLoading(false);
          const user = users.find(u => u.phoneNumber === phoneNumber);
          setFoundUser(user || null);
          setStep('OTP');
          // Mock OTP alert
          alert(`Your login code is: 123456`);
      }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (otp !== '123456') { 
          setError('Invalid code. Try 123456');
          return;
      }

      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          
          if (foundUser) {
              if (foundUser.status === UserStatus.ACTIVE || foundUser.status === UserStatus.INVITED) {
                  onLogin(foundUser);
              } else if (foundUser.status === UserStatus.PENDING_APPROVAL) {
                  setStep('PENDING');
              }
          } else {
              setStep('REGISTER');
          }
      }, 500);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
          await onJoinTeam(name, phoneNumber, code);
          setStep('PENDING');
      } catch (err: any) {
          setError(err.message || 'Failed to join team');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto relative">
      <div className="mb-6 text-center w-full">
        <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20 rotate-3">
           <UserCircle2 size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">TeamSync</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium">Small Business Task Management</p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 mb-6">
        
        {step === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-in">
                <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Welcome</h2>
                    <p className="text-gray-500 text-xs">Enter your mobile number to sign in or join</p>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Mobile Number</label>
                    <div className="relative">
                        <Smartphone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="tel" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="555-0123"
                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-medium text-base"
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                            Continue <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>
        )}

        {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
                <button type="button" onClick={() => setStep('PHONE')} className="text-xs text-gray-400 font-medium hover:text-gray-600 mb-1">
                    ← Wrong number?
                </button>
                <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-gray-900">Enter Code</h2>
                    <p className="text-gray-500 text-xs">Sent to <span className="font-semibold text-gray-900">{phoneNumber}</span></p>
                </div>
                <div>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none font-medium text-lg tracking-widest"
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                    <p className="text-xs text-gray-400 mt-2 text-center">Use code <span className="font-mono bg-gray-100 px-1 rounded">123456</span></p>
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Verify & Login'}
                </button>
            </form>
        )}

        {step === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <button type="button" onClick={() => setStep('PHONE')} className="text-xs text-gray-400 font-medium hover:text-gray-600 mb-1">
                    ← Back
                </button>
                <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-gray-900">Join Team</h2>
                    <p className="text-gray-500 text-xs">Create your profile to get started</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Company Code</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input 
                            type="text"
                            value={code}
                            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                            placeholder="CODE"
                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-mono tracking-widest uppercase"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Submit Request'}
                </button>
            </form>
        )}

        {step === 'PENDING' && (
            <div className="text-center py-6 animate-fade-in">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} className="text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Request Pending</h2>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    Your request has been sent. An Owner or Manager must approve you before you can access the app.
                </p>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-500 mb-6">
                    Phone: <span className="font-semibold text-gray-900">{phoneNumber}</span>
                </div>
                <button 
                    onClick={() => setStep('PHONE')} 
                    className="text-primary font-semibold text-sm hover:underline"
                >
                    Return to Login
                </button>
            </div>
        )}
      </div>

      {/* Quick Login / Dev Mode Section */}
      <div className="w-full">
         <div 
            onClick={() => setShowDevLogin(!showDevLogin)}
            className="flex items-center justify-center gap-2 cursor-pointer text-gray-400 hover:text-gray-600 mb-3"
         >
            <span className="text-xs font-medium uppercase tracking-wider">Quick Login (Test Users)</span>
            {showDevLogin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
         </div>
         
         {showDevLogin && (
            <div className="grid grid-cols-1 gap-2 animate-fade-in opacity-80">
                {devUsers.map((user) => (
                <button
                    key={user.id}
                    onClick={() => onLogin(user)}
                    className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 hover:border-primary transition-all active:scale-[0.98]"
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${user.role === UserRole.OWNER || user.role === UserRole.MANAGER ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                    {user.initials}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{user.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 uppercase">{user.role}</span>
                        {user.status !== UserStatus.ACTIVE && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 rounded">{user.status}</span>
                        )}
                    </div>
                    </div>
                    <div className="text-gray-300">
                        <ArrowRight size={16} />
                    </div>
                </button>
                ))}
            </div>
         )}
      </div>

      <p className="mt-8 text-[10px] text-center text-gray-400 max-w-xs mx-auto">
         By continuing, you agree to our Terms of Service. Standard message rates may apply for OTP.
      </p>
    </div>
  );
};

export default LoginScreen;