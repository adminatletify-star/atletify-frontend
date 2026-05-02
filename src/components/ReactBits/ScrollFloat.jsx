import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ScrollFloat = ({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "easeOut",
  scrollStart = "center bottom",
  scrollEnd = "center center",
  stagger = 0.03
}) => {
  const elementRef = useRef(null);
  const [elementTop, setElementTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [words, setWords] = useState([]);

  useEffect(() => {
    if (typeof children === 'string') {
      setWords(children.split(' '));
    }
  }, [children]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateMeasurements = () => {
      const rect = element.getBoundingClientRect();
      setElementTop(rect.top + window.scrollY);
      setClientHeight(window.innerHeight);
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    return () => window.removeEventListener('resize', updateMeasurements);
  }, []);

  const { scrollY } = useScroll({
    container: scrollContainerRef
  });

  const progress = useTransform(
    scrollY,
    [elementTop - clientHeight, elementTop - clientHeight * 0.5],
    [0, 1]
  );

  if (typeof children !== 'string') {
    return (
      <motion.div
        ref={elementRef}
        className={containerClassName}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: animationDuration, ease }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={elementRef} className={containerClassName}>
      <motion.span
        className={textClassName}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.3em'
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            whileInView={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: animationDuration,
              delay: index * stagger,
              ease
            }}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre'
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </div>
  );
};

export default ScrollFloat;
