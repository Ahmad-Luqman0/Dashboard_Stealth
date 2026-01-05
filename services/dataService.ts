
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

  async getUserActivityBreakdown(range: string = 'yesterday', shift?: string) {
    try {
        const shiftParam = shift ? `&shift=${shift}` : '';
        const response = await fetch(`${API_BASE}/summary/user-breakdown?range=${range}${shiftParam}`);
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

  async getDashboardData(range: string, shift?: string, userId?: string | number) {
    try {
      const shiftParam = shift ? `&shift=${shift}` : '';
      const userParam = userId ? `&user=${userId}` : '';
      const response = await fetch(`${API_BASE}/dashboard?range=${range}${shiftParam}${userParam}`);
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
}

export const db = new DataService();
