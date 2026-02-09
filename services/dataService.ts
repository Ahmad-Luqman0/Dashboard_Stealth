
/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class DataService {

  async validateLogin(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      return data;
    } catch (e) {
      console.error("Login error:", e);
      return { success: false, error: "Connection error" };
    }
  }

  async getSummaryKPIs(range: string, shift?: string, userId?: string | number) {
    try {
      const shiftParam = shift ? `&shift=${shift}` : '';
      const userParam = userId ? `&user=${userId}` : '';
      const response = await fetch(`${API_BASE}/summary/kpis?range=${range}${shiftParam}${userParam}`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  async getTopApps(type: 'productive' | 'unproductive' | 'neutral', range: string = 'yesterday', shift?: string) {
    try {
      const shiftParam = shift ? `&shift=${shift}` : '';
      const response = await fetch(`${API_BASE}/summary/top-apps?type=${type}&range=${range}${shiftParam}`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async getUserActivityStats(range: string = 'yesterday', shift?: string) {
    try {
        const shiftParam = shift ? `&shift=${shift}` : '';
        const response = await fetch(`${API_BASE}/summary/users-activity?range=${range}${shiftParam}`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  }

  async getUserActivityBreakdown(range: string = 'yesterday', shift?: string, userId?: string | number) {
    try {
        const shiftParam = shift ? `&shift=${shift}` : '';
        const userParam = userId ? `&user=${userId}` : '';
        const response = await fetch(`${API_BASE}/summary/user-breakdown?range=${range}${shiftParam}${userParam}`);
        return await response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  }

  async getChartData(range: string = 'yesterday', shift?: string) {
      try {
          const shiftParam = shift ? `&shift=${shift}` : '';
          const response = await fetch(`${API_BASE}/summary/charts?range=${range}${shiftParam}`);
          return await response.json();
      } catch (e) {
          console.error(e);
          return { unproductive: [], trends: [] };
      }
  } 

  async getDashboardData(range: string, shift?: string, userId?: string | number, timezone?: string) {
    try {
      const shiftParam = shift ? `&shift=${shift}` : '';
      const userParam = userId ? `&user=${userId}` : '';
      const tzParam = timezone ? `&timezone=${encodeURIComponent(timezone)}` : '';
      const response = await fetch(`${API_BASE}/dashboard?range=${range}${shiftParam}${userParam}${tzParam}`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async getShifts() {
      try {
          const response = await fetch(`${API_BASE}/shifts`);
          return await response.json();
      } catch (e) {
          console.error(e);
          return [];
      }
  }

  async getDashboardUsers() {
    try {
      const response = await fetch(`${API_BASE}/dashboard-users`);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addDashboardUser(user: any) {
    try {
      const response = await fetch(`${API_BASE}/dashboard-users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      const data = await response.json();
      return data;
    } catch (e) {
        console.error(e);
        return { error: 'Connection failure' };
    }
  }

  async updateDashboardUser(id: number | string, data: any) {
    try {
        const response = await fetch(`${API_BASE}/dashboard-users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (e) {
        console.error(e);
        return { error: 'Connection failure' };
    }
  }

  async deleteDashboardUser(id: number | string) {
    try {
        const response = await fetch(`${API_BASE}/dashboard-users/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (e) {
        console.error(e);
        return { error: 'Connection failure' };
    }
  }

  async getUsers() {
    try {
      const response = await fetch(`${API_BASE}/users`);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async getDeviceMappings() {
    try {
      const response = await fetch(`${API_BASE}/device-mappings`);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addDeviceMapping(mapping: { user_id: number; device_id: string; ip_address?: string }) {
    try {
      const response = await fetch(`${API_BASE}/device-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async deleteDeviceMapping(id: number | string) {
    try {
      const response = await fetch(`${API_BASE}/device-mappings/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async getUnregisteredSessions() {
    try {
      const response = await fetch(`${API_BASE}/unregistered-sessions`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async registerUserFromSession(data: { name: string; email: string; phone?: string; usertype_id: number; session_id: string; device_id?: string; windows_username?: string }) {
    try {
      const response = await fetch(`${API_BASE}/register-user-from-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async mapUserToSession(data: { user_id: number; session_id: string; device_id?: string; windows_username?: string }) {
    try {
      const response = await fetch(`${API_BASE}/map-user-to-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async getWindowsUsernameMappings() {
    try {
      const response = await fetch(`${API_BASE}/windows-username-mappings`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addWindowsUsernameMapping(mapping: { user_id: number; windows_username: string }) {
    try {
      const response = await fetch(`${API_BASE}/windows-username-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async deleteWindowsUsernameMapping(id: number | string) {
    try {
      const response = await fetch(`${API_BASE}/windows-username-mappings/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { error: 'Connection failure' };
    }
  }

  async getUserTypes() {
    try {
      const response = await fetch(`${API_BASE}/usertypes`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }


  async getUserTimeline(userId: string | number, range: string, timezone: string = 'UTC') {
    try {
      const response = await fetch(`${API_BASE}/user-timeline?user=${userId}&range=${range}&timezone=${encodeURIComponent(timezone)}`);
      return await response.json();
    } catch (e) {
      console.error(e);
      return { sessions: [], summary: null };
    }
  }
}

export const db = new DataService();
