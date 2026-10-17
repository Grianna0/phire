// Phire's artwork: the measured body (in the 1000 × 1000 coordinates of the original reference
// drawing), the flame-flicker worklet, and the Pivot helper used to rotate/scale parts in place.
import type { ComponentProps, ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import { G } from 'react-native-svg';

export const AnimatedG = Animated.createAnimatedComponent(G);

// Outer body: left shoulder tip, four flame tips, wide round base. Clockwise from the bottom.
export const BODY_OUTER =
  'M486 828 C420 828 330 805 285 765 C250 735 232 700 215 660 C200 620 198 560 206 510 ' +
  'C214 460 228 420 230 380 C231 360 232 345 236 334 C250 340 266 350 276 358 ' +
  'C300 290 340 200 367 152 C385 185 395 240 416 268 ' +
  'C440 245 445 190 432 148 C455 145 515 190 537 240 ' +
  'C552 222 575 205 588 195 C596 230 600 290 622 318 ' +
  'C640 292 680 265 703 258 C712 300 705 330 718 370 ' +
  'C742 415 766 480 770 545 C776 600 768 640 750 670 C715 735 640 800 560 820 C535 826 510 828 486 828 Z';

// Inner yellow layer: three peaks with a small tip on each side.
export const BODY_INNER =
  'M480 796 C420 796 360 780 320 752 C280 724 262 700 255 660 C248 610 248 560 250 520 ' +
  'C252 480 254 450 256 430 C254 420 258 412 262 410 C275 418 292 432 305 440 ' +
  'C312 400 330 320 356 278 C372 300 400 350 435 372 ' +
  'C455 350 475 300 492 270 C508 300 530 340 548 355 ' +
  'C560 345 575 330 585 322 C597 345 612 385 632 402 ' +
  'C645 390 660 378 668 370 C678 420 715 500 726 560 C735 620 720 680 690 712 C650 755 560 796 480 796 Z';

// Raised right arm (two fingertips) and hanging left arm (two small tips). Each path starts
// and ends well inside the body, which is drawn on top, so the joins never show.
// Right arm: lower edge matches the reference (807@y600, 839@y550); the inner edge hugs the body
// so no background shows between arm and body; both fingertips are rounded.
export const ARM_RIGHT =
  'M720 662 C760 652 812 620 836 572 ' + // lower edge out to the elbow
  'C848 548 858 512 856 490 C855 476 842 470 834 480 ' + // big fingertip (≈850,478)
  'C828 488 826 496 822 503 ' + // dip between fingers
  'C816 494 806 486 797 490 C788 495 788 510 784 522 ' + // small fingertip (≈797,490)
  'C779 536 760 548 724 556 Z'; // inner edge back into the body
export const ARM_LEFT =
  'M222 640 C200 670 180 700 174 735 C170 760 170 780 178 794 C186 785 194 776 200 768 ' +
  'C206 774 212 780 220 782 C224 768 232 745 252 722 Z';
// Just inside the body edge, so the wave swings from the shoulder and the base stays tucked in.
export const SHOULDER_RIGHT = { x: 750, y: 600 };
export const SHOULDER_LEFT = { x: 232, y: 690 };
// Wave range in degrees (negative = toward the head, positive = outward).
export const WAVE_IN = -6;
export const WAVE_OUT = 26;

// White highlights (cut-outs in the reference). The first two sit on the center tip and
// flicker with it; the side ones are below the flicker zone.
export const SHINES_TOP = ['M452 162 L456 165', 'M466 175 C478 186 490 198 500 212'];
export const SHINES_SIDE = ['M706 392 C716 424 727 455 735 486', 'M742 504 L745 520'];
export const SHINE_STYLE = { stroke: '#FFFFFF', strokeWidth: 9, strokeLinecap: 'round', fill: 'none' } as const;

// ─── Flame flicker ───────────────────────────────────────────────────────────
// Every point above `top` is nudged by a travelling wave, strongest at the tips and fading
// to zero by eye level, so each tip sways out of step with its neighbours and the base stays put.

export type ParsedPath = { cmds: string[]; nums: number[][] };

export function parsePath(d: string): ParsedPath {
  const cmds: string[] = [];
  const nums: number[][] = [];
  for (const [, cmd, args] of d.matchAll(/([MCLZ])([^MCLZ]*)/g)) {
    cmds.push(cmd);
    nums.push(args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []);
  }
  return { cmds, nums };
}

/** Rebuilds `p` with the flicker applied at phase `t` (radians); `amp` scales the motion. */
export function flicker(p: ParsedPath, t: number, top: number, phase: number, amp = 1) {
  'worklet';
  let out = '';
  for (let i = 0; i < p.cmds.length; i++) {
    out += p.cmds[i];
    const n = p.nums[i];
    for (let j = 0; j < n.length; j += 2) {
      const x = n[j];
      const y = n[j + 1];
      const w = Math.min(1, Math.max(0, (top - y) / 170));
      const k = w * w * amp;
      // Three harmonics (1×, 2×, 3× the clock, so the loop stays seamless) give an irregular,
      // living flicker; the vertical term makes the tips lick upward, not just sway.
      const dx =
        k *
        (9 * Math.sin(t + phase + x * 0.018) +
          4 * Math.sin(2 * t + phase + x * 0.05) +
          2.5 * Math.sin(3 * t + phase * 1.7 + x * 0.09));
      const dy = k * (7 * Math.sin(2 * t + phase + 1.3 + x * 0.025) + 3 * Math.sin(3 * t + phase + x * 0.06));
      out += ` ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
    }
  }
  return out;
}

export const OUTER_P = parsePath(BODY_OUTER);
export const INNER_P = parsePath(BODY_INNER);
export const SHINE_TOP_P = SHINES_TOP.map(parsePath);
// Flicker fades out by these y values (well above the eyes at ~600). High enough that the lower
// far-right tip (y≈258) still moves clearly; the inner layer's peaks sit lower, so its zone does too.
export const OUTER_TOP = 380;
export const INNER_TOP = 470;
export const FLICKER_MS = 1600;

export const EYES = [
  { cx: 337, cy: 616, px: 342, py: 615 },
  { cx: 658, cy: 598, px: 664, py: 598 },
];
export const EYE_R = 54;
export const PUPIL_R = 34;

// Wide D-shaped smile: dip in the top edge, right side higher; tongue clipped to the mouth.
export const MOUTH =
  'M408 632 C410 616 428 610 450 614 C468 617 482 624 496 626 C520 628 545 606 572 600 ' +
  'C590 596 596 610 590 624 C576 660 545 684 505 684 C462 684 425 666 408 632 Z';
export const TONGUE = 'M436 666 C462 650 520 643 586 645 C570 672 542 686 505 686 C476 686 452 680 436 666 Z';

/**
 * Animated group that rotates/scales around `at`. Translating to the pivot and back keeps the
 * pivot correct everywhere; react-native-web drops originX/originY when animatedProps update.
 */
export function Pivot({
  at,
  animatedProps,
  children,
}: {
  at: { x: number; y: number };
  animatedProps?: ComponentProps<typeof AnimatedG>['animatedProps'];
  children: ReactNode;
}) {
  return (
    <G transform={`translate(${at.x} ${at.y})`}>
      <AnimatedG animatedProps={animatedProps}>
        <G transform={`translate(${-at.x} ${-at.y})`}>{children}</G>
      </AnimatedG>
    </G>
  );
}
