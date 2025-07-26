import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';

const HRSettings: React.FC = () => {
  const [groupASettings, setGroupASettings] = useState({
    startTime: '08:30',
    endTime: '16:15',
    durationMinutes: 465,
    lateArrivalPolicy: {
      gracePeriodUntil: '09:00',
      halfDayAfter: '10:00',
      halfDayBefore: '14:45'
    },
    shortLeavePolicy: {
      morningStart: '08:30',
      morningEnd: '10:00',
      eveningStart: '14:45',
      eveningEnd: '16:15',
      maxPerMonth: 2,
      preApprovalRequired: true,
      minimumWorkingHoursRequired: true
    },
    halfDayRule: {
      appliesAfter: '10:00',
      appliesBefore: '14:45',
      shortLeaveExcusesHalfDay: false
    },
    overtimePolicy: {
      normalDay: {
        minHoursForOT: 7.75,
        saturdaySundayFullOT: true
      },
      holiday: {
        allHoursAsOT: true
      }
    }
  });

  const [groupBSettings, setGroupBSettings] = useState({
    startTime: '08:00',
    endTime: '16:45',
    durationMinutes: 525,
    lateArrivalPolicy: {
      gracePeriodUntil: '08:15',
      halfDayAfter: '09:30',
      halfDayBefore: '15:15',
      shortLeaveAllowance: true
    },
    shortLeavePolicy: {
      morningStart: '08:00',
      morningEnd: '09:30',
      eveningStart: '15:15',
      eveningEnd: '16:45',
      maxPerMonth: 2,
      preApprovalRequired: true
    },
    halfDayRule: {
      appliesAfter: '09:30',
      appliesBefore: '15:15'
    },
    overtimePolicy: {
      normalDay: {
        minHoursForOT: 8.75,
        saturdaySundayFullOT: true,
        preApprovalRequired: true
      },
      holiday: {
        allHoursAsOT: true
      }
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("groupA");
  const [attendanceGuidelines, setAttendanceGuidelines] = useState({
    categoryA: {
      startTime: "16:15",
      includeGovernmentHolidays: true,
      includeSaturdays: true,
      excludeHolidays: true,
      excludeDelays: true,
      calculationPerDayOfWeek: true
    },
    categoryB: {
      startTime: "16:45",
      includeGovernmentHolidays: true,
      includeSaturdays: true,
      excludeHolidays: true,
      excludeDelays: true,
      calculationPerDayOfWeek: true
    }
  });

  useEffect(() => {
    // Fetch current settings
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/group-working-hours');
        if (response.ok) {
          const data = await response.json();
          // Ensure lateArrivalPolicy and shortLeavePolicy are included even if not in fetched data
          setGroupASettings({
            ...data.groupA,
            lateArrivalPolicy: {
              gracePeriodUntil: data.groupA.lateArrivalPolicy?.gracePeriodUntil || '09:00',
              halfDayAfter: data.groupA.lateArrivalPolicy?.halfDayAfter || '10:00',
              halfDayBefore: data.groupA.lateArrivalPolicy?.halfDayBefore || '14:45'
            },
            shortLeavePolicy: {
              morningStart: data.groupA.shortLeavePolicy?.morningStart || '08:30',
              morningEnd: data.groupA.shortLeavePolicy?.morningEnd || '10:00',
              eveningStart: data.groupA.shortLeavePolicy?.eveningStart || '14:45',
              eveningEnd: data.groupA.shortLeavePolicy?.eveningEnd || '16:15',
              maxPerMonth: data.groupA.shortLeavePolicy?.maxPerMonth || 2,
              preApprovalRequired: data.groupA.shortLeavePolicy?.preApprovalRequired || true,
              minimumWorkingHoursRequired: data.groupA.shortLeavePolicy?.minimumWorkingHoursRequired || true
            },
            halfDayRule: {
              appliesAfter: data.groupA.halfDayRule?.appliesAfter || '10:00',
              appliesBefore: data.groupA.halfDayRule?.appliesBefore || '14:45',
              shortLeaveExcusesHalfDay: data.groupA.halfDayRule?.shortLeaveExcusesHalfDay || false
            },
            overtimePolicy: {
              normalDay: {
                minHoursForOT: data.groupA.overtimePolicy?.normalDay?.minHoursForOT || 7.75,
                saturdaySundayFullOT: data.groupA.overtimePolicy?.normalDay?.saturdaySundayFullOT || true
              },
              holiday: {
                allHoursAsOT: data.groupA.overtimePolicy?.holiday?.allHoursAsOT || true
              }
            }
          });
          setGroupBSettings({
            ...data.groupB,
            lateArrivalPolicy: {
              gracePeriodUntil: data.groupB.lateArrivalPolicy?.gracePeriodUntil || '08:15',
              halfDayAfter: data.groupB.lateArrivalPolicy?.halfDayAfter || '09:30',
              halfDayBefore: data.groupB.lateArrivalPolicy?.halfDayBefore || '15:15',
              shortLeaveAllowance: data.groupB.lateArrivalPolicy?.shortLeaveAllowance || true
            },
            shortLeavePolicy: {
              morningStart: data.groupB.shortLeavePolicy?.morningStart || '08:00',
              morningEnd: data.groupB.shortLeavePolicy?.morningEnd || '09:30',
              eveningStart: data.groupB.shortLeavePolicy?.eveningStart || '15:15',
              eveningEnd: data.groupB.shortLeavePolicy?.eveningEnd || '16:45',
              maxPerMonth: data.groupB.shortLeavePolicy?.maxPerMonth || 2,
              preApprovalRequired: data.groupB.shortLeavePolicy?.preApprovalRequired || true
            },
            halfDayRule: {
              appliesAfter: data.groupB.halfDayRule?.appliesAfter || '09:30',
              appliesBefore: data.groupB.halfDayRule?.appliesBefore || '15:15'
            },
            overtimePolicy: {
              normalDay: {
                minHoursForOT: data.groupB.overtimePolicy?.normalDay?.minHoursForOT || 8.75,
                saturdaySundayFullOT: data.groupB.overtimePolicy?.normalDay?.saturdaySundayFullOT || true,
                preApprovalRequired: data.groupB.overtimePolicy?.normalDay?.preApprovalRequired || true
              },
              holiday: {
                allHoursAsOT: data.groupB.overtimePolicy?.holiday?.allHoursAsOT || true
              }
            }
          });
        } else {
          setError('Failed to load group working hours settings');
        }
      } catch (error) {
        setError('An error occurred while fetching settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Function to show temporary notification
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleGroupAChange = (field: string, value: string) => {
    setGroupASettings({ ...groupASettings, [field]: value });
  };

  const handleGroupALatePolicyChange = (field: string, value: string) => {
    setGroupASettings({
      ...groupASettings,
      lateArrivalPolicy: { ...groupASettings.lateArrivalPolicy, [field]: value }
    });
  };

  const handleGroupAShortLeavePolicyChange = (field: string, value: string | number | boolean) => {
    setGroupASettings({
      ...groupASettings,
      shortLeavePolicy: { ...groupASettings.shortLeavePolicy, [field]: value }
    });
  };

  const handleGroupAHalfDayRuleChange = (field: string, value: string | boolean) => {
    setGroupASettings({
      ...groupASettings,
      halfDayRule: { ...groupASettings.halfDayRule, [field]: value }
    });
  };

  const handleGroupAOvertimePolicyChange = (category: string, field: string, value: number | boolean) => {
    setGroupASettings({
      ...groupASettings,
      overtimePolicy: {
        ...groupASettings.overtimePolicy,
        [category]: {
          ...groupASettings.overtimePolicy[category],
          [field]: value
        }
      }
    });
  };

  const handleGroupBChange = (field: string, value: string) => {
    setGroupBSettings({ ...groupBSettings, [field]: value });
  };

  const handleGroupBLatePolicyChange = (field: string, value: string) => {
    setGroupBSettings({
      ...groupBSettings,
      lateArrivalPolicy: { ...groupBSettings.lateArrivalPolicy, [field]: value }
    });
  };

  const handleGroupBShortLeavePolicyChange = (field: string, value: string | number | boolean) => {
    setGroupBSettings({
      ...groupBSettings,
      shortLeavePolicy: { ...groupBSettings.shortLeavePolicy, [field]: value }
    });
  };

  const handleGroupBHalfDayRuleChange = (field: string, value: string) => {
    setGroupBSettings({
      ...groupBSettings,
      halfDayRule: { ...groupBSettings.halfDayRule, [field]: value }
    });
  };

  const handleGroupBOvertimePolicyChange = (category: string, field: string, value: number | boolean) => {
    setGroupBSettings({
      ...groupBSettings,
      overtimePolicy: {
        ...groupBSettings.overtimePolicy,
        [category]: {
          ...groupBSettings.overtimePolicy[category],
          [field]: value
        }
      }
    });
  };

  const saveGroupASettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/group-working-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupA: groupASettings }),
      });

      if (response.ok) {
        showNotification('Group A settings saved successfully');
        setError(null);
      } else {
        setError('Failed to save Group A settings');
      }
    } catch (error) {
      setError('An error occurred while saving Group A settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroupBSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/group-working-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupB: groupBSettings }),
      });

      if (response.ok) {
        showNotification('Group B settings saved successfully');
        setError(null);
      } else {
        setError('Failed to save Group B settings');
      }
    } catch (error) {
      setError('An error occurred while saving Group B settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setNotification(null);

    try {
      // Save group settings
      const response = await fetch('/api/group-working-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupA: groupASettings,
          groupB: groupBSettings
        }),
      });

      // Save attendance guidelines
      const guidelinesResponse = await fetch('/api/hr-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_calculation_guidelines: {
            title: "1/4 Offer – Attendance Calculation Guidelines",
            categories: {
              category_a: {
                name: "Category A",
                start_time: attendanceGuidelines.categoryA.startTime,
                include_government_holidays: attendanceGuidelines.categoryA.includeGovernmentHolidays,
                include_saturdays: attendanceGuidelines.categoryA.includeSaturdays,
                exclude_holidays: attendanceGuidelines.categoryA.excludeHolidays,
                exclude_delays: attendanceGuidelines.categoryA.excludeDelays,
                calculation_per_day_of_week: attendanceGuidelines.categoryA.calculationPerDayOfWeek
              },
              category_b: {
                name: "Category B",
                start_time: attendanceGuidelines.categoryB.startTime,
                include_government_holidays: attendanceGuidelines.categoryB.includeGovernmentHolidays,
                include_saturdays: attendanceGuidelines.categoryB.includeSaturdays,
                exclude_holidays: attendanceGuidelines.categoryB.excludeHolidays,
                exclude_delays: attendanceGuidelines.categoryB.excludeDelays,
                calculation_per_day_of_week: attendanceGuidelines.categoryB.calculationPerDayOfWeek
              }
            }
          }
        }),
      });

      if (response.ok && guidelinesResponse.ok) {
        setNotification('Settings saved successfully');
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError('Error saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">HR Settings</h1>
        {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-1 rounded-md">{error}</div>}
      </div>

      <Card className="shadow-md border border-gray-100">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="text-xl text-center">Working Hours Configuration</CardTitle>
          <CardDescription className="text-center">Set up working hours and related policies for employee groups</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="groupA" className="w-full">
            <TabsList className="grid grid-cols-3 w-full border-b border-gray-100 bg-gray-50/50 rounded-t-md rounded-b-none mx-0 px-0">
              <TabsTrigger value="groupA" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:shadow-none" onClick={() => setCurrentTab("groupA")}>Group A</TabsTrigger>
              <TabsTrigger value="groupB" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:shadow-none" onClick={() => setCurrentTab("groupB")}>Group B</TabsTrigger>
              <TabsTrigger value="attendanceGuidelines" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700 data-[state=active]:shadow-none" onClick={() => setCurrentTab("attendanceGuidelines")}>Attendance Guidelines</TabsTrigger>
            </TabsList>
            <TabsContent value="groupA" className="space-y-6 px-6 py-4 mt-0">
              <div className="pt-0 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">1. Working Hours Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define standard working hours for employees</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="font-medium text-gray-700">Start Time</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.startTime}
                        onChange={(e) => handleGroupAChange("startTime", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">End Time</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.endTime}
                        onChange={(e) => handleGroupAChange("endTime", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">2. Late Arrival Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define time thresholds for late arrivals and half-day considerations</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Grace Period Until</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.lateArrivalPolicy.gracePeriodUntil}
                        onChange={(e) => handleGroupALatePolicyChange("gracePeriodUntil", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Half Day After</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.lateArrivalPolicy.halfDayAfter}
                        onChange={(e) => handleGroupALatePolicyChange("halfDayAfter", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Half Day Before</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.lateArrivalPolicy.halfDayBefore}
                        onChange={(e) => handleGroupALatePolicyChange("halfDayBefore", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">3. Short Leave Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Configure rules for short leaves within working hours</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Morning Start</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.shortLeavePolicy.morningStart}
                        onChange={(e) => handleGroupAShortLeavePolicyChange("morningStart", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Morning End</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.shortLeavePolicy.morningEnd}
                        onChange={(e) => handleGroupAShortLeavePolicyChange("morningEnd", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Evening Start</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.shortLeavePolicy.eveningStart}
                        onChange={(e) => handleGroupAShortLeavePolicyChange("eveningStart", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Evening End</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.shortLeavePolicy.eveningEnd}
                        onChange={(e) => handleGroupAShortLeavePolicyChange("eveningEnd", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Max Per Month</Label>
                    <Input
                      type="number"
                      value={groupASettings.shortLeavePolicy.maxPerMonth}
                      onChange={(e) => handleGroupAShortLeavePolicyChange("maxPerMonth", parseInt(e.target.value))}
                      className="w-full border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="groupA-preApproval"
                      checked={groupASettings.shortLeavePolicy.preApprovalRequired}
                      onChange={(e) => handleGroupAShortLeavePolicyChange("preApprovalRequired", e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="groupA-preApproval" className="text-sm font-medium text-gray-700">Pre-Approval Required</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="groupA-minimumHours"
                      checked={groupASettings.shortLeavePolicy.minimumWorkingHoursRequired}
                      onChange={(e) => handleGroupAShortLeavePolicyChange("minimumWorkingHoursRequired", e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="groupA-minimumHours" className="text-sm font-medium text-gray-700">Minimum Working Hours Required</label>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">4. Half Day Rule</h3>
                <p className="text-sm text-gray-500 mb-4">Define rules for half-day attendance</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Applies After</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.halfDayRule.appliesAfter}
                        onChange={(e) => handleGroupAHalfDayRuleChange("appliesAfter", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Applies Before</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupASettings.halfDayRule.appliesBefore}
                        onChange={(e) => handleGroupAHalfDayRuleChange("appliesBefore", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="groupA-shortLeaveExcusesHalfDay"
                      checked={groupASettings.halfDayRule.shortLeaveExcusesHalfDay}
                      onChange={(e) => handleGroupAHalfDayRuleChange("shortLeaveExcusesHalfDay", e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="groupA-shortLeaveExcusesHalfDay" className="text-sm font-medium text-gray-700">Short Leave Excuses Half Day if Attendance Complete</label>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">5. Overtime (OT) Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define rules for overtime calculation</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-700">A. On Normal Working Days</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="font-medium text-gray-700">Minimum Hours for OT</Label>
                        <Input
                          type="number"
                          step="0.25"
                          value={groupASettings.overtimePolicy.normalDay.minHoursForOT}
                          onChange={(e) => handleGroupAOvertimePolicyChange("normalDay", "minHoursForOT", parseFloat(e.target.value))}
                          className="w-full border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="groupA-saturdaySundayFullOT"
                          checked={groupASettings.overtimePolicy.normalDay.saturdaySundayFullOT}
                          onChange={(e) => handleGroupAOvertimePolicyChange("normalDay", "saturdaySundayFullOT", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="groupA-saturdaySundayFullOT" className="text-sm font-medium text-gray-700">Saturday and Sunday Full OT</label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-700">B. On Mercantile or Special Holidays</h4>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="groupA-holidayAllHoursAsOT"
                          checked={groupASettings.overtimePolicy.holiday.allHoursAsOT}
                          onChange={(e) => handleGroupAOvertimePolicyChange("holiday", "allHoursAsOT", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="groupA-holidayAllHoursAsOT" className="text-sm font-medium text-gray-700">All Working Hours Counted as OT</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="groupB" className="space-y-6 px-6 py-4 mt-0">
              <div className="pt-0 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">1. Working Hours Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define standard working hours for employees</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="font-medium text-gray-700">Start Time</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.startTime}
                        onChange={(e) => handleGroupBChange("startTime", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">End Time</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.endTime}
                        onChange={(e) => handleGroupBChange("endTime", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">2. Late Arrival Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define time thresholds for late arrivals and half-day considerations</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Grace Period Until</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.lateArrivalPolicy.gracePeriodUntil}
                        onChange={(e) => handleGroupBLatePolicyChange("gracePeriodUntil", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Half Day After</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.lateArrivalPolicy.halfDayAfter}
                        onChange={(e) => handleGroupBLatePolicyChange("halfDayAfter", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Half Day Before</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.lateArrivalPolicy.halfDayBefore}
                        onChange={(e) => handleGroupBLatePolicyChange("halfDayBefore", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">3. Short Leave Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Configure rules for short leaves within working hours</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Morning Start</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.shortLeavePolicy.morningStart}
                        onChange={(e) => handleGroupBShortLeavePolicyChange("morningStart", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Morning End</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.shortLeavePolicy.morningEnd}
                        onChange={(e) => handleGroupBShortLeavePolicyChange("morningEnd", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Evening Start</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.shortLeavePolicy.eveningStart}
                        onChange={(e) => handleGroupBShortLeavePolicyChange("eveningStart", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Evening End</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.shortLeavePolicy.eveningEnd}
                        onChange={(e) => handleGroupBShortLeavePolicyChange("eveningEnd", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Max Per Month</Label>
                    <Input
                      type="number"
                      value={groupBSettings.shortLeavePolicy.maxPerMonth}
                      onChange={(e) => handleGroupBShortLeavePolicyChange("maxPerMonth", parseInt(e.target.value))}
                      className="w-full border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="groupB-preApproval"
                      checked={groupBSettings.shortLeavePolicy.preApprovalRequired}
                      onChange={(e) => handleGroupBShortLeavePolicyChange("preApprovalRequired", e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="groupB-preApproval" className="text-sm font-medium text-gray-700">Pre-Approval Required</label>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">4. Half Day Rule</h3>
                <p className="text-sm text-gray-500 mb-4">Define rules for half-day attendance</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium text-gray-700">Applies After</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.halfDayRule.appliesAfter}
                        onChange={(e) => handleGroupBHalfDayRuleChange("appliesAfter", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium text-gray-700">Applies Before</Label>
                    <div className="relative mt-1">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <Input
                        type="time"
                        value={groupBSettings.halfDayRule.appliesBefore}
                        onChange={(e) => handleGroupBHalfDayRuleChange("appliesBefore", e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-medium mb-2 text-gray-800">5. Overtime (OT) Policy</h3>
                <p className="text-sm text-gray-500 mb-4">Define rules for overtime calculation</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-700">A. On Normal Working Days</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="font-medium text-gray-700">Minimum Hours for OT</Label>
                        <Input
                          type="number"
                          step="0.25"
                          value={groupBSettings.overtimePolicy.normalDay.minHoursForOT}
                          onChange={(e) => handleGroupBOvertimePolicyChange("normalDay", "minHoursForOT", parseFloat(e.target.value))}
                          className="w-full border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="groupB-saturdaySundayFullOT"
                          checked={groupBSettings.overtimePolicy.normalDay.saturdaySundayFullOT}
                          onChange={(e) => handleGroupBOvertimePolicyChange("normalDay", "saturdaySundayFullOT", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="groupB-saturdaySundayFullOT" className="text-sm font-medium text-gray-700">Saturday and Sunday Full OT</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="groupB-otPreApproval"
                          checked={groupBSettings.overtimePolicy.normalDay.preApprovalRequired}
                          onChange={(e) => handleGroupBOvertimePolicyChange("normalDay", "preApprovalRequired", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="groupB-otPreApproval" className="text-sm font-medium text-gray-700">OT Must be Pre-Approved and Recorded</label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-700">B. On Mercantile or Special Holidays</h4>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="groupB-holidayAllHoursAsOT"
                          checked={groupBSettings.overtimePolicy.holiday.allHoursAsOT}
                          onChange={(e) => handleGroupBOvertimePolicyChange("holiday", "allHoursAsOT", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="groupB-holidayAllHoursAsOT" className="text-sm font-medium text-gray-700">All Working Hours Counted as OT</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="attendanceGuidelines" className="space-y-6 px-6 py-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>1/4 Offer - Attendance Calculation Guidelines</CardTitle>
                  <CardDescription>Configure the attendance calculation rules for different categories.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Category A</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoryAStartTime">Start Time for Calculation</Label>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                              id="categoryAStartTime"
                              type="time"
                              value={attendanceGuidelines.categoryA.startTime}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryA: { ...attendanceGuidelines.categoryA, startTime: e.target.value }
                              })}
                              className="pl-10"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Inclusions</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryAIncludeGovHolidays"
                              checked={attendanceGuidelines.categoryA.includeGovernmentHolidays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryA: { ...attendanceGuidelines.categoryA, includeGovernmentHolidays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryAIncludeGovHolidays" className="cursor-pointer">Include Government Holidays</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryAIncludeSaturdays"
                              checked={attendanceGuidelines.categoryA.includeSaturdays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryA: { ...attendanceGuidelines.categoryA, includeSaturdays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryAIncludeSaturdays" className="cursor-pointer">Include Saturdays</Label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Exclusions</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryAExcludeHolidays"
                              checked={attendanceGuidelines.categoryA.excludeHolidays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryA: { ...attendanceGuidelines.categoryA, excludeHolidays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryAExcludeHolidays" className="cursor-pointer">Exclude Holidays</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryAExcludeDelays"
                              checked={attendanceGuidelines.categoryA.excludeDelays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryA: { ...attendanceGuidelines.categoryA, excludeDelays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryAExcludeDelays" className="cursor-pointer">Exclude Delays</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="categoryACalculationPerDay"
                            checked={attendanceGuidelines.categoryA.calculationPerDayOfWeek}
                            onChange={(e) => setAttendanceGuidelines({
                              ...attendanceGuidelines,
                              categoryA: { ...attendanceGuidelines.categoryA, calculationPerDayOfWeek: e.target.checked }
                            })}
                            disabled={isLoading}
                          />
                          <Label htmlFor="categoryACalculationPerDay" className="cursor-pointer">Calculation per Day of Week</Label>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Category B</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoryBStartTime">Start Time for Calculation</Label>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <Input
                              id="categoryBStartTime"
                              type="time"
                              value={attendanceGuidelines.categoryB.startTime}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryB: { ...attendanceGuidelines.categoryB, startTime: e.target.value }
                              })}
                              className="pl-10"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Inclusions</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryBIncludeGovHolidays"
                              checked={attendanceGuidelines.categoryB.includeGovernmentHolidays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryB: { ...attendanceGuidelines.categoryB, includeGovernmentHolidays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryBIncludeGovHolidays" className="cursor-pointer">Include Government Holidays</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryBIncludeSaturdays"
                              checked={attendanceGuidelines.categoryB.includeSaturdays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryB: { ...attendanceGuidelines.categoryB, includeSaturdays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryBIncludeSaturdays" className="cursor-pointer">Include Saturdays</Label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Exclusions</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryBExcludeHolidays"
                              checked={attendanceGuidelines.categoryB.excludeHolidays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryB: { ...attendanceGuidelines.categoryB, excludeHolidays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryBExcludeHolidays" className="cursor-pointer">Exclude Holidays</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="categoryBExcludeDelays"
                              checked={attendanceGuidelines.categoryB.excludeDelays}
                              onChange={(e) => setAttendanceGuidelines({
                                ...attendanceGuidelines,
                                categoryB: { ...attendanceGuidelines.categoryB, excludeDelays: e.target.checked }
                              })}
                              disabled={isLoading}
                            />
                            <Label htmlFor="categoryBExcludeDelays" className="cursor-pointer">Exclude Delays</Label>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="categoryBCalculationPerDay"
                            checked={attendanceGuidelines.categoryB.calculationPerDayOfWeek}
                            onChange={(e) => setAttendanceGuidelines({
                              ...attendanceGuidelines,
                              categoryB: { ...attendanceGuidelines.categoryB, calculationPerDayOfWeek: e.target.checked }
                            })}
                            disabled={isLoading}
                          />
                          <Label htmlFor="categoryBCalculationPerDay" className="cursor-pointer">Calculation per Day of Week</Label>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveSettings} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Guidelines'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-gray-100 p-4">
          <Button 
            onClick={currentTab === "groupA" ? saveGroupASettings : saveGroupBSettings} 
            disabled={isLoading} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isLoading ? "Saving..." : `Save ${currentTab === "groupA" ? "Group A" : "Group B"} Settings`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default HRSettings;
