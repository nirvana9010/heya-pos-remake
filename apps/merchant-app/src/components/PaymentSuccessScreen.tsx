"use client";

import React, { useState } from "react";
import { Button } from "@heya-pos/ui";
import { CheckCircle2, Printer, Loader2 } from "lucide-react";
import { useToast } from "@heya-pos/ui";
import { useAuth } from "@/lib/auth/auth-provider";
import { apiClient } from "@/lib/api-client";
import { printReceipt } from "@/lib/receipt-builder";

interface PaymentSuccessScreenProps {
  order: any;
  customer?: any;
  paymentMethod: string;
  changeAmount?: number;
  onDismiss: () => void;
}

export function PaymentSuccessScreen({
  order,
  customer,
  paymentMethod,
  changeAmount,
  onDismiss,
}: PaymentSuccessScreenProps) {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const [printing, setPrinting] = useState(false);

  const items: any[] = order?.items || [];
  const total = order?.totalAmount || 0;
  const paidAmount = order?.paidAmount || total;

  const customerName =
    customer?.firstName || customer?.lastName
      ? `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim()
      : customer?.name || null;

  const handlePrintReceipt = async () => {
    setPrinting(true);
    try {
      const printerIp = merchant?.settings?.printerIp || "127.0.0.1";

      // Fetch full merchant profile for receipt header
      let profile: any = null;
      try {
        profile = await apiClient.getMerchantProfile();
      } catch {
        // Fall back to auth context data
      }

      const location = profile?.locations?.find((l: any) => l.isActive) || profile?.locations?.[0] || merchant?.locations?.[0];
      const merchantInfo = {
        name: profile?.name || merchant?.name || "Store",
        phone: location?.phone || profile?.phone || undefined,
        abn: profile?.abn || undefined,
        address: location?.address || undefined,
        suburb: location?.suburb || undefined,
        state: location?.state || undefined,
        postalCode: location?.postalCode || undefined,
      };

      // Build payment info
      const payments = order?.payments?.length
        ? order.payments.map((p: any) => ({
            method: p.method,
            amount: Number(p.amount),
            tipAmount: p.tipAmount ? Number(p.tipAmount) : undefined,
          }))
        : [{ method: paymentMethod, amount: paidAmount }];

      await printReceipt(printerIp, {
        merchant: merchantInfo,
        items: items.map((item: any) => ({
          description: item.description || item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: item.discount ? Number(item.discount) : undefined,
          total: item.total ? Number(item.total) : undefined,
        })),
        subtotal: total,
        total: paidAmount,
        payments,
        changeAmount: changeAmount && changeAmount > 0 ? changeAmount : undefined,
        bookingNumber: order?.bookingNumber || order?.booking?.bookingNumber,
        customerName: customerName || undefined,
        date: new Date(),
      });

      toast({
        title: "Receipt printed",
        description: "Receipt sent to printer",
      });
    } catch (error: any) {
      // If printReceipt opened the browser print dialog as a fallback,
      // it returns normally (no throw). If we get here, even that failed.
      console.error("Print failed:", error);
      toast({
        title: "Print failed",
        description:
          error?.message || "Could not connect to printer. Check printer IP in Settings.",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      {/* Success icon */}
      <div className="mb-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
      </div>

      <h2 className="text-xl font-semibold text-green-700 mb-1">
        Payment Successful
      </h2>
      <p className="text-3xl font-bold mb-4">${paidAmount.toFixed(2)}</p>

      {customerName && (
        <p className="text-sm text-muted-foreground mb-4">{customerName}</p>
      )}

      {/* Service details */}
      {items.length > 0 && (
        <div className="w-full border rounded-lg p-3 mb-4 bg-gray-50">
          <div className="space-y-2">
            {items.map((item: any, i: number) => {
              const lineTotal =
                item.total ??
                item.unitPrice * item.quantity - (item.discount || 0);
              return (
                <div
                  key={item.id || `item-${i}`}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {item.description || item.name}
                    {item.quantity > 1 && (
                      <span className="text-gray-500 ml-1">x{item.quantity}</span>
                    )}
                  </span>
                  <span className="font-medium">${Number(lineTotal).toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t mt-2 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>${paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>incl. GST</span>
              <span>${(paidAmount / 11).toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t mt-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Paid by {paymentMethod === "CARD" ? "Card" : "Cash"}
              </span>
              <span>${paidAmount.toFixed(2)}</span>
            </div>
            {changeAmount != null && changeAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Change</span>
                <span>${changeAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handlePrintReceipt}
          disabled={printing}
        >
          {printing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Print Receipt
        </Button>
        <Button className="flex-1" onClick={onDismiss}>
          Done
        </Button>
      </div>
    </div>
  );
}
