import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GroupPolicies: React.FC = () => {
  const [groupASettings, setGroupASettings] = useState({
    startTime: '08:30',
    endTime: '16:15',
    durationMinutes: 465
  });

  const [groupBSettings, setGroupBSettings] = useState({
    startTime: '08:00',
    endTime: '16:45',
    durationMinutes: 525
  });

  const handleGroupAChange = (field: string, value: string) => {
    setGroupASettings({ ...groupASettings, [field]: value });
  };

  const handleGroupBChange = (field: string, value: string) => {
    setGroupBSettings({ ...groupBSettings, [field]: value });
  };

  const saveGroupASettings = () => {
    // Placeholder for save functionality
    console.log('Saving Group A settings:', groupASettings);
  };

  const saveGroupBSettings = () => {
    // Placeholder for save functionality
    console.log('Saving Group B settings:', groupBSettings);
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Group Working Hours Policies</h1>

      <Card>
        <CardHeader>
          <CardTitle>Group Policies</CardTitle>
          <CardDescription>Configure working hours for each group</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="groupA" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="groupA">Group A</TabsTrigger>
              <TabsTrigger value="groupB">Group B</TabsTrigger>
            </TabsList>
            <TabsContent value="groupA" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="groupAStart">Start Time</Label>
                    <input
                      type="time"
                      id="groupAStart"
                      value={groupASettings.startTime}
                      onChange={(e) => handleGroupAChange('startTime', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupAEnd">End Time</Label>
                    <input
                      type="time"
                      id="groupAEnd"
                      value={groupASettings.endTime}
                      onChange={(e) => handleGroupAChange('endTime', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <Label>Total Required Duration</Label>
                  <div className="text-sm text-gray-500">7.75 hours per day (465 minutes)</div>
                </div>
              </div>
              <Button onClick={saveGroupASettings} className="mt-4">Save Group A Settings</Button>
            </TabsContent>
            <TabsContent value="groupB" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="groupBStart">Start Time</Label>
                    <input
                      type="time"
                      id="groupBStart"
                      value={groupBSettings.startTime}
                      onChange={(e) => handleGroupBChange('startTime', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupBEnd">End Time</Label>
                    <input
                      type="time"
                      id="groupBEnd"
                      value={groupBSettings.endTime}
                      onChange={(e) => handleGroupBChange('endTime', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <Label>Total Required Duration</Label>
                  <div className="text-sm text-gray-500">8.75 hours per day (525 minutes)</div>
                </div>
              </div>
              <Button onClick={saveGroupBSettings} className="mt-4">Save Group B Settings</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupPolicies;
