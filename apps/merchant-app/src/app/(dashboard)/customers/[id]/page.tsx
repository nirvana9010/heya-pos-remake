'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, formatDistanceToNow, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@heya-pos/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@heya-pos/ui';
import { Separator } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Star,
  Gift,
  Crown,
  Edit,
  MoreVertical,
  Copy,
  MessageSquare,
  Download,
  TrendingUp,
  User,
  CreditCard,
  Activity,
  CalendarDays,
  Cake,
  Hash,
  FileText,
  Heart,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { CustomerDetailsDialog } from '@/components/CustomerDetailsDialog';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string;
  dateOfBirth?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  notes?: string;
  tags?: string[];
  marketingConsent?: boolean;
  smsConsent?: boolean;
  preferredContactMethod?: string;
  loyaltyPoints?: number;
  loyaltyVisits?: number;
  totalSpent?: number;
  totalVisits?: number;
  createdAt: string;
  updatedAt: string;
}

interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  staffName: string;
  totalAmount: number;
  status: string;
  paidAmount?: number;
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (params.id) {
      loadCustomerData(params.id as string);
    }
  }, [params.id]);

  const loadCustomerData = async (customerId: string) => {
    try {
      setLoading(true);
      
      // Load customer details
      const customersResponse = await apiClient.getCustomers();
      const customerData = customersResponse.data.find((c: any) => c.id === customerId);
      
      if (!customerData) {
        toast({
          title: 'Error',
          description: 'Customer not found',
          variant: 'destructive',
        });
        router.push('/customers');
        return;
      }
      
      setCustomer(customerData);
      
      // Load customer bookings
      try {
        const allBookings = await apiClient.getBookings({ 
          customerId: customerId,
          limit: 100 
        });
        setBookings(allBookings);
      } catch (error) {
        console.error('Error loading bookings:', error);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const isVIP = (customer.totalSpent || 0) > 1000 || (customer.totalVisits || 0) > 10;
  const memberSince = formatDistanceToNow(parseISO(customer.createdAt), { addSuffix: true });
  
  // Calculate customer metrics
  const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
  const upcomingBookings = bookings.filter(b => {
    const bookingDate = new Date(b.startTime || b.date);
    return bookingDate > new Date() && b.status !== 'CANCELLED';
  });
  
  const averageSpend = customer.totalVisits ? (customer.totalSpent || 0) / customer.totalVisits : 0;
  
  // Get favorite services
  const serviceFrequency = completedBookings.reduce((acc, booking) => {
    acc[booking.serviceName] = (acc[booking.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const favoriteServices = Object.entries(serviceFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/customers')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Customers
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md",
                  isVIP ? "bg-gradient-to-br from-yellow-400 to-yellow-600" : "bg-gradient-to-br from-teal-500 to-teal-700"
                )}>
                  {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    {customer.firstName} {customer.lastName}
                    {isVIP && <Crown className="h-5 w-5 text-yellow-600" />}
                  </h1>
                  <p className="text-sm text-gray-500">Customer #{customer.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/bookings/new?customerId=${customer.id}`)}
                className="shadow-sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                New Booking
              </Button>
              <Button onClick={() => setEditDialogOpen(true)} className="shadow-sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Info */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700">{customer.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={() => copyToClipboard(customer.email, 'Email')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-700">{customer.mobile || customer.phone}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={() => copyToClipboard(customer.mobile || customer.phone, 'Phone')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {customer.address && (
                  <div className="flex items-start gap-3 p-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mt-0.5">
                      <MapPin className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="text-sm text-gray-700">
                      <p>{customer.address}</p>
                      {customer.suburb && customer.postcode && (
                        <p>{customer.suburb}, {customer.postcode}</p>
                      )}
                    </div>
                  </div>
                )}
                {customer.dateOfBirth && (
                  <div className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                      <Cake className="h-4 w-4 text-pink-600" />
                    </div>
                    <span className="text-sm text-gray-700">
                      {format(parseISO(customer.dateOfBirth), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loyalty Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Loyalty Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border border-teal-200">
                    <Star className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-teal-900">{customer.loyaltyPoints || 0}</p>
                    <p className="text-sm text-teal-700 font-medium">Points</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <Gift className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{customer.loyaltyVisits || 0}</p>
                    <p className="text-sm text-green-700 font-medium">Visits</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.notes ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{customer.notes}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No notes added yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity and Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <Badge variant="outline" className="text-xs">Lifetime</Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${(customer.totalSpent || 0).toFixed(0)}</p>
                  <p className="text-sm text-gray-500 font-medium">Total Spent</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>
                    <Badge variant="outline" className="text-xs">All Time</Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{customer.totalVisits || 0}</p>
                  <p className="text-sm text-gray-500 font-medium">Total Visits</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${averageSpend.toFixed(0)}</p>
                  <p className="text-sm text-gray-500 font-medium">Avg. Spend</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
                  <p className="text-sm text-gray-500 font-medium">Upcoming</p>
                </CardContent>
              </Card>
            </div>

            {/* Activity Tabs */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-medium">Customer Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="history">Visit History</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="space-y-6">
                      {/* Member Since */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Member Since</p>
                              <p className="text-sm text-gray-600">
                                {format(parseISO(customer.createdAt), 'MMMM d, yyyy')} ({memberSince})
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Favorite Services */}
                      {favoriteServices.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-medium mb-3 text-gray-700">Favorite Services</h4>
                          <div className="space-y-2">
                            {favoriteServices.map((service, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <span className="text-sm text-gray-700 font-medium">{service.name}</span>
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                                  {service.count} times
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-sm">No services booked yet</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => router.push(`/bookings/new?customerId=${customer.id}`)}
                          >
                            Book First Service
                          </Button>
                        </div>
                      )}
                      
                      {/* Next Appointment */}
                      {upcomingBookings.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <CalendarDays className="h-5 w-5 text-blue-700" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-1 text-blue-900">Next Appointment</h4>
                              <div className="text-sm">
                                <p className="font-medium text-blue-800">{upcomingBookings[0].serviceName}</p>
                                <p className="text-blue-700">{format(parseISO(upcomingBookings[0].startTime || upcomingBookings[0].date), 'EEEE, MMMM d, yyyy')}</p>
                                <p className="text-blue-700">with {upcomingBookings[0].staffName}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-6">
                    {completedBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No visit history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedBookings.slice(0, 10).map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{booking.serviceName}</p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(booking.startTime || booking.date), 'MMM d, yyyy')} • {booking.staffName}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">${booking.totalAmount}</p>
                              <Badge variant="outline" className="text-xs">
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {completedBookings.length > 10 && (
                          <p className="text-center text-sm text-gray-500 pt-2">
                            Showing latest 10 visits of {completedBookings.length} total
                          </p>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="insights" className="mt-6">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Visit Pattern</h4>
                        <p className="text-sm text-gray-600">
                          Typically visits every {customer.totalVisits && customer.totalVisits > 1 
                            ? Math.round(365 / customer.totalVisits) 
                            : 'N/A'} days
                        </p>
                      </div>
                      
                      {isVIP && (
                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Crown className="h-4 w-4 text-yellow-600" />
                            VIP Customer
                          </h4>
                          <p className="text-sm text-gray-600">
                            Top 10% of customers by {customer.totalSpent! > 1000 ? 'spending' : 'visit frequency'}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <CustomerDetailsDialog
        customer={customer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={() => {
          loadCustomerData(customer.id);
          setEditDialogOpen(false);
        }}
      />
    </div>
  );
}