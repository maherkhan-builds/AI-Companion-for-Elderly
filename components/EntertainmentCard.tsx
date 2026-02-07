import React, { useState, useCallback } from 'react';
import { generateStory, generateFunFact, generateTextResponse } from '../services/geminiService';

const EntertainmentCard: React.FC = () => {
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storyTopic, setStoryTopic] = useState<string>('');

  const handleGenerateStory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOutput('');
    try {
      const response = await generateStory(storyTopic);
      setOutput(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story.');
    } finally {
      setIsLoading(false);
    }
  }, [storyTopic]);

  const handleGenerateFunFact = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOutput('');
    try {
      const response = await generateFunFact();
      setOutput(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate fun fact.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setOutput('');
    setError(null);
    setStoryTopic('');
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 py-6">
      <h1 className="text-4xl font-extrabold text-purple-800 mb-8">Enjoy and Relax!</h1>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mb-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-700">Generate a Story</h2>
        <div className="mb-4">
          <label htmlFor="story-topic" className="block text-lg font-medium text-gray-700 mb-2">
            Tell me about... (optional)
          </label>
          <input
            type="text"
            id="story-topic"
            value={storyTopic}
            onChange={(e) => setStoryTopic(e.target.value)}
            placeholder="e.g., a kind old cat, a peaceful garden"
            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm text-lg focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <button
          onClick={handleGenerateStory}
          className="w-full bg-purple-600 text-white p-3 rounded-md text-xl font-semibold hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition duration-300"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Tell Me a Story'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mb-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">Get a Fun Fact</h2>
        <button
          onClick={handleGenerateFunFact}
          className="w-full bg-green-600 text-white p-3 rounded-md text-xl font-semibold hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition duration-300"
          disabled={isLoading}
        >
          {isLoading ? 'Thinking...' : 'Tell Me a Fun Fact'}
        </button>
      </div>

      {output && (
        <div className="bg-blue-50 p-6 rounded-lg shadow-inner mt-6 w-full max-w-md">
          <h3 className="text-xl font-bold text-blue-800 mb-3">Your Content:</h3>
          <p className="text-lg text-gray-800 leading-relaxed">{output}</p>
          <button
            onClick={handleClear}
            className="mt-4 bg-gray-300 text-gray-800 p-2 rounded-md text-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6 w-full max-w-md" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
    </div>
  );
};

export default EntertainmentCard;
