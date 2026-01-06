"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@heya-pos/ui";
import { Trash2, RefreshCcw } from "lucide-react";
import { useToast } from "@heya-pos/ui";
import { apiClient } from "@/lib/api-client";
import type { MerchantHoliday, AustralianState } from "@heya-pos/types";
import { DatePickerField } from "../DatePickerField";

const STATE_OPTIONS: Array<{ value: AustralianState; label: string }> = [
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NSW", label: "New South Wales" },
  { value: "NT", label: "Northern Territory" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "VIC", label: "Victoria" },
  { value: "WA", label: "Western Australia" },
];

const formatDateLabel = (date: string) => {
  const parsed = new Date(date);
  return format(parsed, "EEEE d MMMM yyyy");
};

const sortHolidays = (holidays: MerchantHoliday[]) =>
  [...holidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

interface HolidayManagerProps {
  initialState?: AustralianState | null;
}

export function HolidayManager({ initialState }: HolidayManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedState, setSelectedState] = useState<AustralianState | "">(
    initialState ?? "",
  );
  const [holidays, setHolidays] = useState<MerchantHoliday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["merchantHolidays"],
    queryFn: () => apiClient.holidays.list(),
    staleTime: 60_000,
  });

  const notifyHolidayUpdate = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("merchant-holidays-updated"));
    }
  };

  useEffect(() => {
    if (data?.holidays) {
      setHolidays(sortHolidays(data.holidays));
    }
  }, [data?.holidays]);

  useEffect(() => {
    if (data?.selectedState !== undefined) {
      setSelectedState(data.selectedState ?? "");
    }
  }, [data?.selectedState]);

  const stateMutation = useMutation({
    mutationFn: (state: AustralianState) => apiClient.holidays.syncState(state),
    onSuccess: (response) => {
      setHolidays(sortHolidays(response.holidays));
      queryClient.setQueryData(["merchantHolidays"], response);
      toast({
        title: "State holidays updated",
        description: `${STATE_OPTIONS.find((option) => option.value === response.selectedState)?.label ?? response.selectedState} holidays loaded for ${response.year}.`,
      });
      notifyHolidayUpdate();
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousState) {
        setSelectedState(context.previousState);
      }
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Failed to load state holidays";
      toast({
        title: "Unable to update state",
        description: message,
        variant: "destructive",
      });
    },
    onMutate: (state) => {
      const previousState = selectedState;
      setSelectedState(state);
      return { previousState };
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; date: string }) =>
      apiClient.holidays.createCustom(payload),
    onSuccess: (created) => {
      setHolidays((existing) => sortHolidays([...existing, created]));
      queryClient.setQueryData(["merchantHolidays"], (current: any) =>
        current
          ? {
              ...current,
              holidays: sortHolidays([...current.holidays, created]),
            }
          : current,
      );
      setNewHolidayName("");
      setNewHolidayDate("");
      toast({
        title: "Custom holiday added",
        description: `${created.name} on ${formatDateLabel(created.date)} has been added.`,
      });
      notifyHolidayUpdate();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Unable to create holiday";
      toast({
        title: "Add holiday failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { isDayOff?: boolean };
    }) => apiClient.holidays.update(id, payload),
    onSuccess: (updated) => {
      setHolidays((existing) =>
        sortHolidays(
          existing.map((holiday) =>
            holiday.id === updated.id ? updated : holiday,
          ),
        ),
      );
      queryClient.setQueryData(["merchantHolidays"], (current: any) =>
        current
          ? {
              ...current,
              holidays: sortHolidays(
                current.holidays.map((holiday: MerchantHoliday) =>
                  holiday.id === updated.id ? updated : holiday,
                ),
              ),
            }
          : current,
      );
      notifyHolidayUpdate();
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) {
        setHolidays(context.previous);
      }
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Unable to update holiday";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    },
    onMutate: ({ id, payload }) => {
      setHolidays((existing) =>
        existing.map((holiday) =>
          holiday.id === id ? { ...holiday, ...payload } : holiday,
        ),
      );
      return { previous: holidays };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.holidays.delete(id),
    onSuccess: (_void, id) => {
      setHolidays((existing) =>
        existing.filter((holiday) => holiday.id !== id),
      );
      queryClient.setQueryData(["merchantHolidays"], (current: any) =>
        current
          ? {
              ...current,
              holidays: current.holidays.filter(
                (holiday: MerchantHoliday) => holiday.id !== id,
              ),
            }
          : current,
      );
      toast({ title: "Holiday removed" });
      notifyHolidayUpdate();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        "Unable to delete holiday";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const isStateLoading = stateMutation.isPending;
  const isCreating = createMutation.isPending;

  const stateLabel = useMemo(() => {
    if (!selectedState) {
      return "No state selected";
    }
    return (
      STATE_OPTIONS.find((option) => option.value === selectedState)?.label ??
      selectedState
    );
  }, [selectedState]);

  const handleStateChange = (value: string) => {
    if (!value || value === selectedState) {
      return;
    }
    stateMutation.mutate(value as AustralianState);
  };

  const handleToggle = (holiday: MerchantHoliday, next: boolean) => {
    updateMutation.mutate({ id: holiday.id, payload: { isDayOff: next } });
  };

  const handleCreate = () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast({
        title: "Missing details",
        description: "Provide both a holiday name and date before adding.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: newHolidayName.trim(),
      date: newHolidayDate,
    });
  };

  const disableAdd = !newHolidayName.trim() || !newHolidayDate || isCreating;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Public Holidays</CardTitle>
        <CardDescription>
          Automatically load Australian public holidays by state, keep existing
          toggles, and add custom dates for your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:w-80">
            <Label htmlFor="holiday-state">State</Label>
            <Select
              value={selectedState || undefined}
              onValueChange={handleStateChange}
              disabled={isStateLoading || isLoading}
            >
              <SelectTrigger id="holiday-state">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {STATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Current selection: {stateLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(isFetching || isStateLoading) && (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            )}
            <span>
              {isFetching || isStateLoading
                ? "Updating holiday data…"
                : "State changes keep existing toggles and custom entries."}
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="custom-holiday-name">Holiday name</Label>
              <Input
                id="custom-holiday-name"
                placeholder="e.g. Studio Anniversary"
                value={newHolidayName}
                onChange={(event) => setNewHolidayName(event.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="custom-holiday-date">Date</Label>
              <DatePickerField
                id="custom-holiday-date"
                value={newHolidayDate ? new Date(newHolidayDate) : null}
                onChange={(selected) => {
                  if (!selected) {
                    setNewHolidayDate("");
                    return;
                  }
                  const normalized = new Date(selected);
                  normalized.setHours(0, 0, 0, 0);
                  setNewHolidayDate(format(normalized, "yyyy-MM-dd"));
                }}
                placeholder="DD/MM/YYYY"
                disabled={isCreating}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={disableAdd}
                className="w-full"
              >
                Add custom holiday
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Custom holidays are merchant-specific and behave exactly like system
            holidays. Dates must be unique.
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Holiday</TableHead>
                <TableHead className="min-w-[180px]">Date</TableHead>
                <TableHead className="w-[160px] text-center">
                  Treat as day off
                </TableHead>
                <TableHead className="w-[80px] text-center">Source</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    No holidays configured yet. Select a state or add a custom
                    date to get started.
                  </TableCell>
                </TableRow>
              ) : (
                holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>
                      <div className="font-medium">{holiday.name}</div>
                    </TableCell>
                    <TableCell>{formatDateLabel(holiday.date)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={holiday.isDayOff}
                        onCheckedChange={(checked) =>
                          handleToggle(holiday, checked)
                        }
                        disabled={updateMutation.isPending}
                        aria-label={`Toggle day off for ${holiday.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {holiday.source === "CUSTOM" ? (
                        <Badge variant="secondary">Custom</Badge>
                      ) : (
                        <Badge variant="outline">
                          {holiday.state ?? "State"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(holiday.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${holiday.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
