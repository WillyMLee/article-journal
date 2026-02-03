import { useState, useEffect } from 'react';
import { Brain, CheckCircle2 } from 'lucide-react';
import { ChatChoice } from '../types';

interface TypedMessageProps {
  content: string;
  isAnimating?: boolean;
  thinkingSteps?: string[];
  choices?: ChatChoice[];
  onChoiceSelect?: (choice: ChatChoice) => void;
  onAnimationComplete?: () => void;
}

export const TypedMessage = ({
  content,
  isAnimating = false,
  thinkingSteps,
  choices,
  onChoiceSelect,
  onAnimationComplete,
}: TypedMessageProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentThinkingStep, setCurrentThinkingStep] = useState(0);
  const [showThinking, setShowThinking] = useState(true);
  const [isComplete, setIsComplete] = useState(!isAnimating);

  // Animate thinking steps
  useEffect(() => {
    if (!thinkingSteps || thinkingSteps.length === 0 || !isAnimating) {
      setShowThinking(false);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentThinkingStep(prev => {
        if (prev < thinkingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setTimeout(() => setShowThinking(false), 500);
          return prev;
        }
      });
    }, 800);

    return () => clearInterval(stepInterval);
  }, [thinkingSteps, isAnimating]);

  // Animate content word by word
  useEffect(() => {
    if (!isAnimating || showThinking) {
      if (!isAnimating) {
        setDisplayedContent(content);
        setIsComplete(true);
      }
      return;
    }

    setDisplayedContent('');
    const words = content.split(' ');
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        setDisplayedContent(prev => 
          prev + (prev ? ' ' : '') + words[wordIndex]
        );
        wordIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onAnimationComplete?.();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [content, isAnimating, showThinking, onAnimationComplete]);

  return (
    <div className="space-y-3">
      {/* Thinking Steps */}
      {showThinking && thinkingSteps && thinkingSteps.length > 0 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Brain size={14} className="animate-pulse text-purple-500" />
            <span className="font-medium">Thinking...</span>
          </div>
          <div className="pl-5 space-y-1.5 border-l-2 border-purple-200">
            {thinkingSteps.slice(0, currentThinkingStep + 1).map((step, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 text-xs transition-all duration-300 ${
                  index === currentThinkingStep ? 'text-purple-600 font-medium' : 'text-slate-400'
                }`}
              >
                <CheckCircle2 
                  size={12} 
                  className={index <= currentThinkingStep ? 'text-purple-500' : 'text-slate-300'} 
                />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showThinking && (
        <div className="animate-fadeIn">
          <p className="whitespace-pre-wrap leading-relaxed">
            {displayedContent}
            {!isComplete && <span className="animate-pulse">▊</span>}
          </p>
        </div>
      )}

      {/* Interactive Choices - VS Code Claude style */}
      {isComplete && choices && choices.length > 0 && (
        <div className="mt-3 animate-slideIn">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onChoiceSelect?.(choice)}
                className="group w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 flex items-start gap-2"
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 group-hover:border-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-blue-600 group-hover:text-blue-700 text-xs font-medium">
                    {choice.label}
                  </p>
                  {choice.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {choice.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">Click to select</p>
        </div>
      )}
    </div>
  );
};
