import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { MerchantHolidaysService } from './merchant-holidays.service';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaySource, MerchantHoliday } from '@prisma/client';

jest.mock('@heya-pos/utils', () => ({
  getAustralianStateHolidays: jest.fn(),
  listAustralianStates: jest.fn(() => ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']),
}));

import { getAustralianStateHolidays } from '@heya-pos/utils';

const getHolidaysMock = getAustralianStateHolidays as jest.Mock;

describe('MerchantHolidaysService', () => {
  let prisma: DeepMockProxy<PrismaService>;
  let service: MerchantHolidaysService;
  const merchantId = 'merchant-1';

  beforeEach(() => {
    prisma = mockDeep<PrismaService>();
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    service = new MerchantHolidaysService(prisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildHoliday = (overrides: Partial<MerchantHoliday>): MerchantHoliday => ({
    id: overrides.id ?? 'h-id',
    merchantId,
    name: overrides.name ?? 'Holiday',
    date: overrides.date ?? new Date('2025-01-01T00:00:00.000Z'),
    isDayOff: overrides.isDayOff ?? true,
    source: overrides.source ?? HolidaySource.STATE,
    state: overrides.state ?? 'NSW',
    createdAt: overrides.createdAt ?? new Date('2024-10-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-10-01T00:00:00.000Z'),
  });

  describe('syncStateHolidays', () => {
    it('reconciles state holidays and preserves custom entries', async () => {
      const existingStateHoliday = buildHoliday({
        id: 'state-existing',
        name: 'Old Holiday Name',
        date: new Date('2025-01-27T00:00:00.000Z'),
        source: HolidaySource.STATE,
        state: 'NSW',
        isDayOff: false,
      });

      const customHoliday = buildHoliday({
        id: 'custom-1',
        date: new Date('2025-02-14T00:00:00.000Z'),
        name: "Valentine's Day",
        source: HolidaySource.CUSTOM,
        state: null,
      });

      const obsoleteStateHoliday = buildHoliday({
        id: 'obsolete',
        date: new Date('2025-03-01T00:00:00.000Z'),
        name: 'Obsolete',
      });

      prisma.merchant.findUnique.mockResolvedValue({
        settings: { holidayState: 'NSW' },
      } as any);

      prisma.merchantHoliday.findMany
        .mockResolvedValueOnce([
          existingStateHoliday,
          customHoliday,
          obsoleteStateHoliday,
        ])
        .mockResolvedValueOnce([
          {
            ...existingStateHoliday,
            name: 'Australia Day',
            state: 'NSW',
          },
          customHoliday,
          buildHoliday({
            id: 'new-holiday',
            name: 'New Holiday',
            date: new Date('2025-06-09T00:00:00.000Z'),
            source: HolidaySource.STATE,
            state: 'NSW',
          }),
        ]);

      getHolidaysMock.mockReturnValue([
        {
          state: 'NSW',
          name: 'Australia Day',
          date: new Date('2025-01-27T00:00:00.000Z'),
        },
        {
          state: 'NSW',
          name: 'New Holiday',
          date: new Date('2025-06-09T00:00:00.000Z'),
        },
      ]);

      const result = await service.syncStateHolidays(merchantId, 'NSW', 2025);

      expect(getHolidaysMock).toHaveBeenCalledWith('NSW', 2025);
      expect(prisma.merchantHoliday.update).toHaveBeenCalledWith({
        where: { id: 'state-existing' },
        data: {
          name: 'Australia Day',
          state: 'NSW',
        },
      });
      expect(prisma.merchantHoliday.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          merchantId,
          name: 'New Holiday',
          state: 'NSW',
          source: HolidaySource.STATE,
        }),
      });
      expect(prisma.merchantHoliday.deleteMany).toHaveBeenCalledWith({
        where: {
          merchantId,
          id: { in: ['obsolete'] },
        },
      });
      expect(prisma.merchant.update).toHaveBeenCalledWith({
        where: { id: merchantId },
        data: {
          settings: expect.objectContaining({ holidayState: 'NSW' }),
        },
      });

      expect(result.selectedState).toBe('NSW');
      expect(result.year).toBe(2025);
      expect(result.holidays).toHaveLength(3);
    });

    it('throws for invalid state input', async () => {
      getHolidaysMock.mockImplementation(() => {
        throw new Error('Unsupported state "ZZ"');
      });

      await expect(
        service.syncStateHolidays(merchantId, 'NSW' as any, 2025),
      ).rejects.toThrow('Unsupported state "ZZ"');
    });
  });

  describe('createCustomHoliday', () => {
    it('rejects duplicates and creates new entries', async () => {
      prisma.merchantHoliday.findFirst
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce({ id: 'existing' } as any);

      prisma.merchantHoliday.create.mockResolvedValue(
        buildHoliday({
          id: 'custom-new',
          name: 'Shop Anniversary',
          date: new Date('2025-05-01T00:00:00.000Z'),
          source: HolidaySource.CUSTOM,
          state: null,
        }) as any,
      );

      const created = await service.createCustomHoliday(
        merchantId,
        'Shop Anniversary',
        '2025-05-01',
      );

      expect(created).toMatchObject({
        id: 'custom-new',
        name: 'Shop Anniversary',
        source: HolidaySource.CUSTOM,
      });

      await expect(
        service.createCustomHoliday(merchantId, 'Duplicate', '2025-05-01'),
      ).rejects.toThrow('A holiday already exists on this date');
    });
  });

  describe('updateHoliday', () => {
    it('updates toggles and rejects renaming system holidays', async () => {
      const stateHoliday = buildHoliday({
        id: 'state-1',
        source: HolidaySource.STATE,
        state: 'NSW',
      });

      prisma.merchantHoliday.findUnique.mockResolvedValue(stateHoliday);
      prisma.merchantHoliday.update.mockResolvedValue({
        ...stateHoliday,
        isDayOff: false,
      });

      const updated = await service.updateHoliday(
        merchantId,
        'state-1',
        { isDayOff: false },
      );

      expect(updated.isDayOff).toBe(false);

      await expect(
        service.updateHoliday(merchantId, 'state-1', { name: 'Rename' }),
      ).rejects.toThrow('Only custom holidays can be renamed.');
    });
  });

  describe('deleteHoliday', () => {
    it('removes holiday by id', async () => {
      const holiday = buildHoliday({ id: 'to-delete' });
      prisma.merchantHoliday.findUnique.mockResolvedValue(holiday);

      await service.deleteHoliday(merchantId, 'to-delete');

      expect(prisma.merchantHoliday.delete).toHaveBeenCalledWith({
        where: { id: 'to-delete' },
      });
    });
  });
});
