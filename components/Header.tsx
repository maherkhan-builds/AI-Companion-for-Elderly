import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-blue-700 text-white p-4 shadow-lg sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="sr-only">Eldercare AI Companion - </span>Your Companion
        </h1>
        {/* Potentially add user profile or settings icon here */}
        {/* For now, keeping it simple as per instructions */}
      </div>
    </header>
  );
};

export default Header;
