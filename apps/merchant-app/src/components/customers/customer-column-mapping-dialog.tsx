import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription,
} from "@heya-pos/ui";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ColumnMapping {
  csvColumn: string;
  field: string | null;
}

interface CustomerColumnMappingDialogProps {
  open: boolean;
  onClose: () => void;
  csvHeaders: string[];
  csvPreviewRows: string[][];
  onConfirm: (mappings: Record<string, string>) => void;
}

const REQUIRED_FIELDS = ['First Name'] as const;
const OPTIONAL_FIELDS = [
  'Last Name',
  'Full Name',
  'Email',
  'Mobile Number',
  'Phone',
  'Date of Birth',
  'Gender',
  'Address',
  'Suburb',
  'City',
  'State',
  'Postal Code',
  'Country',
  'Accepts Marketing',
  'Accepts SMS Marketing',
  'Blocked',
  'Block Reason',
  'Referral Source',
  'Tags',
  'Preferred Language',
  'Note',
  'Client ID',
  'Added',
] as const;

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

const FIELD_LABELS: Record<string, string> = {
  'First Name': 'First Name',
  'Last Name': 'Last Name',
  'Full Name': 'Full Name',
  'Email': 'Email',
  'Mobile Number': 'Mobile Number',
  'Phone': 'Phone',
  'Date of Birth': 'Date of Birth',
  'Gender': 'Gender',
  'Address': 'Address',
  'Suburb': 'Suburb',
  'City': 'City',
  'State': 'State',
  'Postal Code': 'Postal Code / ZIP',
  'Country': 'Country',
  'Accepts Marketing': 'Email Marketing Opt-In',
  'Accepts SMS Marketing': 'SMS Marketing Opt-In',
  'Blocked': 'Blocked Flag',
  'Block Reason': 'Block Reason',
  'Referral Source': 'Referral Source',
  'Tags': 'Tags / Labels',
  'Preferred Language': 'Preferred Language',
  'Note': 'Notes',
  'Client ID': 'Legacy Client ID',
  'Added': 'Added Date',
};

const IGNORE_VALUE = '__IGNORE__';

function autoDetectField(header: string): string | null {
  const lower = header.toLowerCase().trim();

  if (lower.includes('first') && lower.includes('name')) return 'First Name';
  if (lower.includes('last') && lower.includes('name')) return 'Last Name';
  if (lower.includes('full name') || lower === 'fullname' || lower === 'name') return 'Full Name';
  if (lower.includes('email')) return 'Email';
  if (lower.includes('mobile') || lower.includes('cell')) return 'Mobile Number';
  if (lower.includes('phone')) return 'Phone';
  if (lower.includes('dob') || lower.includes('birth')) return 'Date of Birth';
  if (lower.includes('gender') || lower.includes('sex')) return 'Gender';
  if (lower.includes('address') || lower.includes('street')) return 'Address';
  if (lower.includes('suburb') || lower.includes('district')) return 'Suburb';
  if (lower.includes('city') || lower.includes('town')) return 'City';
  if (lower.includes('state') || lower.includes('province')) return 'State';
  if (lower.includes('postal') || lower.includes('postcode') || lower.includes('zip')) return 'Postal Code';
  if (lower.includes('country')) return 'Country';
  if (lower.includes('sms')) return 'Accepts SMS Marketing';
  if (lower.includes('marketing') || lower.includes('opt in')) return 'Accepts Marketing';
  if (lower.includes('blocked') || lower.includes('blacklist')) return 'Blocked';
  if (lower.includes('block reason')) return 'Block Reason';
  if (lower.includes('referral') || lower.includes('source')) return 'Referral Source';
  if (lower.includes('tag') || lower.includes('label')) return 'Tags';
  if (lower.includes('language')) return 'Preferred Language';
  if (lower.includes('note')) return 'Note';
  if (lower.includes('client id') || lower.includes('customer id') || lower.includes('legacy')) return 'Client ID';
  if (lower.includes('added') || lower.includes('date added') || lower === 'added') return 'Added';

  return null;
}

export function CustomerColumnMappingDialog({
  open,
  onClose,
  csvHeaders,
  csvPreviewRows,
  onConfirm,
}: CustomerColumnMappingDialogProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && csvHeaders.length > 0) {
      const autoMappings = csvHeaders.map(header => ({
        csvColumn: header,
        field: autoDetectField(header),
      }));
      setMappings(autoMappings);
      setError(null);
    }
  }, [open, csvHeaders]);

  const getMappedField = (field: string) => {
    const mapping = mappings.find(m => m.field === field);
    return mapping ? mapping.csvColumn : null;
  };

  const getAvailableFields = (currentField: string | null) => {
    const mappedFields = mappings
      .filter(m => m.field !== null && m.field !== currentField)
      .map(m => m.field);
    return ALL_FIELDS.filter(field => !mappedFields.includes(field));
  };

  const handleMappingChange = (index: number, field: string | null) => {
    const nextMappings = [...mappings];

    if (field) {
      nextMappings.forEach((mapping, i) => {
        if (i !== index && mapping.field === field) {
          mapping.field = null;
        }
      });
    }

    nextMappings[index].field = field;
    setMappings(nextMappings);
    setError(null);
  };

  const validateMappings = () => {
    const mappedFields = mappings.filter(m => m.field).map(m => m.field as string);
    const missingRequired = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));

    if (missingRequired.length > 0) {
      setError(`Required fields not mapped: ${missingRequired.map(field => FIELD_LABELS[field]).join(', ')}`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleConfirm = () => {
    if (!validateMappings()) {
      return;
    }

    const mappingObject: Record<string, string> = {};
    mappings.forEach(({ csvColumn, field }) => {
      if (field) {
        mappingObject[csvColumn] = field;
      }
    });

    onConfirm(mappingObject);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map CSV Columns</DialogTitle>
          <DialogDescription>
            Match your CSV columns to the customer fields. At minimum, map the first name column so we can create customer records correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
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

          <div>
            <h4 className="text-sm font-medium mb-2">Column Mappings</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead className="w-56">Maps To</TableHead>
                  <TableHead>Sample Values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, index) => {
                  const availableFields = new Set(getAvailableFields(mapping.field));

                  return (
                    <TableRow key={mapping.csvColumn}>
                      <TableCell className="font-medium">{mapping.csvColumn}</TableCell>
                      <TableCell>
                        <Select
                        value={mapping.field ?? IGNORE_VALUE}
                        onValueChange={value =>
                          handleMappingChange(index, value === IGNORE_VALUE ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={IGNORE_VALUE}>— Ignore Column —</SelectItem>
                            {ALL_FIELDS.map(field => (
                              <SelectItem
                                key={field}
                                value={field}
                                disabled={!availableFields.has(field) && mapping.field !== field}
                              >
                                {FIELD_LABELS[field]}{field === 'First Name' ? ' *' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {csvPreviewRows.slice(0, 3).map((row, previewIndex) => (
                            <div key={previewIndex}>{row[index] ?? '—'}</div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Continue to Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
