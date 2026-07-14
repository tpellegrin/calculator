import { createGlobalStyle } from 'styled-components';
import { normalize } from 'styled-normalize';

import { prettyScrollbar } from './mixins';
import { typography } from './themes/typography';

// Baseline motion duration for `:root`-scoped transitions.
// The earlier transition/config module was removed with the animation
// system; a single value is sufficient for the retained scoped transitions.
const BASELINE_TRANSITION_MS = 200;

export const GlobalStyle = createGlobalStyle`
  ${normalize}

  :root {
    --baseline-transition-duration: ${BASELINE_TRANSITION_MS}ms;
  }
  
  * {
    box-sizing: border-box;
  }
  
  html, body {
    width: 100%;
    ${prettyScrollbar()}
    margin: 0;
    padding: 0;
    overflow: hidden;
    overscroll-behavior: none;
    ${typography.bodyMd};
  }

  html, body, #root, .app-root {
    height: 100%;
    min-height: 100%;
  }

  #root, .app-root {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .app-root {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  /* Global transition clamp scoped to app root (variable-driven) */
  .app-root * {
    /* Base allow-list via CSS variables so components can extend safely */
    --transition-props: color, background-color, border-color, box-shadow;
    --transition-duration: 200ms;
    --transition-easing: ease;

    transition-timing-function: var(--transition-easing);
    transition-duration: var(--transition-duration);
    transition-property: var(--transition-props) !important;
  }

  /* Opt-in helpers (extend by setting variables locally) */
  .app-root [data-allow-motion] {
    --transition-props: transform, opacity;
  }

  .app-root [data-allow-size] {
    --transition-props: width, height, max-height, flex-basis;
  }

  .app-root [data-allow-width] {
    --transition-props: width;
  }

  .app-root [data-allow-fade] {
    --transition-props: opacity;
  }

  body.no-select {
    user-select: none;
  }

  p {
    margin: 0;
    overflow-wrap: break-word;
  }
`;
