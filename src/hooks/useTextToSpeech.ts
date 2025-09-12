import { useState, useRef, useCallback } from 'react';

interface UseTextToSpeechProps {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = (props: UseTextToSpeechProps = {}) => {
  const [isSupported, setIsSupported] = useState(() => 'speechSynthesis' in window);
  const [isReading, setIsReading] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, fieldId: string) => {
    if (!isSupported || !text.trim()) return;

    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = props.rate || 0.9;
    utterance.pitch = props.pitch || 1;
    utterance.volume = props.volume || 1;

    utterance.onstart = () => {
      setIsReading(true);
      setCurrentFieldId(fieldId);
    };

    utterance.onend = () => {
      setIsReading(false);
      setCurrentFieldId(null);
    };

    utterance.onerror = () => {
      setIsReading(false);
      setCurrentFieldId(null);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSupported, props.rate, props.pitch, props.volume]);

  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsReading(false);
      setCurrentFieldId(null);
    }
  }, []);

  const isFieldReading = useCallback((fieldId: string) => {
    return isReading && currentFieldId === fieldId;
  }, [isReading, currentFieldId]);

  return {
    speak,
    stop,
    isReading,
    isSupported,
    isFieldReading,
    currentFieldId
  };
};