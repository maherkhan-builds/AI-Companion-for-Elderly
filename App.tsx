import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatInterface from './components/ChatInterface';
import ReminderList from './components/ReminderList';
import EntertainmentCard from './components/EntertainmentCard';
import FamilyConnect from './components/FamilyConnect';
import { Page } from './types';
import { GoogleGenAI } from '@google/genai';
import { API_KEY_BILLING_LINK } from './constants';

function App(): React.FC {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Chat);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const checkApiKey = useCallback(async () => {
    try {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
        if (!selected) {
          setApiKeyError('Please select a paid API key to use the advanced AI features.');
        } else {
          setApiKeyError(null);
        }
      } else {
        // Fallback for environments where window.aistudio is not available
        setHasApiKey(true); // Assume API key is configured externally for non-AI Studio environments
        setApiKeyError(null);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setApiKeyError('Failed to check API key status. Please ensure your environment is configured correctly.');
      setHasApiKey(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume success, checkApiKey will confirm if needed.
        setHasApiKey(true);
        setApiKeyError(null);
      } catch (error) {
        console.error('Error opening API key selection:', error);
        setApiKeyError('Failed to open API key selection. Please try again.');
        setHasApiKey(false);
      }
    } else {
      alert('API key selection not available in this environment. Please ensure process.env.API_KEY is set.');
      setApiKeyError('API key selection not available. Please ensure process.env.API_KEY is set.');
      setHasApiKey(false); // Indicate that API key is not ready if not using AI Studio flow
    }
  }, []);

  const renderContent = () => {
    if (!hasApiKey) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center text-red-700 bg-red-100 rounded-lg shadow-md max-w-lg mx-auto mt-10">
          <p className="text-xl font-semibold mb-4">API Key Required</p>
          <p className="text-lg mb-6">{apiKeyError || 'A valid API key is required to use this application.'}</p>
          <button
            onClick={handleSelectApiKey}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300"
          >
            Select API Key
          </button>
          <p className="text-sm mt-4 text-gray-600">
            Learn more about billing for the Gemini API:
            <a href={API_KEY_BILLING_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              ai.google.dev/gemini-api/docs/billing
            </a>
          </p>
        </div>
      );
    }

    switch (currentPage) {
      case Page.Chat:
        return <ChatInterface />;
      case Page.Reminders:
        return <ReminderList />;
      case Page.Entertainment:
        return <EntertainmentCard />;
      case Page.FamilyConnect:
        return <FamilyConnect />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        {renderContent()}
      </main>
      <Footer onPageChange={setCurrentPage} currentPage={currentPage} />
    </div>
  );
}

export default App;