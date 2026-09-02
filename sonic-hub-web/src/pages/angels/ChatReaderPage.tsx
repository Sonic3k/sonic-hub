import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { api } from '../../api/angels';
import { fmtDate, platformLabel, plural } from '../../lib/format';

/* Deliberately empty. Each platform will get its own reader that recreates
   how those conversations actually looked — a Yahoo window, a Nokia screen —
   rather than one generic chat bubble view. Until then, the archive's card. */
export default function ChatReaderPage() {
  const { id, archiveId } = useParams<{ id: string; archiveId: string }>();
  const { data: person } = useQuery({ queryKey: ['person', id], queryFn: () => api.person(id!), enabled: !!id });
  const { data: archives } = useQuery({ queryKey: ['chat-archives', id], queryFn: () => api.chatArchives(id!), enabled: !!id });
  const a = archives?.find(x => x.id === archiveId);

  return (
    <div>
      <Link to={`/angels/${id}/chats`} className="inline-flex items-center gap-1 text-[13px] text-ink2 hover:text-ink">
        <ChevronLeft className="h-4 w-4" />{person?.displayName || person?.name || 'Quay lại'}
      </Link>
      <h1 className="mt-2 font-display text-[clamp(24px,5vw,34px)] font-extrabold leading-[1.15] tracking-[-0.03em]">
        {a?.title || platformLabel(a?.platform) || 'Cuộc trò chuyện'}
      </h1>
      <p className="mt-2 text-[14px] text-ink2">
        {[platformLabel(a?.platform), plural(a?.messageCount ?? null, 'tin nhắn'),
          a?.dateFrom && a?.dateTo ? `${fmtDate(a.dateFrom, { month: 'numeric', year: 'numeric' })} → ${fmtDate(a.dateTo, { month: 'numeric', year: 'numeric' })}` : null,
        ].filter(Boolean).join(' · ') || '\u00A0'}
      </p>
      <div className="mt-10 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
        <p className="text-[15px] text-ink2">Trình đọc cho {platformLabel(a?.platform) ?? 'nền tảng này'} chưa dựng.</p>
        <p className="mx-auto mt-2 max-w-[30em] text-[13.5px] leading-relaxed text-ink2">Mỗi nền tảng sẽ có một trình đọc riêng, tái hiện đúng cách những tin nhắn này từng hiện lên.</p>
      </div>
    </div>
  );
}
