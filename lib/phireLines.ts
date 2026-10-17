import type { PhireState } from '../components/Phire';

/**
 * The face Phire makes while saying a line:
 * - tongue: cheeky wink, open smile, tongue out (teasing / punny lines)
 * - blush:  pink cheeks, happy closed eyes, shy smile (sweet / flattered lines)
 * - stars:  big grin, star burst and twinkles around him (proud / hype lines)
 * - idea:   eyes up, brows raised, a lightbulb pops over his head (tips about the app)
 * - none:   keeps his current face (sleepy and sad lines)
 */
export type PhireMood = 'tongue' | 'blush' | 'stars' | 'idea' | 'none';
export type PhireLine = { text: string; mood: PhireMood };

// What Phire says when tapped: fire puns + focus/productivity jokes. Add more any time.
const JOKES: PhireLine[] = [
  { text: "I'm on fire today. Literally.", mood: 'stars' },
  { text: "Let's get lit… with focus.", mood: 'stars' },
  { text: "I don't burn out. I burn bright.", mood: 'stars' },
  { text: 'Warning: may cause extreme productivity.', mood: 'stars' },
  { text: 'Look at us. A couple of shining stars.', mood: 'stars' },
  { text: 'Hot tip: one task at a time.', mood: 'tongue' },
  { text: 'Distractions are just wet blankets.', mood: 'tongue' },
  { text: 'Feed me focus and I grow. No logs required.', mood: 'tongue' },
  { text: 'Some people do fire drills. I do focus drills.', mood: 'tongue' },
  { text: "The snooze button is mostly water. I'd stay away.", mood: 'tongue' },
  { text: "You bring the focus, I'll bring the heat.", mood: 'blush' },
  { text: 'Small sparks start big fires. So do 20 focused minutes.', mood: 'blush' },
  { text: 'Keep calm and carry a flame.', mood: 'blush' },
  { text: "Aww, you tapped me. I'm blushing… or just extra hot.", mood: 'blush' },
  { text: "Stop it, you're making me glow.", mood: 'blush' },
];

const SLEEPY: PhireLine[] = [
  { text: 'Zzz… five more minutes…', mood: 'none' },
  { text: 'Shh… recharging my embers.', mood: 'none' },
  { text: 'Resting now, burning brighter tomorrow.', mood: 'none' },
];

// After a stopped session: kind, never judging, looking forward to next time.
const CHEER_UP: PhireLine[] = [
  { text: "That's okay. Next time we'll burn even brighter.", mood: 'none' },
  { text: "Rest up — I'll keep the embers warm for you.", mood: 'none' },
  { text: "Every flame flickers sometimes. I'm still here.", mood: 'none' },
  { text: 'A little rain never put me out for long.', mood: 'none' },
  { text: 'Even embers can start a new fire. Whenever you are ready.', mood: 'none' },
];

const WORKING: PhireLine[] = [
  { text: 'Typing at full blaze!', mood: 'stars' },
  { text: "Shh, I'm in the zone. The hot zone.", mood: 'tongue' },
];

const SPORTY: PhireLine[] = [
  { text: 'Feel the burn! 🔥', mood: 'tongue' },
  { text: 'One more rep, then we focus.', mood: 'stars' },
];

export function linesFor(state: PhireState): PhireLine[] {
  switch (state) {
    case 'sleep':
      return SLEEPY;
    case 'sad':
      return CHEER_UP;
    case 'working':
      return [...WORKING, ...JOKES];
    case 'sport':
      return [...SPORTY, ...JOKES];
    default:
      return JOKES;
  }
}

// ─── Chatter: what Phire says on his own, now and then, without being tapped ───

/** Where Phire is, so his tips fit the screen. */
export type PhireTopic = 'home' | 'onboarding' | 'stats' | 'complete' | 'stopped' | 'focus';

// Little thoughts out loud, any screen.
const MUSINGS: PhireLine[] = [
  { text: 'Is it warm in here, or is it just me? …It’s me.', mood: 'tongue' },
  { text: 'Hmm-hmm-hmm… just flickering over here.', mood: 'none' },
  { text: 'Fun fact: I run entirely on focus. Zero emissions.', mood: 'stars' },
  { text: 'I could glow like this all day. Especially with you.', mood: 'blush' },
];

// Tips: how to use the app, in Phire's voice. Each comes with the lightbulb face.
const TIPS: Record<PhireTopic, PhireLine[]> = {
  home: [
    { text: 'Psst! Tap the skill name up top to switch skills or add a new one.', mood: 'idea' },
    { text: 'Hot tip: “Custom” in Start focus lets you pick any number of minutes.', mood: 'idea' },
    { text: 'Music too loud? The speaker up top mutes it. The arrow skips the song.', mood: 'idea' },
    { text: 'The little bars up top are your Stats. Go admire your glow.', mood: 'idea' },
    { text: 'Each finished session lights the next stop on your path. Collect them all!', mood: 'idea' },
    { text: 'Short on time? Even 15 minutes keeps me burning.', mood: 'idea' },
    { text: 'Focus a little every day and your streak grows. I LOVE a streak.', mood: 'idea' },
    { text: 'The gear up top opens Settings: sounds, buzzes, the works.', mood: 'idea' },
    { text: 'Poke me any time. I have jokes. Some are even good.', mood: 'tongue' },
  ],
  onboarding: [
    { text: 'Go on, poke me. I don’t bite. I just sizzle a little.', mood: 'tongue' },
    { text: 'Pick a skill you care about. I burn brightest for those.', mood: 'idea' },
  ],
  stats: [
    { text: 'Every minute you focus adds up here. Watch it grow!', mood: 'idea' },
    { text: 'Your streak counts days in a row. Keep it alive and so do I.', mood: 'idea' },
  ],
  complete: [
    { text: 'Peek at Stats to see how far you’ve come.', mood: 'idea' },
    { text: 'Take a short break before the next round. Even fires need air.', mood: 'idea' },
    { text: 'Same time tomorrow? Streaks love a routine.', mood: 'idea' },
  ],
  stopped: [
    { text: 'Next time, try a shorter one. “Custom” lets you pick just 10 minutes.', mood: 'idea' },
    { text: 'Phones are sneaky. Try putting yours face-down next time.', mood: 'idea' },
  ],
  focus: [
    { text: 'You’re doing great. I can feel the heat!', mood: 'blush' },
    { text: 'Stay with me: leaving the app makes me dim a little.', mood: 'idea' },
    { text: 'One thing at a time. That’s the secret sauce. Hot sauce.', mood: 'tongue' },
    { text: 'Look at us, focusing. Very impressive.', mood: 'stars' },
  ],
};

/** What Phire says on his own: tips for this screen, plus a few musings (not while working or sad). */
export function chatterFor(topic: PhireTopic, state: PhireState): PhireLine[] {
  const tips = TIPS[topic];
  // Asleep he mumbles, and now and then a tip slips out in his sleep.
  if (state === 'sleep') return [...SLEEPY, ...tips];
  if (topic === 'focus') return tips;
  if (topic === 'stopped') return [...tips, ...CHEER_UP];
  return [...tips, ...MUSINGS];
}

/** Shuffled copy, so taps go through every line once before any repeats. */
export function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
