import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLicense } from '@/hooks/useLicense';
import { Key, Users, Calendar, CheckCircle } from 'lucide-react';

export function LicenseInfo() {
  const { license } = useLicense();

  if (!license.isValid) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-green-800 flex items-center">
          <Key className="w-5 h-5 mr-2" />
          License Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">License Tier</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {license.tier}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">Web Login Limit</span>
            </div>
            <div className="text-sm text-green-700">
              {license.currentLogins} / {license.maxWebLogins === 999 ? '∞' : license.maxWebLogins} active sessions
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">Valid Until</span>
            </div>
            <div className="text-sm text-green-700">
              Unlimited
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm font-medium text-green-800">Licensed To</span>
            <div className="text-sm text-green-700">{license.licensedTo}</div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-green-200">
          <div className="text-sm font-medium text-green-800 mb-2">Available Features:</div>
          <div className="flex flex-wrap gap-1">
            {license.features.map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs border-green-300 text-green-700">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}