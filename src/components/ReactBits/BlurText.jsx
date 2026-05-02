import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const BlurText = ({
  text = '',
  delay = 0.05,
  className = '',
  animateOnView = true,
  direction = 'top', // 'top' | 'bottom' | 'left' | 'right'
  threshold = 0.1,
  rootMargin = '0px',
  animationFrom,
  animationTo,
  easing = [0.25, 0.46, 0.45, 0.94],
  onAnimationComplete,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    amount: threshold,
    margin: rootMargin,
  });

  const [hasAnimated, setHasAnimated] = useState(false);

  const words = text.split(' ');

  const defaultFrom = {
    top: { filter: 'blur(12px)', opacity: 0, y: -30 },
    bottom: { filter: 'blur(12px)', opacity: 0, y: 30 },
    left: { filter: 'blur(12px)', opacity: 0, x: -30 },
    right: { filter: 'blur(12px)', opacity: 0, x: 30 },
  };

  const from = animationFrom || defaultFrom[direction] || defaultFrom.top;
  const to = animationTo || { filter: 'blur(0px)', opacity: 1, y: 0, x: 0 };

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  const shouldAnimate = animateOnView ? isInView : true;

  return (
    <p ref={ref} className={className} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={from}
          animate={shouldAnimate ? to : from}
          transition={{
            delay: index * delay,
            duration: 0.6,
            ease: easing,
          }}
          onAnimationComplete={index === words.length - 1 ? onAnimationComplete : undefined}
          style={{ display: 'inline-block', willChange: 'filter, opacity, transform' }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
};

export default BlurText;
