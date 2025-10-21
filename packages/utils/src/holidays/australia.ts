import type { AustralianState } from '@heya-pos/types';

export interface StateHolidayDefinition {
  state: AustralianState;
  name: string;
  date: Date;
}

const STATES: AustralianState[] = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const toUtcDate = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day));

const addUtcDays = (date: Date, amount: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));

const getNthWeekdayOfMonth = (
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
) => {
  const firstDay = toUtcDate(year, month, 1);
  const offset = (weekday - firstDay.getUTCDay() + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  return toUtcDate(year, month, day);
};

const getLastWeekdayOfMonth = (year: number, month: number, weekday: number) => {
  const lastDay = toUtcDate(year, month + 1, 0);
  const diff = (lastDay.getUTCDay() - weekday + 7) % 7;
  return addUtcDays(lastDay, -diff);
};

const getFirstWeekdayOnOrAfter = (
  year: number,
  month: number,
  day: number,
  weekday: number,
) => {
  const date = toUtcDate(year, month, day);
  const diff = (weekday - date.getUTCDay() + 7) % 7;
  return addUtcDays(date, diff);
};

const getEasterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return toUtcDate(year, month, day);
};

const getRoyalQueenslandShowDay = (year: number) => {
  const base = toUtcDate(year, 8, 11);
  const diff = (3 - base.getUTCDay() + 7) % 7; // Wednesday
  return addUtcDays(base, diff);
};

const getFridayBeforeAflGrandFinal = (year: number) =>
  getLastWeekdayOfMonth(year, 9, 5); // Friday in September

const getMelbourneCupDay = (year: number) =>
  getNthWeekdayOfMonth(year, 11, 2, 1); // First Tuesday November

const getChristmasHolidays = (year: number, state: AustralianState): StateHolidayDefinition[] => {
  const holidays: StateHolidayDefinition[] = [];
  const christmas = toUtcDate(year, 12, 25);
  const boxing = toUtcDate(year, 12, 26);
  const christmasWeekday = christmas.getUTCDay();
  const boxingWeekday = boxing.getUTCDay();

  holidays.push({ state, name: 'Christmas Day', date: christmas });

  if (christmasWeekday === 6) {
    holidays.push({
      state,
      name: 'Christmas Day (observed)',
      date: addUtcDays(christmas, 2),
    });
  } else if (christmasWeekday === 0) {
    holidays.push({
      state,
      name: 'Christmas Day (observed)',
      date: addUtcDays(christmas, 1),
    });
  }

  if (state === 'SA') {
    holidays.push({
      state,
      name: 'Proclamation Day public holiday / Boxing Day',
      date: boxing,
    });
  } else {
    holidays.push({ state, name: 'Boxing Day', date: boxing });
  }

  if (boxingWeekday === 6) {
    holidays.push({
      state,
      name: 'Boxing Day (observed)',
      date: addUtcDays(boxing, 2),
    });
  } else if (boxingWeekday === 0) {
    holidays.push({
      state,
      name: 'Boxing Day (observed)',
      date: addUtcDays(boxing, 2),
    });
  }

  return holidays;
};

const getNewYearHoliday = (year: number, state: AustralianState): StateHolidayDefinition[] => {
  const date = toUtcDate(year, 1, 1);
  const weekday = date.getUTCDay();
  const holidays: StateHolidayDefinition[] = [
    { state, name: "New Year's Day", date },
  ];

  if (weekday === 6) {
    holidays.push({
      state,
      name: "New Year's Day (observed)",
      date: addUtcDays(date, 2),
    });
  } else if (weekday === 0) {
    holidays.push({
      state,
      name: "New Year's Day (observed)",
      date: addUtcDays(date, 1),
    });
  }

  return holidays;
};

const getAustraliaDayHoliday = (year: number, state: AustralianState): StateHolidayDefinition[] => {
  const date = toUtcDate(year, 1, 26);
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return [
      {
        state,
        name: 'Australia Day',
        date: addUtcDays(date, weekday === 6 ? 2 : 1),
      },
    ];
  }

  return [{ state, name: 'Australia Day', date }];
};

