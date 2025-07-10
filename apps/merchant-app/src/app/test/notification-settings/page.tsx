"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-provider";

export default function TestNotificationSettingsPage() {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingReminder, setTestingReminder] = useState<"24s" | "2s" | "confirmation" | null>(null);
  
  // Notification settings - same as real settings page
  const [bookingConfirmationEmail, setBookingConfirmationEmail] = useState(true);
  const [bookingConfirmationSms, setBookingConfirmationSms] = useState(false);
  const [appointmentReminder24hEmail, setAppointmentReminder24hEmail] = useState(true);
  const [appointmentReminder24hSms, setAppointmentReminder24hSms] = useState(false);
  const [appointmentReminder2hEmail, setAppointmentReminder2hEmail] = useState(true);
  const [appointmentReminder2hSms, setAppointmentReminder2hSms] = useState(true);
  const [newBookingNotification, setNewBookingNotification] = useState(true);
  const [cancellationNotification, setCancellationNotification] = useState(true);
  
  // Test results
  const [testResults, setTestResults] = useState<{
    [key: string]: { success: boolean; message: string; timestamp: Date };
  }>({});

  // Load settings on mount
  useEffect(() => {
    loadMerchantSettings();
  }, []);

  const loadMerchantSettings = async () => {
    try {
      const response = await apiClient.get("/merchant/settings");
      if (response) {
        // Load notification settings
        setBookingConfirmationEmail(response.bookingConfirmationEmail !== false);
        setBookingConfirmationSms(response.bookingConfirmationSms !== false);
        setAppointmentReminder24hEmail(response.appointmentReminder24hEmail !== false);
        setAppointmentReminder24hSms(response.appointmentReminder24hSms !== false);
        setAppointmentReminder2hEmail(response.appointmentReminder2hEmail !== false);
        setAppointmentReminder2hSms(response.appointmentReminder2hSms !== false);
        setNewBookingNotification(response.newBookingNotification !== false);
        setCancellationNotification(response.cancellationNotification !== false);
      }
    } catch (error) {
      console.error("Failed to load merchant settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.put("/merchant/settings", {
        bookingConfirmationEmail,
        bookingConfirmationSms,
        appointmentReminder24hEmail,
        appointmentReminder24hSms,
        appointmentReminder2hEmail,
        appointmentReminder2hSms,
        newBookingNotification,
        cancellationNotification,
      });
      
      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const testReminder = async (type: "24s" | "2s") => {
    setTestingReminder(type);
    const resultKey = type === "24s" ? "24s_reminder" : "2s_reminder";
    
    try {
      // First, check what settings are enabled
      const settings = {
        "24s": {
          email: appointmentReminder24hEmail,
          sms: appointmentReminder24hSms,
        },
        "2s": {
          email: appointmentReminder2hEmail,
          sms: appointmentReminder2hSms,
        },
      };

      if (!settings[type].email && !settings[type].sms) {
        setTestResults(prev => ({
          ...prev,
          [resultKey]: {
            success: false,
            message: `Both email and SMS are disabled for ${type === "24s" ? "24-hour" : "2-hour"} reminders`,
            timestamp: new Date(),
          },
        }));
        setTestingReminder(null);
        return;
      }

      // Send test reminder
      const response = await apiClient.post("/test/notifications/test-reminder/" + (type === "24s" ? "24h" : "2h"), {
        customerEmail: "lukas.tn90@gmail.com",
        customerName: "Test Customer",
        customerPhone: "+61422627624",
        merchantId: merchant?.id,
      });

      const emailSent = response.results?.email?.success || false;
      const smsSent = response.results?.sms?.success || false;
      
      let message = "";
      if (settings[type].email && settings[type].sms) {
        message = `Email: ${emailSent ? "✓ Sent" : "✗ Failed"}, SMS: ${smsSent ? "✓ Sent" : "✗ Failed"}`;
      } else if (settings[type].email) {
        message = emailSent ? "✓ Email sent successfully" : "✗ Email failed to send";
      } else if (settings[type].sms) {
        message = smsSent ? "✓ SMS sent successfully" : "✗ SMS failed to send";
      }

      setTestResults(prev => ({
        ...prev,
        [resultKey]: {
          success: (settings[type].email ? emailSent : true) && (settings[type].sms ? smsSent : true),
          message,
          timestamp: new Date(),
        },
      }));

      // Schedule a simulated reminder after X seconds
      const timeoutMs = type === "24s" ? 24000 : 2000;
      setTimeout(() => {
        toast({
          title: `⏰ ${type === "24s" ? "24-second" : "2-second"} Reminder Triggered!`,
          description: `This simulates the reminder that would be sent ${type === "24s" ? "24 hours" : "2 hours"} before appointment`,
        });
        
        setTestResults(prev => ({
          ...prev,
          [`${resultKey}_triggered`]: {
            success: true,
            message: `Reminder would have been sent after ${type === "24s" ? "24 seconds" : "2 seconds"}`,
            timestamp: new Date(),
          },
        }));
      }, timeoutMs);

    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [resultKey]: {
          success: false,
          message: error.message || "Failed to send test reminder",
          timestamp: new Date(),
        },
      }));
    } finally {
      setTestingReminder(null);
    }
  };

  const testBookingConfirmation = async () => {
    setTestingReminder("confirmation");
    const resultKey = "booking_confirmation";
    
    try {
      // Check what settings are enabled
      if (!bookingConfirmationEmail && !bookingConfirmationSms) {
        setTestResults(prev => ({
          ...prev,
          [resultKey]: {
            success: false,
            message: "Both email and SMS are disabled for booking confirmations",
            timestamp: new Date(),
          },
        }));
        setTestingReminder(null);
        return;
      }

      // Send test booking confirmation
      const response = await apiClient.post("/test/notifications/send-test", {
        type: "booking_confirmation",
        channel: bookingConfirmationEmail && bookingConfirmationSms ? "both" : 
                bookingConfirmationEmail ? "email" : "sms",
        customerEmail: "lukas.tn90@gmail.com",
        customerName: "Test Customer",
        customerPhone: "+61422627624",
      });

      const emailSent = response.results?.email?.success || false;
      const smsSent = response.results?.sms?.success || false;
      
      let message = "";
      if (bookingConfirmationEmail && bookingConfirmationSms) {
        message = `Email: ${emailSent ? "✓ Sent" : "✗ Failed"}, SMS: ${smsSent ? "✓ Sent" : "✗ Failed"}`;
      } else if (bookingConfirmationEmail) {
        message = emailSent ? "✓ Email sent successfully" : "✗ Email failed to send";
      } else if (bookingConfirmationSms) {
        message = smsSent ? "✓ SMS sent successfully" : "✗ SMS failed to send";
      }

      setTestResults(prev => ({
        ...prev,
        [resultKey]: {
          success: (bookingConfirmationEmail ? emailSent : true) && (bookingConfirmationSms ? smsSent : true),
          message,
          timestamp: new Date(),
        },
      }));

      toast({
        title: "📧 Booking Confirmation Sent!",
        description: "Check email/SMS for the booking confirmation",
      });

    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [resultKey]: {
          success: false,
          message: error.message || "Failed to send booking confirmation",
          timestamp: new Date(),
        },
      }));
    } finally {
      setTestingReminder(null);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Test notification settings with seconds instead of hours for faster validation
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">⚡ Test Mode</CardTitle>
          <CardDescription className="text-amber-800 dark:text-amber-200">
            This page uses the same endpoints as the real settings page but tests with 24 seconds and 2 seconds 
            instead of 24 hours and 2 hours. If the seconds-based timers work, the hours-based ones should too.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings (Same as Real Settings)
          </CardTitle>
          <CardDescription>
            These settings use the exact same API endpoints as the real settings page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation when booking is created
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={bookingConfirmationEmail} 
                    onCheckedChange={setBookingConfirmationEmail} 
                  />
                  <span className="text-sm text-muted-foreground">Email</span>
                  <Switch 
                    checked={bookingConfirmationSms} 
                    onCheckedChange={setBookingConfirmationSms} 
                  />
                  <span className="text-sm text-muted-foreground">SMS</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>24-Second Reminders (Testing 24-Hour)</Label>
                  <p className="text-sm text-muted-foreground">
                    In production: 24 hours before appointment
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={appointmentReminder24hEmail} 
                    onCheckedChange={setAppointmentReminder24hEmail} 
                  />
                  <span className="text-sm text-muted-foreground">Email</span>
                  <Switch 
                    checked={appointmentReminder24hSms} 
                    onCheckedChange={setAppointmentReminder24hSms} 
                  />
                  <span className="text-sm text-muted-foreground">SMS</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>2-Second Reminders (Testing 2-Hour)</Label>
                  <p className="text-sm text-muted-foreground">
                    In production: 2 hours before appointment
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={appointmentReminder2hEmail} 
                    onCheckedChange={setAppointmentReminder2hEmail} 
                  />
                  <span className="text-sm text-muted-foreground">Email</span>
                  <Switch 
                    checked={appointmentReminder2hSms} 
                    onCheckedChange={setAppointmentReminder2hSms} 
                  />
                  <span className="text-sm text-muted-foreground">SMS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Test Reminders
          </CardTitle>
          <CardDescription>
            Click to send test reminders that will trigger after the specified seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Booking Confirmation</h4>
            <Button 
              onClick={testBookingConfirmation} 
              disabled={testingReminder === "confirmation"}
              className="w-full"
              variant="default"
            >
              {testingReminder === "confirmation" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending booking confirmation...
                </>
              ) : (
                "Test Booking Confirmation"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Sends immediate booking confirmation based on enabled settings
            </p>
          </div>

          <div className="my-6 border-t pt-6">
            <h4 className="font-medium mb-3">Appointment Reminders</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Button 
                  onClick={() => testReminder("24s")} 
                  disabled={testingReminder === "24s"}
                  className="w-full"
                  variant="outline"
                >
                  {testingReminder === "24s" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending 24-second reminder...
                    </>
                  ) : (
                    "Test 24-Second Reminder"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Simulates 24-hour reminder
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => testReminder("2s")} 
                  disabled={testingReminder === "2s"}
                  className="w-full"
                  variant="outline"
                >
                  {testingReminder === "2s" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending 2-second reminder...
                    </>
                  ) : (
                    "Test 2-Second Reminder"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Simulates 2-hour reminder
                </p>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-medium">Test Results:</h4>
              <div className="space-y-2">
                {Object.entries(testResults)
                  .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map(([key, result]) => (
                    <div 
                      key={key} 
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted"
                    >
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{result.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">How this test works:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Saves settings to the same merchant settings endpoint</li>
              <li>• Sends immediate test notifications based on enabled settings</li>
              <li>• Shows a toast notification after X seconds to simulate the reminder</li>
              <li>• If seconds-based reminders work, hours-based ones will too</li>
              <li>• Email will be sent to: lukas.tn90@gmail.com</li>
              <li>• SMS uses test number: +15005550006</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Merchant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Testing as: <strong>{merchant?.name || "Zen Wellness"}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Merchant ID: <code className="text-xs">{merchant?.id || "Loading..."}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}