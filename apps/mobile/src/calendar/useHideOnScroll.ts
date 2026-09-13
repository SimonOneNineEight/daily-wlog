import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollViewProps } from 'react-native';

/** Handlers to spread onto the surface's scroller. */
export type ScrollHidingHandlers = Pick<
  ScrollViewProps,
  'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollBegin' | 'onMomentumScrollEnd'
>;

// A finger lifted with no momentum never fires onMomentumScrollEnd, so
// releasing alone has to bring the controls back — but momentum usually
// starts a frame later, and showing then hiding again reads as a flicker.
// The delay lets a momentum start cancel the show before it happens.
// Off-token: no --duration-* value names a settle, and the motion tokens are
// about animation length, not about waiting to see what the finger did.
const SETTLE_MS = 120;

/**
 * Floating controls step out of the way while you scroll and come back when
 * you stop (#50). The surface owns its scroller, so the hook hands back the
 * visibility and the handlers rather than reaching for the scroller itself.
 */
export function useHideOnScroll(): { visible: boolean; scrollHandlers: ScrollHidingHandlers } {
  const [visible, setVisible] = useState(true);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSettle = useCallback(() => {
    if (settle.current !== null) {
      clearTimeout(settle.current);
      settle.current = null;
    }
  }, []);

  useEffect(() => cancelSettle, [cancelSettle]);

  const hide = useCallback(() => {
    cancelSettle();
    setVisible(false);
  }, [cancelSettle]);

  const show = useCallback(() => {
    cancelSettle();
    setVisible(true);
  }, [cancelSettle]);

  return {
    visible,
    scrollHandlers: {
      onScrollBeginDrag: hide,
      onMomentumScrollBegin: hide,
      onMomentumScrollEnd: show,
      onScrollEndDrag: () => {
        cancelSettle();
        settle.current = setTimeout(show, SETTLE_MS);
      },
    },
  };
}
