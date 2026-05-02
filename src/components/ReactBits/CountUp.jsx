import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';

const CountUp = ({
  to = 0,
  from = 0,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className = '',
  onComplete,
  startOnView = true,
  threshold = 0.3,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  const [hasStarted, setHasStarted] = useState(false);

  const springValue = useSpring(from, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const displayValue = useTransform(springValue, (latest) => {
    const fixed = latest.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  });

  useEffect(() => {
    if (startOnView && isInView && !hasStarted) {
      const timeout = setTimeout(() => {
        springValue.set(to);
        setHasStarted(true);
        if (onComplete) {
          setTimeout(onComplete, duration * 1000);
        }
      }, delay * 1000);
      return () => clearTimeout(timeout);
    } else if (!startOnView && !hasStarted) {
      const timeout = setTimeout(() => {
        springValue.set(to);
        setHasStarted(true);
        if (onComplete) {
          setTimeout(onComplete, duration * 1000);
        }
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, startOnView, hasStarted, springValue, to, delay, duration, onComplete]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{displayValue}</motion.span>
      {suffix}
    </span>
  );
};

export default CountUp;
