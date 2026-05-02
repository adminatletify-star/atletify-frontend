import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const AnimatedList = ({
  items = [],
  renderItem,
  keyExtractor,
  staggerDelay = 0.05,
  initialDelay = 0,
  animateOnChange = true,
  className = '',
}) => {
  const [displayedItems, setDisplayedItems] = useState([]);

  useEffect(() => {
    if (animateOnChange) {
      setDisplayedItems([]);
      const timeout = setTimeout(() => {
        setDisplayedItems(items);
      }, 50);
      return () => clearTimeout(timeout);
    } else {
      setDisplayedItems(items);
    }
  }, [items, animateOnChange]);

  const itemVariants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
      },
      visible: (index) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          delay: initialDelay + index * staggerDelay,
          duration: 0.35,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      }),
      exit: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        transition: {
          duration: 0.2,
        },
      },
    }),
    [initialDelay, staggerDelay]
  );

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {displayedItems.map((item, index) => {
          const key = keyExtractor ? keyExtractor(item, index) : index;
          return (
            <motion.div
              key={key}
              custom={index}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {renderItem(item, index)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedList;
