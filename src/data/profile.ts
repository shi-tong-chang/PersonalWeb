// Editable starter copy, not claims about unprovided credentials or experience.
export const profile = {
  name: 'shi-tong-chang',
  displayName: ['SHI-TONG', 'CHANG'],
  monogram: 'STC',
  title: '讓想像有形，讓作品有溫度。',
  introduction: '你好，我是 Shi-Tong。喜歡探索不同領域，也喜歡把腦海裡的風景，一步步做成能被看見、被使用的作品。',
  biography: '',
  github: 'https://github.com/shi-tong-chang',
  email: '',
};

export const chapters = [
  { id: 'about', label: '個人介紹', number: '01' },
  { id: 'projects', label: '專案經歷', number: '02' },
  { id: 'skills', label: '擅長技能', number: '03' },
  { id: 'contact', label: '聯繫方式', number: '04' },
] as const;

export const copy = {
  siteName: 'A Personal Universe',
  about: {
    eyebrow: 'A PERSONAL UNIVERSE',
    action: '探索我的作品',
    secondaryAction: '認識更多',
    signature: '在想像與實作之間，探索自己的可能。',
  },
  projects: {
    eyebrow: '01 / SELECTED WORK',
    heading: ['讓想像', '成為作品。'],
    subtitle: '從一個念頭出發，留下每一次探索與實作的軌跡。',
    action: '查看 GitHub 專案',
    footer: '作品持續累積中，其餘位置留給下一次探索。',
  },
  skills: {
    eyebrow: '02 / WAYS OF THINKING',
    heading: ['不只一種視角', '也不只一種可能。'],
    subtitle: '感性讓我開始，理性讓我走得更遠。',
    note: '這裡先放探索方向，具體技能與經歷會隨作品逐步補上。',
  },
  contact: {
    eyebrow: '03 / THE NEXT CHAPTER',
    heading: ['下一個故事', '從一次對話開始。'],
    introduction: '聊一個想法、交換一點靈感，或只是打聲招呼。期待在這片星海，與你相遇。',
    action: '到 GitHub 找我',
    signature: 'STAY CURIOUS. KEEP CREATING.',
  },
};

// Positioning themes only. Add your verifiable skills and tools in tags later.
export const skills = [
  { number: '01', english: 'INTERFACE & INTERACTION', title: '介面與互動', description: '關注使用的感受，也在意每一個恰到好處的細節。', tags: [] as string[] },
  { number: '02', english: 'SYSTEMS & LOGIC', title: '系統與邏輯', description: '拆解問題、理解結構，讓想法有清晰的實作路徑。', tags: [] as string[] },
  { number: '03', english: 'VISUAL & STORY', title: '視覺與敘事', description: '用畫面和節奏，讓作品不只是功能，也留下一點感受。', tags: [] as string[] },
  { number: '04', english: 'EXPLORE & BUILD', title: '探索與實作', description: '保持好奇，試著把陌生的事，變成下一件做得到的事。', tags: [] as string[] },
] as const;
