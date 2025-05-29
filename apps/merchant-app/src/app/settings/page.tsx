"use client";

import { useState } from "react";
import { Building2, Clock, CreditCard, Shield, Bell, Users, Gift, Database } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";

export default function SettingsPage() {
  const [bookingAdvanceHours, setBookingAdvanceHours] = useState("48");
  const [cancellationHours, setCancellationHours] = useState("24");
  const [requirePinForRefunds, setRequirePinForRefunds] = useState(true);
  const [requirePinForCancellations, setRequirePinForCancellations] = useState(true);
  const [loyaltyType, setLoyaltyType] = useState("visit");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const BusinessTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Business Information
        </CardTitle>
        <CardDescription>Manage your business details and location settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input id="business-name" defaultValue="Hamilton Beauty" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abn">ABN</Label>
            <Input id="abn" defaultValue="12 345 678 901" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input id="email" type="email" defaultValue="contact@hamiltonbeauty.com.au" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Business Phone</Label>
            <Input id="phone" defaultValue="+61 2 9876 5432" />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Business Hours</h3>
          <div className="grid gap-3">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
              <div key={day} className="flex items-center justify-between">
                <Label className="w-24">{day}</Label>
                <div className="flex items-center gap-2">
                  <Input type="time" defaultValue="09:00" className="w-32" />
                  <span>to</span>
                  <Input type="time" defaultValue="17:00" className="w-32" />
                  <Switch defaultChecked={day !== "Sunday"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );

  const BookingTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Booking Settings
        </CardTitle>
        <CardDescription>Configure booking rules and policies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="advance-booking">Advance Booking (Hours)</Label>
            <Select value={bookingAdvanceHours} onValueChange={setBookingAdvanceHours}>
              <SelectTrigger id="advance-booking">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How far in advance customers can book
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellation">Cancellation Notice (Hours)</Label>
            <Select value={cancellationHours} onValueChange={setCancellationHours}>
              <SelectTrigger id="cancellation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Minimum notice required for cancellations
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Online Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Customers can book appointments through your website
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-confirm Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically confirm new bookings without manual approval
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Buffer Time Between Appointments</Label>
              <p className="text-sm text-muted-foreground">
                Add automatic buffer time between bookings
              </p>
            </div>
            <Select defaultValue="15">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            PIN Security
          </CardTitle>
          <CardDescription>Configure PIN requirements for sensitive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require PIN for Refunds</Label>
              <p className="text-sm text-muted-foreground">
                Manager PIN required to process refunds
              </p>
            </div>
            <Switch checked={requirePinForRefunds} onCheckedChange={setRequirePinForRefunds} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require PIN for Cancellations</Label>
              <p className="text-sm text-muted-foreground">
                Staff PIN required to cancel bookings
              </p>
            </div>
            <Switch checked={requirePinForCancellations} onCheckedChange={setRequirePinForCancellations} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require PIN for Reports</Label>
              <p className="text-sm text-muted-foreground">
                Manager PIN required to access reports
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-logout Timeout</Label>
              <p className="text-sm text-muted-foreground">
                Automatically logout after inactivity
              </p>
            </div>
            <Select defaultValue="15">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Levels</CardTitle>
          <CardDescription>Define permissions for different staff roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Employee</h4>
                <Badge variant="secondary">Level 1</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Can view their own bookings, process payments, manage customers
              </p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Manager</h4>
                <Badge variant="secondary">Level 2</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                All employee permissions plus: view reports, manage staff schedules, process refunds
              </p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Owner</h4>
                <Badge variant="secondary">Level 3</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Full access to all features including settings, staff management, and financial data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const LoyaltyTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Loyalty Program
        </CardTitle>
        <CardDescription>Configure customer loyalty rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Loyalty Type</Label>
            <Select value={loyaltyType} onValueChange={setLoyaltyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visit">Points per Visit</SelectItem>
                <SelectItem value="spend">Points per Dollar Spent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loyaltyType === "visit" ? (
            <div className="space-y-2">
              <Label htmlFor="points-per-visit">Points per Visit</Label>
              <Input id="points-per-visit" type="number" defaultValue="10" />
              <p className="text-sm text-muted-foreground">
                Points awarded for each completed appointment
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="points-per-dollar">Points per Dollar</Label>
              <Input id="points-per-dollar" type="number" defaultValue="1" step="0.1" />
              <p className="text-sm text-muted-foreground">
                Points awarded for every dollar spent
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="redemption-value">Point Redemption Value</Label>
            <div className="flex items-center gap-2">
              <Input id="redemption-points" type="number" defaultValue="100" className="w-24" />
              <span>points =</span>
              <Input id="redemption-value" type="number" defaultValue="10" className="w-24" />
              <span>dollars</span>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Loyalty Features</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Loyalty Program</Label>
                <p className="text-sm text-muted-foreground">
                  Award points to customers for visits or purchases
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Birthday Rewards</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send birthday rewards to customers
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Referral Rewards</Label>
                <p className="text-sm text-muted-foreground">
                  Award bonus points for customer referrals
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );

  const NotificationsTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>Configure how you and your customers receive notifications</CardDescription>
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
                <Switch defaultChecked />
                <span className="text-sm text-muted-foreground">Email</span>
                <Switch />
                <span className="text-sm text-muted-foreground">SMS</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Appointment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send reminder 24 hours before appointment
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <span className="text-sm text-muted-foreground">Email</span>
                <Switch defaultChecked />
                <span className="text-sm text-muted-foreground">SMS</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Loyalty Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Notify about points earned and rewards
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <span className="text-sm text-muted-foreground">Email</span>
                <Switch />
                <span className="text-sm text-muted-foreground">SMS</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Staff Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when new booking is made
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cancellations</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when booking is cancelled
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Send daily booking summary email
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business preferences and configuration</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <BusinessTab />
        </TabsContent>
        <TabsContent value="booking">
          <BookingTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="loyalty">
          <LoyaltyTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}