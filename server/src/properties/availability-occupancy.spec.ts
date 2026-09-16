import { getAvailabilityOccupancy } from './availability-occupancy';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const range = (startsOn: string, endsOn: string) => ({ startsOn: date(startsOn), endsOn: date(endsOn) });

describe('getAvailabilityOccupancy', () => {
  const period = range('2026-09-17', '2026-09-30');

  it('keeps a period available when confirmed exchanges do not overlap it', () => {
    expect(getAvailabilityOccupancy(period, [range('2026-10-01', '2026-10-05')])).toEqual({
      occupancy: 'AVAILABLE',
      bookedRanges: [],
    });
  });

  it('clips an overlapping exchange and marks the period as partially booked', () => {
    expect(getAvailabilityOccupancy(period, [range('2026-09-20', '2026-09-24')])).toEqual({
      occupancy: 'PARTIALLY_BOOKED',
      bookedRanges: [range('2026-09-20', '2026-09-24')],
    });
  });

  it('marks the whole period as booked when one exchange covers it', () => {
    expect(getAvailabilityOccupancy(period, [range('2026-09-10', '2026-10-02')])).toEqual({
      occupancy: 'BOOKED',
      bookedRanges: [period],
    });
  });

  it('merges adjacent confirmed exchanges that together occupy the whole period', () => {
    expect(getAvailabilityOccupancy(period, [
      range('2026-09-17', '2026-09-23'),
      range('2026-09-23', '2026-09-30'),
    ])).toEqual({
      occupancy: 'BOOKED',
      bookedRanges: [period],
    });
  });
});
