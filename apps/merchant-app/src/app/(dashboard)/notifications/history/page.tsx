'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { api } from '@/lib/api-wrapper';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@heya-pos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@heya-pos/ui';
import { Switch } from '@heya-pos/ui';
import { Loader2 } from 'lucide-react';

interface NotificationLog {
  id: string;
  merchantId: string;
  customerId: string;
  bookingId?: string | null;
  type: string;
  channel: 'email' | 'sms';
  recipient: string;
  status: 'sent' | 'failed';
  messageId?: string | null;
  error?: string | null;
  sentAt: string;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

export default function NotificationHistoryPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms'>(
    'all',
  );
  const [loyaltyOnly, setLoyaltyOnly] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [channelFilter, loyaltyOnly]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (channelFilter !== 'all') {
        params.set('channel', channelFilter);
      }

      const data = await api.get(`/notifications/history?${params.toString()}`);

      const filtered = (Array.isArray(data) ? data : []).filter(
        (entry: NotificationLog) =>
          loyaltyOnly ? entry.type?.includes('loyalty_touchpoint') : true,
      );

      setLogs(filtered);
    } catch (error) {
      console.error('Failed to load notification history:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    const isSuccess = status === 'sent';
    return (
      <Badge variant={isSuccess ? 'default' : 'destructive'}>
        {isSuccess ? 'Sent' : 'Failed'}
      </Badge>
    );
  };

  const renderChannel = (channel: string) => {
    return channel === 'email' ? 'Email' : 'SMS';
  };

  const renderCustomerName = (log: NotificationLog) => {
    if (log.customer && (log.customer.firstName || log.customer.lastName)) {
      return `${log.customer.firstName || ''} ${log.customer.lastName || ''}`.trim();
    }
    return '—';
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Notification History</h1>
        <p className="text-gray-600">
          Review recently sent email and SMS notifications. Use this to verify
          loyalty reminder touchpoints.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow results by channel or focus only on loyalty reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Channel</span>
            <Select
              value={channelFilter}
              onValueChange={(value: 'all' | 'email' | 'sms') =>
                setChannelFilter(value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="email">Email only</SelectItem>
                <SelectItem value="sms">SMS only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={loyaltyOnly}
              onCheckedChange={(value) => setLoyaltyOnly(value)}
              id="loyalty-only"
            />
            <label htmlFor="loyalty-only" className="text-sm text-gray-600">
              Loyalty reminders only
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>
            Showing the {logs.length} most recent notifications that match your
            filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No notifications were found. Adjust your filters and try again.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message ID</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.sentAt), 'PP p')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.type?.replace(/_/g, ' ') || '—'}
                    </TableCell>
                    <TableCell>{renderCustomerName(log)}</TableCell>
                    <TableCell>{renderChannel(log.channel)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.recipient}
                    </TableCell>
                    <TableCell>{renderStatus(log.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.messageId || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-red-600">
                      {log.error || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
