import React, { useState, useEffect } from 'react';

const CountUp = ({ end, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const target = parseFloat(end) || 0;
    
    // If it's not a number, just render it immediately
    if (isNaN(target)) {
      setCount(end);
      return;
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{typeof count === 'number' ? count.toLocaleString() : count}</span>;
};

export default CountUp;
