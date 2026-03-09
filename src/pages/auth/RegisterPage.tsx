import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, User, Loader2, MapPin, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';
import { toast } from 'sonner';

const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.mobileNumber.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    const { error } = await signUp({
      fullName: form.fullName,
      mobileNumber: form.mobileNumber,
      email: form.email.trim() || undefined,
      password: form.password,
      gender: form.gender || undefined,
    });
    setLoading(false);
    if (error) {
      if (error.message?.includes('already registered')) {
        toast.error('This mobile number is already registered. Please sign in.');
      } else if (error.message?.includes('email')) {
        toast.error('This email is already in use. Try a different one.');
      } else {
        toast.error(error.message || 'Registration failed. Please try again.');
      }
    } else {
      toast.success('Account created! Pending admin approval.');
      navigate('/pending-approval');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col items-center justify-center p-12 text-white">
        <img src={varadayapalliLogo} alt="Varadayapalli" className="w-28 h-28 mb-6 drop-shadow-xl object-contain" />
        <h1 className="text-4xl font-bold mb-1 text-center">వరదయపల్లి</h1>
        <p className="text-xl text-white/90 text-center font-medium mb-4">Varadayapalli</p>
        <p className="text-lg text-white/80 text-center leading-relaxed mb-8">
          గ్రామమును కలుపు · Connecting Villages
        </p>
        <div className="space-y-3 w-full max-w-sm">
          {['Varadayapalli, Kadapa District', 'Andhra Pradesh, India', 'Population: ~750 villagers'].map((text, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <MapPin size={16} className="text-accent flex-shrink-0" />
              <span className="text-sm text-white/90">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <img src={varadayapalliLogo} alt="Varadayapalli" className="w-16 h-16 mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-bold text-foreground">వరదయపల్లి</h1>
            <p className="text-sm text-muted-foreground">Varadayapalli</p>
          </div>

          <div className="vcp-card p-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
            <p className="text-muted-foreground text-sm mb-6">Register to join your village community</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={set('fullName')}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <Label className="text-sm font-medium">
                  Gender
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex gap-2 mt-1.5">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, gender: p.gender === g ? '' : g }))}
                      disabled={loading}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        form.gender === g
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <UserCircle size={14} />
                      {g}
                    </button>
                  ))}
                </div>
                {form.gender === 'Female' && (
                  <p className="text-xs text-info mt-1.5 bg-info/10 px-3 py-1.5 rounded-lg">
                    🔒 Female members' mobile number & contact details are kept private by default for safety.
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">+91</span>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.mobileNumber}
                    onChange={(e) => setForm(p => ({ ...p, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="pl-12"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Used to sign in to your account</p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional — for password reset)</span>
                </Label>
                <div className="relative mt-1.5">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set('email')}
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium">Password <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={set('password')}
                    className="pl-9 pr-10"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-primary-gradient mt-2"
                disabled={loading || (!!form.confirmPassword && form.password !== form.confirmPassword)}
              >
                {loading
                  ? <><Loader2 size={16} className="mr-2 animate-spin" />Registering...</>
                  : 'Create Account'
                }
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
              </p>
            </div>

            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs text-warning-foreground text-center">
                ⏳ Your account will be reviewed by the admin before activation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
