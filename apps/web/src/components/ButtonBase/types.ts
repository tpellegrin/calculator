import { ButtonHTMLAttributes, MouseEventHandler } from 'react';

/**
 * Base props shared by all interactive button primitives.
 *
 * Anchor/link support was intentionally removed with the earlier routing
 * infrastructure — the calculator is a single-screen application. If a genuine
 * anchor need appears, prefer a dedicated `LinkBase` primitive over adding
 * polymorphism back to this component.
 */
export type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  blurDelay?: number;
  blurOnClick?: boolean;
  stopPropagation?: boolean;
  isFullWidth?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};
