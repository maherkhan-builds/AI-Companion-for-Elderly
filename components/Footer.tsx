import React from 'react';
import { Page } from '../types';

interface FooterProps {
  onPageChange: (page: Page) => void;
  currentPage: Page;
}

const Footer: React.FC<FooterProps> = ({ onPageChange, currentPage }) => {
  const navItems = [
    { label: 'Chat', page: Page.Chat, icon: '💬' },
    { label: 'Reminders', page: Page.Reminders, icon: '⏰' },
    { label: 'Fun', page: Page.Entertainment, icon: '🎉' },
    { label: 'Family', page: Page.FamilyConnect, icon: '👨‍👩‍👧‍👦' },
  ];

  return (
    <footer className="w-full bg-blue-700 text-white p-2 shadow-lg sticky bottom-0 z-10">
      <nav className="container mx-auto flex justify-around items-center h-full">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => onPageChange(item.page)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-lg sm:text-xl font-semibold transition-colors duration-200
              ${currentPage === item.page ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-600 hover:text-white'}`}
            aria-current={currentPage === item.page ? 'page' : undefined}
          >
            <span className="text-3xl sm:text-4xl">{item.icon}</span>
            <span className="mt-1 hidden sm:block">{item.label}</span>
          </button>
        ))}
      </nav>
    </footer>
  );
};

export default Footer;
