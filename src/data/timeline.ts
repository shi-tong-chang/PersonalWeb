/** A milestone in display order. Add only dates and experiences you can verify. */
export interface TimelineEvent {
  /** Stable, unique, URL-safe identifier. */
  id: string;
  /** Human-readable date; a placeholder is fine until the date is known. */
  dateLabel: string;
  /** Optional machine-readable date, e.g. YYYY, YYYY-MM, or YYYY-MM-DD. */
  dateTime?: string;
  title: string;
  description: string;
}

export const timelineCopy = {
  eyebrow: '04 / TRACES IN TIME',
  heading: ['把走過的路', '連成自己的星圖。'],
  introduction: '那些重要的起點、轉折與收穫，都值得留下一個座標。',
  emptyTitle: '大事記準備中。',
  emptyDescription: '留一點空間，給接下來值得記錄的時刻。',
};

// Four editable reservations, not claims about completed milestones.
// Order entries as you want readers to encounter them; no automatic date sorting.
export const timelineEvents: TimelineEvent[] = [
  {
    id: 'milestone-01',
    dateLabel: '日期待填',
    title: '事件待填 01',
    description: '寫下第一個重要的起點，以及當時想探索的方向。',
  },
  {
    id: 'milestone-02',
    dateLabel: '日期待填',
    title: '事件待填 02',
    description: '補上一次學習、嘗試，或讓想法開始成形的時刻。',
  },
  {
    id: 'milestone-03',
    dateLabel: '日期待填',
    title: '事件待填 03',
    description: '記錄一個完成的里程碑，以及過程中留下的收穫。',
  },
  {
    id: 'milestone-04',
    dateLabel: '日期待填',
    title: '事件待填 04',
    description: '留給最近的一次轉變，或下一段值得記錄的探索。',
  },
];
