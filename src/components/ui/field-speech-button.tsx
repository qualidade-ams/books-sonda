import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { cn } from '@/lib/utils';

interface FieldSpeechButtonProps {
  fieldId: string;
  label: string;
  value: string | number;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const FieldSpeechButton: React.FC<FieldSpeechButtonProps> = ({
  fieldId,
  label,
  value,
  className,
  size = 'sm'
}) => {
  const { speak, stop, isFieldReading, isSupported } = useTextToSpeech();

  if (!isSupported) {
    return null;
  }

  const isReading = isFieldReading(fieldId);
  const displayValue = value?.toString() || 'sem valor preenchido';
  const textToSpeak = `Campo ${label}, valor atual: ${displayValue}`;

  const handleClick = () => {
    if (isReading) {
      stop();
    } else {
      speak(textToSpeak, fieldId);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50",
        isReading && "text-blue-600 bg-blue-50 animate-pulse",
        className
      )}
      onClick={handleClick}
      title={isReading ? "Parar leitura" : "Ler campo"}
    >
      {isReading ? (
        <VolumeX className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
    </Button>
  );
};