// All visitor-facing copy is editable here. Empty optional fields are not rendered.
// The display name is derived from the GitHub handle; replace it with your preferred name.
export const profile = {
  name: 'shi-tong-chang',
  displayName: ['SHI-TONG', 'CHANG'],
  monogram: 'STC',
  title: '一個人，不只一種可能。',
  introduction: '我的作品、思考，以及還在探索的事。',
  biography: '',
  github: 'https://github.com/shi-tong-chang',
  email: '',
};

export const copy = {
  navigation: ['個人介紹', '專案經歷', '擅長技能', '聯繫方式'],
  about: {
    eyebrow: 'A PERSONAL INTRODUCTION',
    action: '從作品認識我',
    secondaryAction: '打聲招呼',
    signature: 'A WORK IN PROGRESS. JUST LIKE ME.',
  },
  projects: {
    eyebrow: 'SELECTED WORK',
    heading: ['Made with', 'intention.'],
    subtitle: '想法，留下了形狀。',
    action: '查看 GitHub 專案',
    footer: '每一件作品，都是認識我的另一個入口。',
  },
  skills: {
    eyebrow: 'BEHIND THE WORK',
    heading: ['More than', 'a skill set.'],
    subtitle: '作品之外，還有這些面向。',
    note: '專長與工具，留待我慢慢補上。',
  },
  contact: {
    eyebrow: 'THE NEXT CHAPTER',
    heading: ['LET’S', 'CONNECT.'],
    title: '認識彼此，從一句 Hello 開始。',
    introduction: '如果你也有想分享的事，歡迎來打聲招呼。',
    action: '到 GitHub 找我',
    signature: 'THANKS FOR STOPPING BY.',
  },
};

export const projects = [
  {
    number: '01',
    name: 'PersonalWeb',
    category: 'PERSONAL WEBSITE',
    year: '2026',
    description: '一個關於我的空間。用設計、互動與作品，慢慢拼出完整的輪廓。',
    tags: ['Astro', 'TypeScript', 'Interaction'],
    url: 'https://github.com/shi-tong-chang/PersonalWeb',
  },
];

// Keep these as neutral categories until you add your actual experience.
export const skills = [
  { number: '01', title: '擅長的事', english: 'EXPERTISE', description: '', tags: [] as string[] },
  { number: '02', title: '使用的工具', english: 'TOOLKIT', description: '', tags: [] as string[] },
  { number: '03', title: '正在探索', english: 'CURIOSITY', description: '', tags: [] as string[] },
];
