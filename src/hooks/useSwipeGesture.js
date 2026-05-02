import { useEffect, useRef } from 'react';

/**
 * Hook para detectar gestos de swipe horizontal
 * @param {Function} onSwipeLeft - Callback cuando se desliza a la izquierda
 * @param {Function} onSwipeRight - Callback cuando se desliza a la derecha
 * @param {number} minDistance - Distancia mínima en px para detectar swipe (default 50)
 */
export function useSwipeGesture(onSwipeLeft, onSwipeRight, minDistance = 50) {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minDistance;
    const isRightSwipe = distance < -minDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    touchStart.current = null;
    touchEnd.current = null;
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
