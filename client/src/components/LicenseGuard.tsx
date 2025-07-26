import { ReactNode } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XCircle, Key } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LicenseGuardProps {
  children: ReactNode;
  feature?: string;
}

export function LicenseGuard({ children, feature }: LicenseGuardProps) {
  const { license, validateLicense, isFeatureEnabled, requiresLicense } = useLicense();
  const [licenseKey, setLicenseKey] = useState('');
  const { toast } = useToast();

  // If a specific feature is required, check if it's enabled
  if (feature && !isFeatureEnabled(feature)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="w-5 h-5 mr-2" />
              Feature Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              The "{feature}" feature is not available in your current license.
            </p>
            <p className="text-xs text-gray-500">
              Contact support to upgrade your license: support@wtt.gov.lk
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If license is required but not valid
  if (requiresLicense()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <Key className="w-5 h-5 mr-2" />
              License Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              A valid license key is required to use this application.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="licenseKey">Enter License Key</Label>
              <div className="flex gap-2">
                <Input
                  id="licenseKey"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    if (!licenseKey.trim()) {
                      toast({
                        title: "Error",
                        description: "Please enter a license key",
                        variant: "destructive"
                      });
                      return;
                    }
                    const isValid = await validateLicense(licenseKey.trim());
                    toast({
                      title: isValid ? "License Valid" : "Invalid License",
                      description: isValid 
                        ? "License activated successfully" 
                        : "Please enter a valid license key",
                      variant: isValid ? "default" : "destructive"
                    });
                  }}
                  disabled={!licenseKey.trim()}
                >
                  Validate
                </Button>
              </div>
            </div>
            

            
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500">
                For technical support or to obtain a license key:<br/>
                Email: support@wtt.gov.lk<br/>
                Phone: +94 11 234 5678
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // License is valid, render children
  return <>{children}</>;
}