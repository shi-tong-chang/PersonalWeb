// Main copy lives here. Four arts are a visual metaphor, not a list of credentials.
// Replace the display name and optional biography with your preferred wording.
export const profile = {
  name: 'shi-tong-chang',
  displayName: ['SHI-TONG', 'CHANG'],
  monogram: 'STC',
  title: '心有丘壑，行無疆界。',
  introduction: '理性落子，感性成詩。於不同領域之間，探尋屬於自己的答案。',
  biography: '',
  github: 'https://github.com/shi-tong-chang',
  email: '',
};

export const chapters = [
  { id: 'about', label: '個人介紹', art: 'qin', character: '琴', number: '壹', subtitle: '聽弦 · 識人' },
  { id: 'projects', label: '專案經歷', art: 'qi', character: '棋', number: '貳', subtitle: '觀局 · 落子' },
  { id: 'skills', label: '擅長技能', art: 'shu', character: '書', number: '參', subtitle: '問學 · 致用' },
  { id: 'contact', label: '聯繫方式', art: 'hua', character: '畫', number: '肆', subtitle: '留白 · 相逢' },
] as const;

export const copy = {
  siteName: '知行之間',
  about: {
    eyebrow: '山水為序 · 知行為章',
    heading: ['心有丘壑', '行無疆界'],
    action: '展卷，見作品',
    secondaryAction: '與我相識',
    signature: '琴棋書畫，皆為修行。知行之間，自有天地。',
  },
  projects: {
    eyebrow: '貳 · 棋 / 專案經歷',
    heading: ['落子有思', '行而有成'],
    subtitle: '一局一世界，一作一足跡。',
    action: '查看 GitHub 專案',
    footer: '將思考落在實處，讓作品替自己說話。',
  },
  skills: {
    eyebrow: '參 · 書 / 擅長技能',
    heading: ['不囿一藝', '融會於心'],
    subtitle: '以四藝為引，連結感知、思辨、學習與創造。',
    note: '具體專長與經歷，將在此逐步展開。',
  },
  contact: {
    eyebrow: '肆 · 畫 / 聯繫方式',
    heading: ['山水有相逢', '留白待知音'],
    title: '下一幅風景，不妨一同落筆。',
    introduction: '聊一個想法，談一次合作，或只是道一聲好。',
    action: '到 GitHub 找我',
    signature: '卷有盡，意無窮。',
  },
};

export const projects = [
  {
    number: '01',
    name: 'PersonalWeb',
    category: '個人網站',
    year: '2026',
    description: '以水墨為境、互動為線，將個人介紹、作品與思考，收進一卷持續生長的山水。',
    tags: ['Astro', 'TypeScript', '互動設計'],
    url: 'https://github.com/shi-tong-chang/PersonalWeb',
  },
];

// These are positioning themes. Add verifiable tools / achievements in tags later.
export const skills = [
  { number: '壹', art: 'qin', character: '琴', title: '感知與表達', description: '聽見細節，讓想法有共鳴。', tags: [] as string[] },
  { number: '貳', art: 'qi', character: '棋', title: '思辨與布局', description: '看見全局，也走好眼前一步。', tags: [] as string[] },
  { number: '參', art: 'shu', character: '書', title: '學習與沉澱', description: '在求知中積累，在實作中融會。', tags: [] as string[] },
  { number: '肆', art: 'hua', character: '畫', title: '想像與創造', description: '於留白之處，描繪新的可能。', tags: [] as string[] },
] as const;
