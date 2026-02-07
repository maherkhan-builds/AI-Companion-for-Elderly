import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Reminder } from '../types';
import { startLiveConversation, generateTextResponse } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid'; // For unique message IDs

interface ReminderListProps {
  onAddReminder: (reminder: Reminder) => void;
  onRemoveReminder: (id: string) => void;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInputTranscription, setCurrentInputTranscription] = useState<string>('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<{ session: any; stop: () => void } | null>(null);

  // --- Mock Reminder and Family Connect Logic ---
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [familyMessages, setFamilyMessages] = useState<string[]>([
    'Grandma, just checking in! Hope you are having a wonderful day. - Sarah',
    'Hey Mom, don\'t forget our video call on Sunday at 2 PM. Love you! - David',
  ]);

  const addReminder = useCallback((reminder: Omit<Reminder, 'id'>) => {
    setReminders(prev => [...prev, { id: uuidv4(), ...reminder }]);
    console.log('Reminder added:', reminder);
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    console.log('Reminder removed:', id);
  }, []);

  const callFamilyMember = useCallback((name: string) => {
    // Simulate calling a family member
    const messageId = uuidv4();
    setMessages(prev => [...prev, {
      id: messageId,
      sender: 'ai',
      text: `Connecting you with ${name}... (Simulated call)`
    }]);
    console.log(`Simulating call to ${name}`);
  }, []);
  // --- End Mock Logic ---

  const handleNewMessage = useCallback((text: string, sender: 'user' | 'ai', audioUrl?: string) => {
    setMessages(prevMessages => {
      const newMessage: ChatMessage = {
        id: uuidv4(),
        sender,
        text,
        audioUrl,
      };
      return [...prevMessages, newMessage];
    });
  }, []);

  const onAiMessage = useCallback((text: string, audioUrl?: string) => {
    if (text) {
      handleNewMessage(text, 'ai', audioUrl);
    }
  }, [handleNewMessage]);

  const onTranscription = useCallback((type: 'user' | 'ai', text: string) => {
    if (type === 'user') {
      setCurrentInputTranscription(text);
      if (!isSpeaking) { // Only add to chat history if AI isn't speaking over it
        handleNewMessage(text, 'user');
      }
    } else {
      setCurrentOutputTranscription(text);
    }
  }, [handleNewMessage, isSpeaking]);

  const onFunctionCall = useCallback(async (name: string, args: Record<string, unknown>, id: string): Promise<string> => {
    let result = "ok";
    const functionCallMessageId = uuidv4();
    let displayMessage = '';

    switch (name) {
      case 'setReminder':
        const reminder = args as Omit<Reminder, 'id'>;
        addReminder(reminder);
        displayMessage = `OK, I've set a reminder for ${reminder.time} to "${reminder.message}".`;
        break;
      case 'getNewsHeadline':
        const topic = args.topic as string;
        displayMessage = `Let me check for news headlines on ${topic}. (Simulated)`;
        // In a real app, you would fetch news here
        // For now, generate a text response
        const newsResponse = await generateTextResponse(`Give me a simple news headline about ${topic}.`);
        displayMessage = `Here's a headline about ${topic}: ${newsResponse}`;
        break;
      case 'playMusic':
        const query = args.query as string;
        displayMessage = `Playing music by ${query}. Enjoy! (Simulated)`;
        // In a real app, you would integrate with a music service
        break;
      case 'callFamilyMember':
        const familyMemberName = args.name as string;
        callFamilyMember(familyMemberName);
        displayMessage = `Attempting to call ${familyMemberName} now.`;
        break;
      default:
        displayMessage = `I received a request to use an unknown function: ${name}.`;
        result = `Unknown function: ${name}`;
    }

    setMessages(prev => [...prev, { id: functionCallMessageId, sender: 'ai', text: displayMessage }]);
    return result;
  }, [addReminder, callFamilyMember, handleNewMessage]);

  const handleToggleListening = useCallback(async () => {
    if (isListening) {
      liveSessionRef.current?.stop();
      liveSessionRef.current = null;
      setIsListening(false);
      setIsLoading(false);
      setCurrentInputTranscription('');
      setCurrentOutputTranscription('');
    } else {
      setError(null);
      setIsLoading(true);
      try {
        const sessionControl = await startLiveConversation(
          onAiMessage,
          onTranscription,
          onFunctionCall,
          (err) => {
            setError(err);
            setIsLoading(false);
            setIsListening(false);
          },
          () => {
            setIsListening(true);
            setIsLoading(false);
            console.log("Live session opened.");
          },
          () => {
            setIsListening(false);
            setIsLoading(false);
            console.log("Live session closed.");
          },
          () => {
            setIsSpeaking(true); // AI is speaking
          }
        );
        liveSessionRef.current = sessionControl;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
        setIsListening(false);
      }
    }
  }, [isListening, onAiMessage, onTranscription, onFunctionCall]);

  useEffect(() => {
    // Scroll to bottom of chat
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentInputTranscription, currentOutputTranscription]);

  useEffect(() => {
    // Clean up live session on component unmount
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex flex-col w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden h-[80vh] sm:h-[85vh] md:h-[75vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
        {messages.length === 0 && !isLoading && !isListening && (
          <div className="text-center text-gray-500 text-xl py-8">
            <p>Welcome! Tap the microphone to start talking.</p>
            <p className="text-lg mt-2">I can help with reminders, news, music, and connecting with family.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg text-lg ${
                msg.sender === 'user'
                  ? 'bg-blue-100 text-blue-800 self-end'
                  : 'bg-gray-100 text-gray-800 self-start'
              }`}
            >
              {msg.text}
              {msg.audioUrl && msg.sender === 'ai' && (
                <audio src={msg.audioUrl} controls className="mt-2 w-full"></audio>
              )}
            </div>
          </div>
        ))}
        {(currentInputTranscription || currentOutputTranscription) && (
          <div className="text-center text-gray-600 text-lg p-2 bg-gray-50 rounded-lg">
            {currentInputTranscription && <p className="font-semibold text-blue-700">You: {currentInputTranscription}</p>}
            {currentOutputTranscription && <p className="font-semibold text-gray-700">AI: {currentOutputTranscription}</p>}
          </div>
        )}
        {isLoading && (
          <div className="text-center text-blue-600 text-lg mt-4">
            <p>Loading AI...</p>
          </div>
        )}
        {error && (
          <div className="text-center text-red-600 text-lg mt-4">
            <p>Error: {error}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-center items-center">
        <button
          onClick={handleToggleListening}
          className={`flex items-center justify-center w-24 h-24 rounded-full shadow-lg transition-all duration-300
            ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}
            ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={isLoading}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isLoading ? (
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              className="h-12 w-12 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 00-3-3H7zm2 14v-2.006a8.95 8.95 0 004.88-.952A9.008 9.008 0 0018 10a2 2 0 00-4 0c0 2.226-.857 4.25-2.296 5.867A7.005 7.005 0 017 18.001v2H5a1 1 0 100 2h10a1 1 0 100-2H9z"
                clipRule="evenodd"
              ></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
