import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Once auth resolves and user is active, navigate away
  useEffect(() => {
    if (!authLoading && user) {
      if (profile?.status === 'pending') {
        navigate('/pending-approval', { replace: true });
      } else if (profile?.status === 'active') {
        navigate('/feed', { replace: true });
      }
      // For banned/suspended the AuthGuard handles it
    }
  }, [authLoading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(mobile, password);
    setLoading(false);
    if (error) {
      toast.error('Invalid mobile number or password');
    }
    // Navigation handled by the useEffect above once AuthContext resolves
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={villageConnectLogo} alt="Village Connect" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Village Connect</h1>
          <p className="text-muted-foreground mt-1 text-sm">గ్రాముల కోసం ఒక వేదిక</p>
        </div>

        <div className="vcp-card p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome Back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your village community</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
              <div className="relative mt-1.5">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="pl-9"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
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

            <Button type="submit" className="w-full btn-primary-gradient" disabled={loading}>
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Signing In...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
