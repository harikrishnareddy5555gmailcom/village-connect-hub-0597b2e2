import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Loader2, ArrowLeft, CheckCircle2, MessageSquare, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'email' | 'otp';
type OtpStep = 'enter_mobile' | 'enter_otp';

const ForgotPasswordPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('email');

  // ── Email tab state ──────────────────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── OTP tab state ────────────────────────────────────────────────────────────
  const [otpMobile, setOtpMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('enter_mobile');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Email flow ───────────────────────────────────────────────────────────────
  // User enters their registered email (the real one used at signup,
  // OR the mobile-based fallback email if no real email was set).
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email address');
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setEmailLoading(false);
    if (error) {
      toast.error('Could not send reset link. Please try again.');
    } else {
      setEmailSent(true);
    }
  };

  // ── OTP flow — Send ──────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpMobile.length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    const phone = `+91${otpMobile}`;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setOtpLoading(false);
    if (error) {
      // If phone auth not enabled, show helpful message
      if (error.message?.toLowerCase().includes('phone') || error.message?.toLowerCase().includes('sms')) {
        toast.error('SMS provider not configured yet. Use the email link option or contact admin.');
      } else {
        toast.error(error.message || 'Failed to send OTP. Please try again.');
      }
    } else {
      setOtpStep('enter_otp');
      toast.success(`OTP sent to +91 ${otpMobile}`);
      startResendCooldown();
    }
  };

  // ── OTP flow — Verify ────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    const phone = `+91${otpMobile}`;
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setOtpLoading(false);
    if (error) {
      toast.error('Invalid or expired OTP. Please try again.');
    } else {
      setOtpVerified(true);
      toast.success('OTP verified! You can now reset your password.');
      // Session is now active — navigate to reset-password
      setTimeout(() => { window.location.href = '/reset-password'; }, 1500);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${otpMobile}` });
    setOtpLoading(false);
    if (error) {
      toast.error('Failed to resend OTP.');
    } else {
      toast.success('OTP resent!');
      startResendCooldown();
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
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Forgot Password?</h2>
            <p className="text-muted-foreground text-sm">Choose how you'd like to reset your password.</p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setTab('email')}
              className={cn(
                'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                tab === 'email'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Mail size={15} />
              Via Email Link
            </button>
            <button
              onClick={() => setTab('otp')}
              className={cn(
                'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                tab === 'otp'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare size={15} />
              Via Mobile OTP
            </button>
          </div>

          {/* ── Email Tab ── */}
          {tab === 'email' && (
            emailSent ? (
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-bold text-foreground mb-2">Reset Link Sent!</h3>
                <p className="text-muted-foreground text-sm mb-1">
                  A password reset link has been sent to{' '}
                  <span className="font-semibold text-foreground">{emailInput}</span>.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Check your inbox and click the link to set a new password.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setEmailSent(false); setEmailInput(''); }}>
                  Try a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="reset-email" className="text-sm font-medium">Registered Email Address</Label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="your@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="pl-9"
                      required
                      disabled={emailLoading}
                      autoComplete="email"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Enter the email address you used when registering your account.
                  </p>
                </div>
                <Button type="submit" className="w-full btn-primary-gradient" disabled={emailLoading || !emailInput.trim()}>
                  {emailLoading
                    ? <><Loader2 size={16} className="mr-2 animate-spin" />Sending...</>
                    : <><Mail size={16} className="mr-2" />Send Reset Link</>
                  }
                </Button>
              </form>
            )
          )}

          {/* ── OTP Tab ── */}
          {tab === 'otp' && (
            otpVerified ? (
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-bold text-foreground mb-2">OTP Verified!</h3>
                <p className="text-muted-foreground text-sm">Redirecting to set your new password...</p>
              </div>
            ) : otpStep === 'enter_mobile' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <Label htmlFor="otp-mobile" className="text-sm font-medium">Mobile Number</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">+91</span>
                    <Input
                      id="otp-mobile"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={otpMobile}
                      onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-12"
                      required
                      disabled={otpLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    A 6-digit OTP will be sent to this number via SMS.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/60 border border-border">
                  <Phone size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Requires SMS provider.</span> Add your Twilio or MSG91 credentials to the <code className="bg-muted px-1 rounded text-[11px]">.env</code> file to enable SMS OTP delivery.
                  </p>
                </div>

                <Button type="submit" className="w-full btn-primary-gradient" disabled={otpLoading || otpMobile.length < 10}>
                  {otpLoading
                    ? <><Loader2 size={16} className="mr-2 animate-spin" />Sending OTP...</>
                    : <><MessageSquare size={16} className="mr-2" />Send OTP</>
                  }
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 size={18} className="text-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    OTP sent to <span className="font-semibold">+91 {otpMobile}</span>
                  </p>
                </div>

                <div>
                  <Label htmlFor="otp-code" className="text-sm font-medium">Enter 6-digit OTP</Label>
                  <div className="relative mt-1.5">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-9 text-center tracking-[0.5em] text-lg font-semibold"
                      maxLength={6}
                      required
                      disabled={otpLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary-gradient"
                  disabled={otpLoading || otp.length < 6}
                >
                  {otpLoading
                    ? <><Loader2 size={16} className="mr-2 animate-spin" />Verifying...</>
                    : 'Verify OTP & Continue'
                  }
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setOtpStep('enter_mobile'); setOtp(''); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || otpLoading}
                    className={cn(
                      'transition-colors',
                      resendCooldown > 0
                        ? 'text-muted-foreground cursor-not-allowed'
                        : 'text-primary hover:underline cursor-pointer'
                    )}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )
          )}

          {/* Back to login */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
