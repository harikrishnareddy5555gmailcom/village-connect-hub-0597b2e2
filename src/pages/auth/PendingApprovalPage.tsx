import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import varadayapalliLogo from '@/assets/varadayapalli-logo.png';

const PendingApprovalPage: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleBack = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <img src={varadayapalliLogo} alt="Varadayapalli" className="w-20 h-20 mx-auto mb-6 drop-shadow-md" />

        <div className="vcp-card p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning/15 rounded-full flex items-center justify-center">
            <Clock size={32} className="text-warning" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">Pending Approval</h1>
          <p className="text-muted-foreground mb-2">
            Hi <strong>{profile?.full_name ?? 'User'}</strong>! Your account has been created successfully.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            A village admin needs to approve your registration before you can access the platform. You'll be able to log in once approved.
          </p>

          <div className="space-y-3 mb-6">
            {[
              'Registration submitted ✓',
              'Admin review: Pending...',
              'Account activation: Waiting',
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${i === 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                {i === 0 ? <CheckCircle size={16} /> : <Clock size={16} />}
                <span>{step}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            Contact your village admin if you haven't heard back within 24 hours.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleBack}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
