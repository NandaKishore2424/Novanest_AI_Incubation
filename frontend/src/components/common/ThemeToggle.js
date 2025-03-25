import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  return (
    <button 
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-16 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 bg-slate-200 dark-mode:bg-slate-700"
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle dark/light mode</span>
      
      {/* Sun icon */}
      <span 
        className={`absolute inset-0 flex items-center justify-start pl-2 transition-opacity ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </span>
      
      {/* Moon icon */}
      <span 
        className={`absolute inset-0 flex items-center justify-end pr-2 transition-opacity ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-200" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>
      
      {/* Toggle knob */}
      <motion.span 
        className="pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0"
        animate={{ 
          x: theme === 'dark' ? 8 : 0 
        }}
        transition={{ 
          type: "spring", 
          stiffness: 700, 
          damping: 30 
        }}
      />
    </button>
  );
};

export default ThemeToggle;