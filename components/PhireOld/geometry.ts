// Phire is drawn in a 120 x 120 design box; multiply by k = size / 120 for pixels.
export const VIEW = 120;

/** Wide, multi-tipped flame body (tips along the top, round belly). */
export const BODY_PATH =
  'M60 112 C36 112 18 98 18 78 C18 62 24 52 28 30 C32 38 36 42 40 42 C40 30 42 20 46 10 ' +
  'C50 22 54 30 58 32 C60 22 62 12 68 4 C72 16 76 24 78 30 C80 26 84 22 88 18 ' +
  'C88 28 90 36 92 40 C95 38 98 36 101 32 C101 48 102 60 102 76 C102 98 84 112 60 112 Z';

/** Shine stroke on the upper right of the body. */
export const SHINE_PATH = 'M86 46 C89 52 91 58 92 64';

/** Inner layers reuse the body shape, shrunk toward the bottom center. */
export const innerLayerTransform = (scale: number, lift: number) =>
  `translate(60 ${112 - lift}) scale(${scale}) translate(-60 -112)`;

export const EYE_Y = 72;
export const EYE_LEFT_X = 42;
export const EYE_RIGHT_X = 78;
export const EYE_R = 11;

export const MOUTH_CX = 60;
export const MOUTH_CY = 86;

/** Shoulder points where the arms attach. */
export const SHOULDER_Y = 86;
export const SHOULDER_LEFT_X = 22;
export const SHOULDER_RIGHT_X = 98;

export const GLOW_CENTER = { x: 60, y: 78 };

export const INK = '#2A1A1C';
