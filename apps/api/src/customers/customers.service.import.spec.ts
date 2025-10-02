import { CustomersService } from './customers.service';
import { CustomerDuplicateAction, CustomerImportOptionsDto } from './dto/import-customers.dto';

describe('CustomersService import parsing', () => {
  const createService = () => {
    const prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-id' }),
        update: jest.fn().mockResolvedValue({ id: 'existing-id' }),
      },
      booking: {},
      merchant: {},
    } as any;

    const cache = {
      generateKey: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    const service = new CustomersService(prisma, cache);
    return { service, prisma, cache };
  };

  it('parses Lumere export rows and normalizes mobile numbers', () => {
    const { service } = createService();
    const row = {
      'Client ID': '237282704',
      'First Name': 'Messina',
      'Last Name': '',
      'Full Name': 'Messina',
      Blocked: 'No',
      'Mobile Number': '61 413 748 166',
      Email: '',
      'Accepts Marketing': 'Yes',
      'Accepts SMS Marketing': 'Yes',
      'Date of Birth': '',
      Added: '2025-09-24',
      Note: '',
      'Referral Source': 'Walk-In',
    };

    const result = (service as any).parseCustomerImport(row);

    expect(result.firstName).toBe('Messina');
    expect(result.lastName).toBeUndefined();
    expect(result.mobile).toBe('+61413748166');
    expect(result.phone).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.marketingConsent).toBe(true);
    expect(result.smsNotifications).toBe(true);
    expect(result.notificationPreference).toBe('both');
    expect(result.status).toBe('ACTIVE');
    expect(result.source).toBe('Walk-In');
    expect(result.notes).toContain('Legacy ID: 237282704');
    expect(result.createdAtOverride?.toISOString()).toBe('2025-09-24T00:00:00.000Z');
  });

  it('handles classic template columns and preserves provided tags', () => {
    const { service } = createService();
    const row = {
      'First Name': 'John',
      'Last Name': 'Smith',
      Phone: '(02) 9876 5432',
      Mobile: '0412 345 678',
      'Marketing Consent': 'true',
      'Accepts SMS Marketing': 'no',
      Tags: 'vip, loyal',
      'Preferred Language': 'fr',
    };

    const result = (service as any).parseCustomerImport(row);

    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Smith');
    expect(result.phone).toBe('+61298765432');
    expect(result.mobile).toBe('+61412345678');
    expect(result.marketingConsent).toBe(true);
    expect(result.smsNotifications).toBe(false);
    expect(result.notificationPreference).toBe('email');
    expect(result.tags).toEqual(['vip', 'loyal']);
    expect(result.preferredLanguage).toBe('fr');
    expect(result.status).toBeUndefined();
    expect(result.source).toBe('MIGRATED');
  });

  it('derives names from full name and supports AU date formats', () => {
    const { service } = createService();
    const row = {
      'Full Name': 'Smith, Anna Marie',
      Email: 'ANNA@example.com',
      'Mobile Number': '+61 450 000 000',
      'Date of Birth': '31/12/1990',
      Blocked: 'Yes',
    };

    const result = (service as any).parseCustomerImport(row);

    expect(result.firstName).toBe('Anna Marie');
    expect(result.lastName).toBe('Smith');
    expect(result.email).toBe('anna@example.com');
    expect(result.mobile).toBe('+61450000000');
    expect(result.dateOfBirth?.toISOString()).toBe('1990-12-31T00:00:00.000Z');
    expect(result.status).toBe('INACTIVE');
  });
  it('previews imports with duplicate detection and actions', async () => {
    const { service, prisma } = createService();
    prisma.customer.findFirst
      .mockResolvedValueOnce(null) // Row 1 email
      .mockResolvedValueOnce(null) // Row 1 mobile
      .mockResolvedValueOnce({ id: 'existing-123' }); // Row 2 email

    const csv = `First Name,Last Name,Mobile,Email\nAlice,Smith,0412 000 000,new@example.com\nBob,Jones,0412 999 999,existing@example.com`;

    const preview = await service.previewCustomerImport(
      'merchant-1',
      Buffer.from(csv, 'utf-8'),
      {
        duplicateAction: CustomerDuplicateAction.UPDATE,
        skipInvalidRows: true,
      },
    );

    expect(preview.summary.total).toBe(2);
    expect(preview.summary.toCreate).toBe(1);
    expect(preview.summary.toUpdate).toBe(1);
    expect(preview.summary.duplicates).toBe(1);

    expect(preview.rows[0].action).toBe('create');
    expect(preview.rows[1].action).toBe('update');
    expect(preview.rows[1].existingCustomerId).toBe('existing-123');
  });

  it('executes preview rows and persists create/update actions', async () => {
    const { service, prisma } = createService();

    const rows = [
      {
        rowNumber: 2,
        original: {},
        data: {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          mobile: '+61412000000',
          createdAtOverride: new Date('2024-01-01T00:00:00.000Z'),
        },
        validation: { isValid: true, errors: [], warnings: [] },
        action: 'create' as const,
      },
      {
        rowNumber: 3,
        original: {},
        data: {
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'existing@example.com',
        },
        validation: { isValid: true, errors: [], warnings: [] },
        action: 'update' as const,
        existingCustomerId: 'existing-123',
      },
      {
        rowNumber: 4,
        original: {},
        data: undefined,
        validation: { isValid: false, errors: ['Missing name'], warnings: [] },
        action: 'skip' as const,
      },
    ];

    const result = await service.executeCustomerImport(
      'merchant-1',
      rows,
      new CustomerImportOptionsDto(),
    );

    expect(prisma.customer.create).toHaveBeenCalledTimes(1);
    expect(prisma.customer.update).toHaveBeenCalledTimes(1);
    expect(prisma.customer.create.mock.calls[0][0].data.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(result.imported).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });
});
