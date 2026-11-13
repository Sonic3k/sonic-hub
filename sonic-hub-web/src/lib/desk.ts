/* His machines — the computers, the phones, the music players — with their years: the desk of the day being looked
   at lists them all, and names the computer and the phone of that day (the read Hôm nay makes too, so it is shared). */
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import { atOf, useMoment } from './moment';

export function useDesk() {
  const { moment } = useMoment(), at = moment ? atOf(moment) : '';
  return useQuery({ queryKey: ['desk-at', at], queryFn: () => hub.deskAt(at), enabled: !!moment, staleTime: 10 * 60_000 });
}
