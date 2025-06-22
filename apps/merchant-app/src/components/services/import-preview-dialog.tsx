import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { ImportPreview } from "@/lib/clients/services-client";

interface ImportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  preview: ImportPreview | null;
  onConfirm: () => void;
  importing: boolean;
}

export function ImportPreviewDialog({
  open,
  onClose,
  preview,
  onConfirm,
  importing
}: ImportPreviewDialogProps) {
  if (!preview) return null;

  const { summary, rows } = preview;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Service Import Preview</DialogTitle>
          <DialogDescription>
            Review the services to be imported. Fix any errors before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.valid}
              </div>
              <div className="text-sm text-muted-foreground">Valid</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.invalid}
              </div>
              <div className="text-sm text-muted-foreground">Invalid</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {summary.duplicates}
              </div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
          </div>

          {/* Preview Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead className="w-16">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="w-20">Price</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead className="w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 50).map((row) => (
                <TableRow key={row.rowNumber}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell>
                    {row.validation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{row.data.name}</TableCell>
                  <TableCell>{row.data.category || '-'}</TableCell>
                  <TableCell>{row.data.duration}</TableCell>
                  <TableCell>${row.data.price}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {row.validation.errors.map((error, i) => (
                        <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </div>
                      ))}
                      {row.validation.warnings.map((warning, i) => (
                        <div key={i} className="text-xs text-orange-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {warning}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      row.action === 'create' ? 'default' :
                      row.action === 'update' ? 'secondary' :
                      'outline'
                    }>
                      {row.action}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rows.length > 50 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Showing first 50 rows of {rows.length} total
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={importing || summary.valid === 0}
          >
            {importing ? "Importing..." : `Import ${summary.toCreate + summary.toUpdate} Services`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}