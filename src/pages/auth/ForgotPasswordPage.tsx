import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';
import { toast } from 'sonner';

const ForgotPasswordPage: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    const fakeEmail = `${mobile}@villageconnect.app`;
    const { error } = await supabase.auth.resetPasswordForEmail(fakeEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error('Could not send reset link. Please try again.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={varadayapalliLogo} alt="Varadayapalli" className="w-20 h-20 mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-foreground">వరదయపల్లి</h1>
          <p className="text-base text-muted-foreground font-medium">Varadayapalli</p>
        </div>

        <div className="vcp-card p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-bold text-foreground mb-2">Reset Link Sent</h2>
              <p className="text-muted-foreground text-sm mb-2">
                If an account exists for <span className="font-medium text-foreground">{mobile}</span>, a password reset link has been sent.
              </p>
              <p className="text-muted-foreground text-xs mb-6">
                Check the registered email / notification. Once configured, the link will arrive via your connected mail service.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">Forgot Password?</h2>
                <p className="text-muted-foreground text-sm">
                  Enter your registered mobile number and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                  <div className="relative mt-1.5">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="Enter your 10-digit mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-9"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full btn-primary-gradient" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" />Sending Reset Link...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          📧 Reset emails are sent via the configured mail service in your environment settings.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
