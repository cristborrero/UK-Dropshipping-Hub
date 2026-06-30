import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.8,
  className,
  direction = 'up',
}: FadeInProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  const getDirectionOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 40 };
      case 'down':
        return { y: -40 };
      case 'left':
        return { x: 40 };
      case 'right':
        return { x: -40 };
      case 'none':
        return { x: 0, y: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        filter: 'blur(10px)',
        ...getDirectionOffset(),
      }}
      animate={
        isInView
          ? { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }
          : { opacity: 0, filter: 'blur(10px)', ...getDirectionOffset() }
      }
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98], // Custom ease-out
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-7xl px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
