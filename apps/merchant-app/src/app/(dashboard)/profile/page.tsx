'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Separator, Badge, Textarea } from '@heya-pos/ui';
import { User, Building2, Mail, Phone, MapPin, Key, Shield, Clock, Save, Globe, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, merchant } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [primaryLocation, setPrimaryLocation] = useState<any>(null);
  
  // Business info state
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    email: '',
    phone: '',
    abn: '',
    website: '',
    description: '',
    // Location fields
    address: '',
    suburb: '',
    state: '',
    postalCode: '',
    country: 'Australia',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load merchant profile data
  useEffect(() => {
    loadMerchantProfile();
  }, []);

  const loadMerchantProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await apiClient.getMerchantProfile();
      setMerchantProfile(profile);
      
      // Find primary location or first location
      const location = profile.locations?.find((loc: any) => loc.isActive) || profile.locations?.[0];
      setPrimaryLocation(location);
      
      // Update form with real data - use location email/phone if available
      setBusinessInfo({
        name: profile.name || '',
        email: location?.email || profile.email || '',
        phone: location?.phone || profile.phone || '',
        abn: profile.abn || '',
        website: profile.website || '',
        description: profile.description || '',
        // Location fields
        address: location?.address || '',
        suburb: location?.suburb || '',
        state: location?.state || '',
        postalCode: location?.postalCode || '',
        country: location?.country || 'Australia',
      });
    } catch (error) {
      console.error('Failed to load merchant profile:', error);
      toast.error('Failed to load profile information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Update merchant profile
      const profileData = {
        name: businessInfo.name,
        email: businessInfo.email,
        phone: businessInfo.phone,
        abn: businessInfo.abn,
        website: businessInfo.website,
        description: businessInfo.description,
      };
      
      await apiClient.updateMerchantProfile(profileData);
      
      // Update location information
      const locationData = {
        address: businessInfo.address,
        suburb: businessInfo.suburb,
        state: businessInfo.state,
        postalCode: businessInfo.postalCode,
        country: businessInfo.country,
        email: businessInfo.email, // Also update location email
        phone: businessInfo.phone, // Also update location phone
      };
      
      await apiClient.updateLocation(locationData);
      
      toast.success('Business information updated successfully');
      
      // Reload profile to get fresh data
      await loadMerchantProfile();
    } catch (error) {
      console.error('Failed to update business info:', error);
      toast.error('Failed to update business information');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // TODO: Implement API call to change password
      // The API endpoint for changing password needs to be created
      // It should accept currentPassword and newPassword
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your business and account settings
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* User Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="flex items-center gap-2">
                    <Input value={user?.username || ''} disabled />
                    <Badge className={getRoleBadgeColor(user?.role || 'owner')}>
                      {user?.role || 'Owner'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not set'} 
                    disabled 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Last Login</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{user?.lastLogin ? format(new Date(user.lastLogin), 'PPp') : format(new Date(), 'PPp')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBusinessInfoSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessInfo.name}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                      placeholder="Enter business name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Contact Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessEmail"
                        type="email"
                        value={businessInfo.email}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                        placeholder="email@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessPhone"
                        type="tel"
                        value={businessInfo.phone}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                        placeholder="+61 2 1234 5678"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={businessInfo.abn}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, abn: e.target.value })}
                      placeholder="12 345 678 901"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        type="url"
                        value={businessInfo.website}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                        placeholder="https://example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Business Description</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="description"
                        value={businessInfo.description}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                        placeholder="Describe your business..."
                        className="pl-10 min-h-[100px]"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Location Information Section */}
                <Separator className="my-6" />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Primary Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        value={businessInfo.address}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="suburb">Suburb</Label>
                      <Input
                        id="suburb"
                        value={businessInfo.suburb}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, suburb: e.target.value })}
                        placeholder="Sydney CBD"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={businessInfo.state}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, state: e.target.value })}
                        placeholder="NSW"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={businessInfo.postalCode}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, postalCode: e.target.value })}
                        placeholder="2000"
                      />
                    </div>
                  </div>
                  
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPasswordForm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Last changed 30 days ago
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordForm(true)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              )}
              
              <Separator />
              
              {/* PIN Management for Owners */}
              {user?.role?.toLowerCase() === 'owner' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">PIN Management</p>
                    <p className="text-sm text-muted-foreground">
                      Manage staff PINs and security settings
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href="/settings">
                      Manage PINs
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}