const baseStateFactory = (
  state: AustralianState,
  year: number,
  extras: StateHolidayDefinition[],
): StateHolidayDefinition[] => {
  const easterSunday = getEasterSunday(year);
  const goodFriday = addUtcDays(easterSunday, -2);
  const easterMonday = addUtcDays(easterSunday, 1);

  const holidays: StateHolidayDefinition[] = [
    ...getNewYearHoliday(year, state),
    ...getAustraliaDayHoliday(year, state),
    { state, name: 'Good Friday', date: goodFriday },
    { state, name: 'Easter Monday', date: easterMonday },
    { state, name: 'Anzac Day', date: toUtcDate(year, 4, 25) },
    ...getChristmasHolidays(year, state),
    ...extras,
  ];

  const deduped = new Map<string, StateHolidayDefinition>();
  holidays.forEach((holiday) => {
    const key = holiday.date.toISOString().split('T')[0];
    if (!deduped.has(key)) {
      deduped.set(key, holiday);
    }
  });

  return Array.from(deduped.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
};

const stateFactories: Record<AustralianState, (year: number) => StateHolidayDefinition[]> = {
  ACT: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('ACT', year, [
      {
        state: 'ACT',
        name: 'Canberra Day',
        date: getNthWeekdayOfMonth(year, 3, 1, 2),
      },
      {
        state: 'ACT',
        name: 'Easter Saturday – the day after Good Friday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'ACT',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'ACT',
        name: 'Reconciliation Day',
        date: getFirstWeekdayOnOrAfter(year, 5, 27, 1),
      },
      {
        state: 'ACT',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'ACT',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 10, 1, 1),
      },
    ]);
  },
  NSW: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('NSW', year, [
      {
        state: 'NSW',
        name: 'Easter Saturday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'NSW',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'NSW',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'NSW',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 10, 1, 1),
      },
    ]);
  },
  NT: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('NT', year, [
      {
        state: 'NT',
        name: 'Easter Saturday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'NT',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'NT',
        name: 'May Day',
        date: getNthWeekdayOfMonth(year, 5, 1, 1),
      },
      {
        state: 'NT',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'NT',
        name: 'Picnic Day',
        date: getNthWeekdayOfMonth(year, 8, 1, 1),
      },
      {
        state: 'NT',
        name: 'Christmas Eve (part-day, 7 pm – midnight)',
        date: toUtcDate(year, 12, 24),
      },
      {
        state: 'NT',
        name: "New Year's Eve (part-day, 7 pm – midnight)",
        date: toUtcDate(year, 12, 31),
      },
    ]);
  },
  QLD: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('QLD', year, [
      {
        state: 'QLD',
        name: 'The day after Good Friday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'QLD',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'QLD',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 5, 1, 1),
      },
      {
        state: 'QLD',
        name: 'Royal Queensland Show (Brisbane area only)',
        date: getRoyalQueenslandShowDay(year),
      },
      {
        state: 'QLD',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 10, 1, 1),
      },
      {
        state: 'QLD',
        name: 'Christmas Eve (part-day, 6 pm – midnight)',
        date: toUtcDate(year, 12, 24),
      },
    ]);
  },
  SA: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('SA', year, [
      {
        state: 'SA',
        name: 'Adelaide Cup Day',
        date: getNthWeekdayOfMonth(year, 3, 1, 2),
      },
      {
        state: 'SA',
        name: 'Easter Saturday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'SA',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'SA',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'SA',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 10, 1, 1),
      },
      {
        state: 'SA',
        name: 'Christmas Eve (part-day, 7 pm – midnight)',
        date: toUtcDate(year, 12, 24),
      },
      {
        state: 'SA',
        name: "New Year's Eve (part-day, 7 pm – midnight)",
        date: toUtcDate(year, 12, 31),
      },
    ]);
  },
  TAS: (year) => {
    const easterSunday = getEasterSunday(year);
    const easterTuesday = addUtcDays(easterSunday, 2);
    return baseStateFactory('TAS', year, [
      {
        state: 'TAS',
        name: 'Royal Hobart Regatta (certain areas only)',
        date: getNthWeekdayOfMonth(year, 2, 1, 2),
      },
      {
        state: 'TAS',
        name: 'Eight Hours Day',
        date: getNthWeekdayOfMonth(year, 3, 1, 2),
      },
      {
        state: 'TAS',
        name: 'Easter Tuesday (generally Tasmanian Public Service only)',
        date: easterTuesday,
      },
      {
        state: 'TAS',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'TAS',
        name: 'Recreation Day (certain areas only)',
        date: getNthWeekdayOfMonth(year, 11, 1, 1),
      },
    ]);
  },
  VIC: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('VIC', year, [
      {
        state: 'VIC',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 3, 1, 2),
      },
      {
        state: 'VIC',
        name: 'Saturday before Easter Sunday',
        date: addUtcDays(easterSunday, -1),
      },
      {
        state: 'VIC',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'VIC',
        name: 'King’s Birthday',
        date: getNthWeekdayOfMonth(year, 6, 1, 2),
      },
      {
        state: 'VIC',
        name: 'Friday before the AFL Grand Final',
        date: getFridayBeforeAflGrandFinal(year),
      },
      {
        state: 'VIC',
        name: 'Melbourne Cup',
        date: getMelbourneCupDay(year),
      },
    ]);
  },
  WA: (year) => {
    const easterSunday = getEasterSunday(year);
    return baseStateFactory('WA', year, [
      {
        state: 'WA',
        name: 'Labour Day',
        date: getNthWeekdayOfMonth(year, 3, 1, 1),
      },
      {
        state: 'WA',
        name: 'Easter Sunday',
        date: easterSunday,
      },
      {
        state: 'WA',
        name: 'Western Australia Day',
        date: getNthWeekdayOfMonth(year, 6, 1, 1),
      },
      {
        state: 'WA',
        name: 'King’s Birthday',
        date: getLastWeekdayOfMonth(year, 9, 1),
      },
    ]);
  },
};

export const getAustralianStateHolidays = (
  state: AustralianState,
  year: number,
): StateHolidayDefinition[] => {
  if (!STATES.includes(state)) {
    throw new Error(`Unsupported state "${state}"`);
  }

  return stateFactories[state](year);
};

export const listAustralianStates = (): AustralianState[] => [...STATES];
