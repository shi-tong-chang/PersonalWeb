/** One entry becomes one selectable project. There is no hard-coded item limit. */
export interface Project {
  /** Stable, unique, URL-safe identifier. Keep it when editing the project. */
  id: string;
  name: string;
  subtitle: string;
  category: string;
  year: string;
  description: string;
  role: string;
  tags: string[];
  status: 'published' | 'reserved';
  /** Set false to remove this slot from the public gallery. */
  visible: boolean;
  /** Paths in public/, e.g. /assets/my-project.webp. The Pages base is added for you. */
  cover?: { src: string; alt: string; fit?: 'cover' | 'contain'; position?: string };
  /** Optional live demo, source repository, case study, video or external links. */
  links: { label: string; href: string }[];
}

const reserve = (number: string): Project => ({
  id: `project-${number}`,
  name: `專案 ${number}`,
  subtitle: '留白，為下一個想法。',
  category: '預留席位',
  year: '',
  description: '這一頁，留給下一件作品。未來將在此呈現專案的故事、畫面與實作細節。',
  role: '',
  tags: [],
  status: 'reserved',
  visible: true,
  links: [],
});

// Ten editable slots: one real project + nine explicitly marked reservations.
// Replace any reserve(...) with a Project object, or append more entries.
export const projects: Project[] = [
  {
    id: 'personal-web',
    name: 'PersonalWeb',
    subtitle: '一卷山水，一方天地。',
    category: '個人網站',
    year: '2026',
    description: '以水墨為境、互動為線，將個人介紹、作品與思考，收進一卷持續生長的山水。',
    role: '',
    tags: ['Astro', 'TypeScript', '互動設計'],
    status: 'published',
    visible: true,
    cover: {
      src: '/assets/ink-landscape-v1.webp',
      alt: '水墨山水與松下琴亭，PersonalWeb 的視覺主題',
      fit: 'cover',
      position: 'center',
    },
    links: [{ label: '查看 GitHub 專案', href: 'https://github.com/shi-tong-chang/PersonalWeb' }],
  },
  reserve('02'),
  reserve('03'),
  reserve('04'),
  reserve('05'),
  reserve('06'),
  reserve('07'),
  reserve('08'),
  reserve('09'),
  reserve('10'),
];
