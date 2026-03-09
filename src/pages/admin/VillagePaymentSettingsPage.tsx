import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, CreditCard, Upload, Save, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVillage } from '@/contexts/VillageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const VillagePaymentSettingsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { currentVillage, refreshVillage } = useVillage();
  const qc = useQueryClient();

  const isAdmin = role === 'admin' || role === 'super_admin';

  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: village, isLoading } = useQuery({
    queryKey: ['village-payment', currentVillage?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('villages')
        .select('id, upi_id, qr_code_url')
        .eq('id', currentVillage!.id)
        .single();
      if (error) throw error;
      setUpiId((data as any)?.upi_id ?? '');
      return data;
    },
    enabled: !!currentVillage?.id,
  });

  const handleQrSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let qrUrl: string | null = (village as any)?.qr_code_url ?? null;
      if (qrFile) {
        setUploading(true);
        const ext = qrFile.name.split('.').pop();
        const path = `${currentVillage!.id}/payment-qr.${ext}`;
        const { error: upErr } = await supabase.storage.from('village-assets').upload(path, qrFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('village-assets').getPublicUrl(path);
        qrUrl = urlData.publicUrl;
        setUploading(false);
      }
      const { error } = await supabase
        .from('villages')
        .update({ upi_id: upiId.trim() || null, qr_code_url: qrUrl } as any)
        .eq('id', currentVillage!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshVillage();
      qc.invalidateQueries({ queryKey: ['village-payment'] });
      setQrFile(null);
      toast.success('Payment settings saved!');
    },
    onError: (e: Error) => { setUploading(false); toast.error(e.message); },
  });

  if (!isAdmin) return null;

  return (
    <div className="p-4 lg:p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Settings</h1>
          <p className="text-muted-foreground text-sm">Configure UPI ID and QR code for donations</p>
        </div>
      </div>

      <div className="vcp-card p-5 space-y-5">
        {/* UPI ID */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <CreditCard size={14} className="text-primary" />
            UPI ID
          </Label>
          <Input
            placeholder="e.g. village@upi or 9999999999@paytm"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
            className="mt-1.5"
            disabled={!isAdmin}
          />
          <p className="text-xs text-muted-foreground mt-1">Donors can copy this UPI ID to pay directly</p>
        </div>

        {/* QR Code */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <QrCode size={14} className="text-primary" />
            Payment QR Code
          </Label>
          <div className="mt-1.5 space-y-3">
            {(qrPreview || (village as any)?.qr_code_url) && (
              <div className="relative inline-block">
                <img
                  src={qrPreview ?? (village as any)?.qr_code_url}
                  alt="Payment QR Code"
                  className="w-40 h-40 object-contain border border-border rounded-xl bg-white p-2"
                />
                {qrPreview && (
                  <button
                    onClick={() => { setQrFile(null); setQrPreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload size={14} />
              {(qrPreview || (village as any)?.qr_code_url) ? 'Replace QR Code image' : 'Upload QR Code image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleQrSelect} />
            </label>
            <p className="text-xs text-muted-foreground">Upload a clear QR code image so donors can scan and pay easily</p>
          </div>
        </div>

        <Button
          className="btn-primary-gradient"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || uploading}
        >
          {(saveMutation.isPending || uploading)
            ? <><Loader2 size={14} className="animate-spin mr-2" />Saving...</>
            : <><Save size={14} className="mr-2" />Save Payment Settings</>
          }
        </Button>
      </div>
    </div>
  );
};

export default VillagePaymentSettingsPage;
