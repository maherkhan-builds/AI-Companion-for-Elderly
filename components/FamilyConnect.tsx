import React, { useState, useCallback } from 'react';
import { generateTextResponse } from '../services/geminiService';

interface FamilyMember {
  name: string;
  relation: string;
  lastMessage?: string;
}

const familyMembers: FamilyMember[] = [
  { name: 'Sarah', relation: 'Granddaughter', lastMessage: 'Just checking in! Hope you are having a wonderful day.' },
  { name: 'David', relation: 'Son', lastMessage: 'Hey Mom, don\'t forget our video call on Sunday at 2 PM. Love you!' },
  { name: 'Emily', relation: 'Daughter-in-law' },
];

const FamilyConnect: React.FC = () => {
  const [callingMember, setCallingMember] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCallFamily = useCallback(async (member: FamilyMember) => {
    setCallingMember(member.name);
    setResponseMessage(null);
    setError(null);
    setIsLoading(true);

    try {
      // Simulate an AI response for calling
      const aiResponse = await generateTextResponse(`Simulate a response for calling ${member.name}, your ${member.relation}.`);
      setResponseMessage(`Connecting with ${member.name}... ${aiResponse}`);
      // In a real application, this would trigger an actual communication method (video call, voice call)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setCallingMember(null), 3000); // Clear calling status after a few seconds
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 py-6">
      <h1 className="text-4xl font-extrabold text-orange-800 mb-8">Family Connections</h1>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mb-6">
        <h2 className="text-2xl font-bold mb-4 text-orange-700">Messages from Family</h2>
        <div className="space-y-4">
          {familyMembers.some(m => m.lastMessage) ? (
            familyMembers.map((member) => member.lastMessage && (
              <div key={member.name} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-300">
                <p className="text-lg font-semibold text-orange-800">{member.name} ({member.relation}):</p>
                <p className="text-md text-gray-700 mt-1">{member.lastMessage}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 text-lg">No recent messages.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-blue-700">Call a Family Member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {familyMembers.map((member) => (
            <button
              key={member.name}
              onClick={() => handleCallFamily(member)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg shadow-md text-xl font-semibold transition duration-300
                ${callingMember === member.name ? 'bg-blue-200 text-blue-800 ring-4 ring-blue-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <img
                src={`https://picsum.photos/60/60?random=${member.name.charCodeAt(0)}`}
                alt={`${member.name}'s profile`}
                className="w-16 h-16 rounded-full mb-2 object-cover border-2 border-blue-500"
              />
              {member.name} ({member.relation})
            </button>
          ))}
        </div>
        {callingMember && (
          <p className="mt-6 text-center text-xl font-medium text-blue-600">
            {isLoading ? 'Initiating call...' : responseMessage}
          </p>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6" role="alert">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyConnect;
