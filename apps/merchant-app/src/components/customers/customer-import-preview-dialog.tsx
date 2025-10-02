import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@heya-pos/ui";
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import type { CustomerImportPreview } from "@/lib/clients/customers-client";

interface CustomerImportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  preview: CustomerImportPreview | null;
  onConfirm: () => void;
  importing: boolean;
  duplicateAction: 'skip' | 'update';
  skipInvalidRows: boolean;
  onDuplicateActionChange: (value: 'skip' | 'update') => void;
  onSkipInvalidRowsChange: (value: boolean) => void;
  onRefresh: () => void;
}

export function CustomerImportPreviewDialog({
  open,
  onClose,
  preview,
  onConfirm,
  importing,
  duplicateAction,
  skipInvalidRows,
  onDuplicateActionChange,
  onSkipInvalidRowsChange,
  onRefresh,
}: CustomerImportPreviewDialogProps) {
  if (!preview) return null;

  const { summary, rows } = preview;
  const totalActions = summary.toCreate + summary.toUpdate;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customer Import Preview</DialogTitle>
          <DialogDescription>
            Review the customers to import. Fix any errors before continuing to avoid missing data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <div className="space-y-2">
              <Label>Duplicate handling</Label>
              <Select
                value={duplicateAction}
                onValueChange={(value) => onDuplicateActionChange(value as 'skip' | 'update')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select how to handle duplicates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update existing customers</SelectItem>
                  <SelectItem value="skip">Skip duplicate rows</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Applies to rows that match an existing customer by email or mobile.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Skip invalid rows</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={skipInvalidRows}
                  onCheckedChange={onSkipInvalidRowsChange}
                />
                <span className="text-sm text-muted-foreground">
                  {skipInvalidRows
                    ? 'Rows with validation errors are ignored.'
                    : 'Validation errors stop the import until corrected.'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.valid}</div>
              <div className="text-sm text-muted-foreground">Valid</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.invalid}</div>
              <div className="text-sm text-muted-foreground">Invalid</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.duplicates}</div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalActions}</div>
              <div className="text-sm text-muted-foreground">Will Import / Update</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead className="w-16">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 50).map(row => {
                const name = row.data
                  ? [row.data.firstName, row.data.lastName].filter(Boolean).join(' ')
                  : '—';

                return (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>
                      {row.validation.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{name || '—'}</TableCell>
                    <TableCell>{row.data?.email || '—'}</TableCell>
                    <TableCell>{row.data?.mobile || row.data?.phone || '—'}</TableCell>
                    <TableCell>{row.data?.source || '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {row.validation.errors.map((error, index) => (
                          <div key={index} className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {error}
                          </div>
                        ))}
                        {row.validation.warnings.map((warning, index) => (
                          <div key={index} className="text-xs text-orange-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.action === 'create'
                            ? 'default'
                            : row.action === 'update'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {row.action}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {rows.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing first 50 rows of {rows.length} total
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={importing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Preview
          </Button>
          <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={importing || totalActions === 0} className="flex-1 sm:flex-none">
              {importing ? 'Importing...' : `Import ${totalActions} Customers`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
