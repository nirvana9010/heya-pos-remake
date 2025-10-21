import { getAustralianStateHolidays } from '@heya-pos/utils';

describe('Australian state holiday generator', () => {
  it('generates ACT holidays for 2025 without duplicates', () => {
    const holidays = getAustralianStateHolidays('ACT', 2025);
    const dates = new Set<string>();

    expect(holidays.length).toBeGreaterThan(10);
    const reconciliation = holidays.find((h) => h.name === 'Reconciliation Day');
    expect(reconciliation?.date.toISOString()).toEqual('2025-06-02T00:00:00.000Z');

    holidays.forEach((holiday) => {
      const key = holiday.date.toISOString();
      expect(dates.has(key)).toBe(false);
      dates.add(key);
    });
  });

  it('computes Western Australia Day correctly for 2025', () => {
    const holidays = getAustralianStateHolidays('WA', 2025);
    const waDay = holidays.find((h) => h.name === 'Western Australia Day');
    expect(waDay?.date.toISOString()).toEqual('2025-06-02T00:00:00.000Z');

    const kingsBirthday = holidays.find((h) => h.name === 'King’s Birthday');
    expect(kingsBirthday?.date.toISOString()).toEqual('2025-09-29T00:00:00.000Z');
  });

  it('throws for unsupported state input', () => {
    expect(() => getAustralianStateHolidays('XX' as any, 2025)).toThrow(
      'Unsupported state "XX"',
    );
  });
});
