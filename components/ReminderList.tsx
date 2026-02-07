import React, { useState, useEffect, useCallback } from 'react';
import { Reminder } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ReminderFormProps {
  onAddReminder: (reminder: Reminder) => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ onAddReminder }) => {
  const [time, setTime] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isMedication, setIsMedication] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (time && message) {
      onAddReminder({
        id: uuidv4(),
        time,
        message,
        isMedication,
        active: true, // Reminders are active by default
      });
      setTime('');
      setMessage('');
      setIsMedication(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md mb-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Add New Reminder</h2>
      <div className="mb-4">
        <label htmlFor="reminder-time" className="block text-lg font-medium text-gray-700 mb-2">
          Time
        </label>
        <input
          type="time"
          id="reminder-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm text-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="reminder-message" className="block text-lg font-medium text-gray-700 mb-2">
          Message
        </label>
        <input
          type="text"
          id="reminder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g., Take medication, Call Sarah"
          className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm text-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div className="mb-6 flex items-center">
        <input
          type="checkbox"
          id="is-medication"
          checked={isMedication}
          onChange={(e) => setIsMedication(e.target.checked)}
          className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="is-medication" className="ml-3 block text-lg text-gray-700">
          Medication Reminder
        </label>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-3 rounded-md text-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-300"
      >
        Add Reminder
      </button>
    </form>
  );
};

const ReminderCard: React.FC<{ reminder: Reminder; onRemove: (id: string) => void }> = ({ reminder, onRemove }) => {
  return (
    <div className={`p-4 rounded-lg shadow-md flex items-center justify-between transition duration-300
      ${reminder.isMedication ? 'bg-red-100 border-l-4 border-red-500' : 'bg-green-100 border-l-4 border-green-500'}`}>
      <div>
        <p className="text-xl font-semibold text-gray-800">{reminder.time}</p>
        <p className="text-lg text-gray-700">{reminder.message}</p>
        {reminder.isMedication && <p className="text-sm text-red-600 font-medium mt-1">Medication</p>}
      </div>
      <button
        onClick={() => onRemove(reminder.id)}
        className="ml-4 p-2 bg-red-500 text-white rounded-full text-lg hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-300"
        aria-label={`Remove reminder: ${reminder.message} at ${reminder.time}`}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

const ReminderList: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: uuidv4(), time: '08:00', message: 'Take morning medication', isMedication: true, active: true },
    { id: uuidv4(), time: '10:30', message: 'Water the plants', isMedication: false, active: true },
    { id: uuidv4(), time: '13:00', message: 'Eat lunch', isMedication: false, active: true },
    { id: uuidv4(), time: '18:00', message: 'Take evening medication', isMedication: true, active: true },
  ]);

  const addReminder = useCallback((newReminder: Reminder) => {
    setReminders((prev) => [...prev, newReminder].sort((a, b) => a.time.localeCompare(b.time)));
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 py-6">
      <h1 className="text-4xl font-extrabold text-blue-800 mb-8">Your Reminders</h1>

      <ReminderForm onAddReminder={addReminder} />

      <div className="w-full max-w-md space-y-4">
        {reminders.length > 0 ? (
          reminders.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} onRemove={removeReminder} />
          ))
        ) : (
          <p className="text-center text-gray-600 text-xl">No reminders set. Add one above!</p>
        )}
      </div>
    </div>
  );
};

export default ReminderList;
