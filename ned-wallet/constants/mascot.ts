/**
 * N.E.D mascot (Teddy) asset registry
 * The purple bear of the N.E.D brand — 16 official expressions
 */

export const MASCOT_IMAGES = {
  // The 16 official mascots from the design library
  angry: require('@/assets/images/mascot teddy - angry.png'),
  confused: require('@/assets/images/mascot teddy - confused.png'),
  crying: require('@/assets/images/mascot teddy - crying.png'),
  curious: require('@/assets/images/mascot teddy - curious.png'),
  embarrassed: require('@/assets/images/mascot teddy - embarrassed.png'),
  exciting: require('@/assets/images/mascot teddy - exciting.png'),
  frustrated: require('@/assets/images/mascot teddy - frustrated.png'),
  happy: require('@/assets/images/mascot teddy - happy.png'),
  laughing: require('@/assets/images/mascot teddy - laughing.png'),
  proud: require('@/assets/images/mascot teddy - proud.png'),
  sad: require('@/assets/images/mascot teddy - sad.png'),
  scared: require('@/assets/images/mascot teddy - scared.png'),
  sleepy: require('@/assets/images/mascot teddy - sleepy.png'),
  surprised: require('@/assets/images/mascot teddy - surprised.png'),
  thinking: require('@/assets/images/mascot teddy - thinking.png'),
  waving: require('@/assets/images/mascot teddy - waving.png'),
  // Line-art (icon Splash) — docs/02-design/assets/mascot/teddy-line-art.png
  lineArt: require('@/assets/images/mascot teddy - line-art.png'),

  // Aliases, for compatibility and convenience
  welcome: require('@/assets/images/mascot teddy - waving.png'),
  love: require('@/assets/images/mascot teddy - embarrassed.png'),
  question: require('@/assets/images/mascot teddy - curious.png'),
  peekingThinking: require('@/assets/images/mascot teddy - thinking.png'),
} as const;

export type MascotMood = keyof typeof MASCOT_IMAGES;

export const MASCOT_LABELS: Record<MascotMood, string> = {
  angry: 'Angry, steaming',
  confused: 'Confused / awkward',
  crying: 'Crying / sad',
  curious: 'Curious / wondering',
  embarrassed: 'Shy / heart',
  exciting: 'Excited / celebrating',
  frustrated: 'Frustrated / annoyed',
  happy: 'Happy / cheerful',
  laughing: 'Laughing',
  proud: 'Proud',
  sad: 'Sad',
  scared: 'Scared',
  sleepy: 'Sleepy / Zzzz',
  surprised: 'Surprised',
  thinking: 'Thinking',
  waving: 'Waving / Welcome',
  lineArt: 'Line art (Splash icon)',

  // Aliases
  welcome: 'Welcome (waving)',
  love: 'Love (shy)',
  question: 'Question (curious)',
  peekingThinking: 'Bear peeking, thinking',
};
