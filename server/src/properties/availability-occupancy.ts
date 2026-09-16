export type DateRange = { startsOn: Date; endsOn: Date };
export type AvailabilityOccupancy = 'AVAILABLE' | 'PARTIALLY_BOOKED' | 'BOOKED';

export function getAvailabilityOccupancy(period: DateRange, confirmedExchanges: DateRange[]) {
  const bookedRanges = confirmedExchanges
    .map((exchange) => ({
      startsOn: exchange.startsOn > period.startsOn ? exchange.startsOn : period.startsOn,
      endsOn: exchange.endsOn < period.endsOn ? exchange.endsOn : period.endsOn,
    }))
    .filter((range) => range.startsOn < range.endsOn)
    .sort((left, right) => left.startsOn.getTime() - right.startsOn.getTime())
    .reduce<DateRange[]>((merged, range) => {
      const previous = merged.at(-1);
      if (!previous || range.startsOn > previous.endsOn) {
        merged.push({ ...range });
      } else if (range.endsOn > previous.endsOn) {
        previous.endsOn = range.endsOn;
      }
      return merged;
    }, []);
  const fullyBooked = bookedRanges.length === 1
    && bookedRanges[0].startsOn <= period.startsOn
    && bookedRanges[0].endsOn >= period.endsOn;
  const occupancy: AvailabilityOccupancy = fullyBooked
    ? 'BOOKED'
    : bookedRanges.length
      ? 'PARTIALLY_BOOKED'
      : 'AVAILABLE';
  return { occupancy, bookedRanges };
}
