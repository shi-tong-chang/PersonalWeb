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
  /** The first three visible featured entries appear before the full archive. */
  featured?: boolean;
  /** Paths in public/, e.g. /assets/my-project.webp. The Pages base is added for you. */
  cover?: { src: string; alt: string; fit?: 'cover' | 'contain'; position?: string };
  /** Optional live demo, source repository, case study, video or external links. */
  links: { label: string; href: string }[];
}

const reserve = (number: string): Project => ({
  id: `project-${number}`,
  name: `專案 ${number}`,
  subtitle: '下一個想法，正在成形。',
  category: '專案預留',
  year: '',
  description: '這個位置留給下一件作品。未來會補上專案背景、解決的問題、技術選擇與實作成果。',
  role: '',
  tags: [],
  status: 'reserved',
  visible: true,
  featured: number === '02' || number === '03',
  links: [],
});

// Ten editable slots: one real project + nine explicitly marked reservations.
// Replace any reserve(...) with a Project object, or append more entries.
export const projects: Project[] = [
  {
    id: 'personal-web',
    name: 'PersonalWeb',
    subtitle: '把自己的世界，做成一個網站。',
    category: '個人網站',
    year: '2026',
    description: '從星海開場，到清楚可讀的作品展示。以 Astro、TypeScript 與 CSS 實作章節式整頁切換、可擴充的專案索引，以及適應不同裝置的互動。',
    role: '',
    tags: ['Astro', 'TypeScript', 'CSS'],
    status: 'published',
    visible: true,
    featured: true,
    cover: {
      src: '/assets/star-sea-v1.webp',
      alt: '月光照映深藍夜海，遠方虎鯨與岸邊引導角色構成 PersonalWeb 的星海主視覺',
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
