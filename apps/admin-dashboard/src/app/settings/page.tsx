"use client";

import { useState } from "react";
import { Server, Shield, Bell, Database, CreditCard, Mail, Globe } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";

export default function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [twoFactorRequired, setTwoFactorRequired] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const SystemTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>Core platform settings and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable maintenance mode to prevent user access during updates
              </p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>

          {maintenanceMode && (
            <div className="space-y-2 p-4 bg-yellow-50 rounded-lg">
              <Label htmlFor="maintenance-message">Maintenance Message</Label>
              <Textarea
                id="maintenance-message"
                placeholder="System is under maintenance. Please check back later."
                rows={3}
              />
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">API Configuration</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-rate-limit">API Rate Limit (per minute)</Label>
                <Input id="api-rate-limit" type="number" defaultValue="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-timeout">API Timeout (seconds)</Label>
                <Input id="api-timeout" type="number" defaultValue="30" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session Management</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input id="session-timeout" type="number" defaultValue="60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-sessions">Max Concurrent Sessions</Label>
                <Input id="max-sessions" type="number" defaultValue="3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Platform security and authentication configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for all platform administrators
              </p>
            </div>
            <Switch checked={twoFactorRequired} onCheckedChange={setTwoFactorRequired} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Whitelisting</Label>
              <p className="text-sm text-muted-foreground">
                Restrict admin access to specific IP addresses
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Password Policy</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Minimum Password Length</Label>
                <Select defaultValue="12">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Password Expiry (days)</Label>
                <Select defaultValue="90">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Password Requirements</Label>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Require uppercase letters
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Require lowercase letters
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Require numbers
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    Require special characters
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure system notifications and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email alerts for critical system events
              </p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Recipients</h3>
            <div className="space-y-2">
              <Label htmlFor="alert-emails">Email Addresses</Label>
              <Textarea
                id="alert-emails"
                placeholder="admin@heya-pos.com&#10;alerts@heya-pos.com"
                rows={3}
                defaultValue="admin@heya-pos.com\nsupport@heya-pos.com"
              />
              <p className="text-sm text-muted-foreground">
                Enter one email address per line
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Types</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">System Errors</span>
                  <p className="text-sm text-muted-foreground">Critical system failures</p>
                </div>
                <Switch defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">Security Alerts</span>
                  <p className="text-sm text-muted-foreground">Failed login attempts, suspicious activity</p>
                </div>
                <Switch defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">Performance Issues</span>
                  <p className="text-sm text-muted-foreground">High CPU, memory, or response times</p>
                </div>
                <Switch defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-medium">New Merchant Signups</span>
                  <p className="text-sm text-muted-foreground">Notifications for new registrations</p>
                </div>
                <Switch />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DatabaseTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>Database backup and maintenance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic Backups</Label>
              <p className="text-sm text-muted-foreground">
                Enable daily automated database backups
              </p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>

          {autoBackup && (
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Backup Time</Label>
                  <Select defaultValue="02:00">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00:00">12:00 AM</SelectItem>
                      <SelectItem value="02:00">2:00 AM</SelectItem>
                      <SelectItem value="04:00">4:00 AM</SelectItem>
                      <SelectItem value="06:00">6:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Retention Period</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Database Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">8.4 GB</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">1.2M</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">127</p>
                <p className="text-sm text-muted-foreground">Schemas</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">98.5%</p>
                <p className="text-sm text-muted-foreground">Health Score</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">Run Manual Backup</Button>
            <Button variant="outline">Optimize Database</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const BillingTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Configuration
          </CardTitle>
          <CardDescription>Payment processing and subscription settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stripe Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-pk">Publishable Key</Label>
                <Input id="stripe-pk" type="password" defaultValue="pk_live_••••••••••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-sk">Secret Key</Label>
                <Input id="stripe-sk" type="password" defaultValue="sk_live_••••••••••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Webhook Secret</Label>
                <Input id="webhook-secret" type="password" defaultValue="whsec_••••••••••••••••" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Subscription Plans</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Starter Plan</p>
                  <p className="text-sm text-muted-foreground">$99/month - 1 location, 3 staff</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Professional Plan</p>
                  <p className="text-sm text-muted-foreground">$199/month - 2 locations, 10 staff</p>
                </div>
                <Badge>Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enterprise Plan</p>
                  <p className="text-sm text-muted-foreground">$399/month - 5 locations, 50 staff</p>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <SystemTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="database">
          <DatabaseTab />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save All Changes</Button>
      </div>
    </div>
  );
}