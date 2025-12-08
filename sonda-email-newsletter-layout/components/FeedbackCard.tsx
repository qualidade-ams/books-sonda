import React from 'react';
import { FeedbackItem } from '../types';

interface FeedbackCardProps {
  item: FeedbackItem;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ item }) => {
  return (
    <div className="flex flex-col h-full text-left p-2">
      <h3 className="text-[#0066FF] font-bold text-sm mb-4 uppercase leading-snug">
        {item.name}
      </h3>
      
      <div className="flex-grow mb-4">
        {item.feedback.map((text, index) => (
          <p key={index} className="text-gray-800 text-xs mb-2 leading-relaxed">
            {text}
          </p>
        ))}
      </div>
      
      <div className="mt-auto">
        <p className="text-xs text-black font-bold">
          Cliente: <span className="font-bold">{item.client}</span>
        </p>
        <p className="text-xs text-black font-bold">
          Empresa: <span className="font-bold">{item.company}</span>
        </p>
      </div>
    </div>
  );
};

export default FeedbackCard;