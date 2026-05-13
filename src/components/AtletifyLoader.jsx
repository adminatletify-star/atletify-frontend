import { useEffect, useMemo } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { interpolate } from "flubber";

const pathA =
  "M 50 8 L 60 32 L 74 64 L 84 84 L 90 90 L 92 92 " +
  "L 72 92 L 66 76 L 60 60 L 50 40 L 40 60 L 34 76 L 28 92 " +
  "L 8 92 L 10 90 L 16 84 L 26 64 L 40 32 Z";

const pathDumbbell =
  "M 20 32 L 32 41 L 40 46 L 50 47 L 60 46 L 68 41 " +
  "L 80 32 L 92 41 L 92 59 L 80 68 L 68 59 " +
  "L 60 54 L 50 53 L 40 54 L 32 59 L 20 68 L 8 59 L 8 41 Z";

export default function AtletifyLoader() {
  const progress = useMotionValue(0);
  const mix = useMemo(
    () => interpolate(pathA, pathDumbbell, { maxSegmentLength: 2 }),
    []
  );
  const d = useTransform(progress, mix);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: 1.2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    });
    return () => controls.stop();
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
        style={{
          filter:
            "drop-shadow(0 0 6px rgba(255,255,255,.55)) " +
            "drop-shadow(0 0 18px rgba(255,255,255,.25))",
        }}
        aria-label="Cargando"
        role="img"
      >
        <motion.path d={d} fill="currentColor" />
      </svg>
    </div>
  );
}
