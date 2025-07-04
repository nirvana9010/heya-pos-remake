import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface ColumnMapping {
  csvColumn: string;
  field: string | null;
}

interface ColumnMappingDialogProps {
  open: boolean;
  onClose: () => void;
  csvHeaders: string[];
  csvPreviewRows: string[][];
  onConfirm: (mappings: Record<string, string>) => void;
}

const REQUIRED_FIELDS = ['name', 'price'];
const OPTIONAL_FIELDS = ['id', 'category', 'description', 'duration', 'active'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<string, string> = {
  id: 'Service ID',
  name: 'Service Name',
  category: 'Category',
  description: 'Description',
  duration: 'Duration',
  price: 'Price',
  active: 'Active Status'
};

export function ColumnMappingDialog({
  open,
  onClose,
  csvHeaders,
  csvPreviewRows,
  onConfirm
}: ColumnMappingDialogProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect mappings when dialog opens
  useEffect(() => {
    if (open && csvHeaders.length > 0) {
      const autoMappings = csvHeaders.map(header => {
        const lowerHeader = header.toLowerCase().trim();
        let detectedField: string | null = null;

        // Try to auto-detect based on common variations
        if (lowerHeader === 'id' || lowerHeader.includes('service id') || lowerHeader.includes('service_id') || lowerHeader === 'code' || lowerHeader === 'sku') {
          detectedField = 'id';
        } else if (lowerHeader.includes('name') || lowerHeader === 'service' || lowerHeader === 'service name') {
          detectedField = 'name';
        } else if (lowerHeader.includes('price') || lowerHeader.includes('cost') || lowerHeader.includes('amount')) {
          detectedField = 'price';
        } else if (lowerHeader.includes('category') || lowerHeader === 'type') {
          detectedField = 'category';
        } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
          detectedField = 'description';
        } else if (lowerHeader.includes('duration') || lowerHeader.includes('time') || lowerHeader.includes('minutes')) {
          detectedField = 'duration';
        } else if (lowerHeader.includes('active') || lowerHeader.includes('status') || lowerHeader.includes('enabled')) {
          detectedField = 'active';
        }

        return {
          csvColumn: header,
          field: detectedField
        };
      });

      setMappings(autoMappings);
    }
  }, [open, csvHeaders]);

  const handleMappingChange = (index: number, field: string | null) => {
    const newMappings = [...mappings];
    
    // If this field was already mapped elsewhere, clear it
    if (field) {
      newMappings.forEach((mapping, i) => {
        if (i !== index && mapping.field === field) {
          mapping.field = null;
        }
      });
    }
    
    newMappings[index].field = field;
    setMappings(newMappings);
    setError(null);
  };

  const validateMappings = () => {
    const mappedFields = mappings
      .filter(m => m.field !== null)
      .map(m => m.field);

    // Check if all required fields are mapped
    const missingRequired = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
    
    if (missingRequired.length > 0) {
      setError(`Required fields not mapped: ${missingRequired.map(f => FIELD_LABELS[f]).join(', ')}`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleConfirm = () => {
    if (!validateMappings()) {
      return;
    }

    // Convert to mapping object
    const mappingObject: Record<string, string> = {};
    mappings.forEach(mapping => {
      if (mapping.field) {
        mappingObject[mapping.csvColumn] = mapping.field;
      }
    });

    onConfirm(mappingObject);
  };

  const getAvailableFields = (currentField: string | null) => {
    const mappedFields = mappings
      .filter(m => m.field !== null && m.field !== currentField)
      .map(m => m.field);
    
    return ALL_FIELDS.filter(field => !mappedFields.includes(field));
  };

  const getMappedField = (field: string) => {
    const mapping = mappings.find(m => m.field === field);
    return mapping ? mapping.csvColumn : null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map CSV Columns</DialogTitle>
          <DialogDescription>
            Match your CSV columns to the service fields. Required fields must be mapped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Required fields status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Required Fields</h4>
              {REQUIRED_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-2 text-sm">
                  {getMappedField(field) ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{FIELD_LABELS[field]}</span>
                  {getMappedField(field) && (
                    <span className="text-muted-foreground">→ {getMappedField(field)}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Optional Fields</h4>
              {OPTIONAL_FIELDS.map(field => (
                <div key={field} className="flex items-center gap-2 text-sm">
                  {getMappedField(field) ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="w-4" />
                  )}
                  <span>{FIELD_LABELS[field]}</span>
                  {getMappedField(field) && (
                    <span className="text-muted-foreground">→ {getMappedField(field)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Column mapping table */}
          <div>
            <h4 className="text-sm font-medium mb-2">Column Mappings</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Sample Values</TableHead>
                  <TableHead className="w-48">Map to Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, index) => (
                  <TableRow key={mapping.csvColumn}>
                    <TableCell className="font-medium">{mapping.csvColumn}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {csvPreviewRows.slice(0, 3).map((row, rowIndex) => (
                          <div key={rowIndex} className="text-muted-foreground">
                            {row[index] || '-'}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.field || "unmapped"}
                        onValueChange={(value) => handleMappingChange(index, value === "unmapped" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">Do not import</SelectItem>
                          {getAvailableFields(mapping.field).map(field => (
                            <SelectItem key={field} value={field}>
                              {FIELD_LABELS[field]}
                              {REQUIRED_FIELDS.includes(field) && " *"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Continue to Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}