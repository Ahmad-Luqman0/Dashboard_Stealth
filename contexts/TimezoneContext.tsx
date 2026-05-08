import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

// Generate timezone options dynamically from all available IANA timezones
const generateTimezoneOptions = () => {
  try {
    // Get all available timezones from Intl API
    const timezones = Intl.supportedValuesOf('timeZone');
    const now = new Date();
    
    return timezones.map(tz => {
      // Get the current UTC offset for this timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset'
      });
      
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find(p => p.type === 'timeZoneName');
      const offsetStr = offsetPart?.value || 'GMT';
      
      // Parse offset string (e.g., "GMT+5:30" or "GMT-8") to minutes for sorting
      let offsetMinutes = 0;
      const offsetMatch = offsetStr.match(/GMT([+-])?(\d+)?:?(\d+)?/);
      if (offsetMatch) {
        const sign = offsetMatch[1] === '-' ? -1 : 1;
        const hours = parseInt(offsetMatch[2] || '0');
        const mins = parseInt(offsetMatch[3] || '0');
        offsetMinutes = sign * (hours * 60 + mins);
      }
      
      // Create a readable label: "America/New_York (GMT-5)"
      const displayName = tz.replace(/_/g, ' ');
      
      return {
        value: tz,
        label: `${displayName} (${offsetStr})`,
        offsetMinutes
      };
    })
    // Sort by offset (UTC-12 to UTC+14)
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes);
  } catch (e) {
    // Fallback for older browsers that don't support supportedValuesOf
    return [
      { value: 'UTC', label: 'UTC (GMT+0)' },
      { value: 'America/New_York', label: 'America/New York (GMT-5)' },
      { value: 'America/Chicago', label: 'America/Chicago (GMT-6)' },
      { value: 'America/Denver', label: 'America/Denver (GMT-7)' },
      { value: 'America/Los_Angeles', label: 'America/Los Angeles (GMT-8)' },
      { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
      { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
      { value: 'Europe/Berlin', label: 'Europe/Berlin (GMT+1)' },
      { value: 'Europe/Istanbul', label: 'Europe/Istanbul (GMT+3)' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
      { value: 'Asia/Karachi', label: 'Asia/Karachi (GMT+5)' },
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
      { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' },
      { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' },
      { value: 'Asia/Shanghai', label: 'Asia/Shanghai (GMT+8)' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+11)' },
      { value: 'Pacific/Auckland', label: 'Pacific/Auckland (GMT+13)' },
    ];
  }
};

export const TIMEZONE_OPTIONS = generateTimezoneOptions();

interface TimezoneContextType {
  timezone: string;
  setTimezone: (tz: string) => void;
  convertToTimezone: (utcDateString: string | Date) => Date;
  formatTime: (utcDateString: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (utcDateString: string | Date) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

const STORAGE_KEY = 'dashboard_timezone';

// Get browser's default timezone
const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

// Validate if a timezone is valid
const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timezone, setTimezoneState] = useState<string>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isValidTimezone(saved)) {
      return saved;
    }
    // Fallback to browser timezone
    const browserTz = getBrowserTimezone();
    return isValidTimezone(browserTz) ? browserTz : 'UTC';
  });

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    localStorage.setItem(STORAGE_KEY, tz);
  }, []);

  // Convert UTC date string to the selected timezone
  const convertToTimezone = useCallback((utcDateString: string | Date): Date => {
    const date = typeof utcDateString === 'string' ? new Date(utcDateString) : utcDateString;
    return date; // Return the date object, formatting will handle timezone
  }, []);

  // Format time only (e.g., "2:30 PM")
  const formatTime = useCallback((utcDateString: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    if (!utcDateString) return '';
    const date = typeof utcDateString === 'string' ? new Date(utcDateString) : utcDateString;
    if (isNaN(date.getTime())) return '';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
      ...options
    };
    
    return date.toLocaleTimeString('en-US', defaultOptions);
  }, [timezone]);

  // Format full date and time (e.g., "Jan 9, 2026, 2:30 PM")
  const formatDateTime = useCallback((utcDateString: string | Date): string => {
    if (!utcDateString) return '';
    const date = typeof utcDateString === 'string' ? new Date(utcDateString) : utcDateString;
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });
  }, [timezone]);

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, convertToTimezone, formatTime, formatDateTime }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};
