import React, { createContext, useContext, useState, useEffect } from 'react';
import { EventService, DEFAULT_EVENT_CONFIG } from '../services/eventService';
import type { EventConfig } from '../types';

interface EventContextValue {
  eventConfig: EventConfig;
  updateEventConfig: (updates: Partial<EventConfig>) => Promise<EventConfig>;
  deleteSession: (options?: {
    deleteTeams?: boolean;
    deleteSelections?: boolean;
    deleteProblems?: boolean;
    reason?: string;
  }) => Promise<{ success: boolean; message: string }>;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => EventService.getEventConfig());

  useEffect(() => {
    const unsubscribe = EventService.subscribeToEvent((config) => {
      setEventConfig(config);
    });
    return () => unsubscribe();
  }, []);

  const updateEventConfig = async (updates: Partial<EventConfig>): Promise<EventConfig> => {
    const updated = await EventService.updateEventConfig(updates);
    setEventConfig(updated);
    return updated;
  };

  const deleteSession = async (options?: {
    deleteTeams?: boolean;
    deleteSelections?: boolean;
    deleteProblems?: boolean;
    reason?: string;
  }) => {
    const res = await EventService.deleteSession(options);
    return res;
  };

  return (
    <EventContext.Provider value={{ eventConfig, updateEventConfig, deleteSession }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = (): EventContextValue => {
  const context = useContext(EventContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      eventConfig: DEFAULT_EVENT_CONFIG,
      updateEventConfig: async (u) => EventService.updateEventConfig(u),
      deleteSession: async (o) => EventService.deleteSession(o),
    };
  }
  return context;
};
