import { useState, useEffect, useCallback } from 'react';

interface UseTypingAnimationOptions {
  speed?: number; // ms per word
  onComplete?: () => void;
}

export const useTypingAnimation = (
  text: string,
  isAnimating: boolean,
  options: UseTypingAnimationOptions = {}
) => {
  const { speed = 30, onComplete } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isAnimating) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    const words = text.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(prev => {
          const newText = prev + (prev ? ' ' : '') + words[currentIndex];
          return newText;
        });
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isAnimating, speed, onComplete]);

  const skipAnimation = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
  }, [text]);

  return { displayedText, isComplete, skipAnimation };
};
