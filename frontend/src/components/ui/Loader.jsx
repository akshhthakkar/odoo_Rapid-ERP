import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ size = 32, padding = '40px 0', style = {} }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding, 
      width: '100%',
      color: 'var(--accent, #FF540E)',
      ...style 
    }}>
      <Loader2 size={size} className="animate-spin" />
    </div>
  );
};

export default Loader;
