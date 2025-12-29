import { getAuthToken } from '@/utils/auth';
import { User, Shipment, Driver, Delivery } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.message || 'API request failed', response.status);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError('Network error or server unavailable', 500);
  }
};

// Authentication API calls
export const authApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData: { name: string; email: string; password: string }) => {
    return apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  me: async () => {
    return apiRequest<{ user: User }>('/auth/me');
  },
};

// Shipments API calls
export const shipmentsApi = {
  getAll: async () => {
    return apiRequest<{ shipments: Shipment[] }>('/shipments');
  },

  getById: async (id: string) => {
    return apiRequest<{ shipment: Shipment }>(`/shipments/${id}`);
  },

  create: async (shipmentData: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt' | 'trackingNumber'>) => {
    return apiRequest<{ shipment: Shipment }>('/shipments', {
      method: 'POST',
      body: JSON.stringify(shipmentData),
    });
  },

  update: async (id: string, shipmentData: Partial<Shipment>) => {
    return apiRequest<{ shipment: Shipment }>(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shipmentData),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/shipments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Drivers API calls
export const driversApi = {
  getAll: async () => {
    return apiRequest<{ drivers: Driver[] }>('/drivers');
  },

  getById: async (id: string) => {
    return apiRequest<{ driver: Driver }>(`/drivers/${id}`);
  },

  create: async (driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'totalDeliveries'>) => {
    return apiRequest<{ driver: Driver }>('/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
  },

  update: async (id: string, driverData: Partial<Driver>) => {
    return apiRequest<{ driver: Driver }>(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(driverData),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/drivers/${id}`, {
      method: 'DELETE',
    });
  },
};

// Deliveries API calls
export const deliveriesApi = {
  getAll: async () => {
    return apiRequest<{ deliveries: Delivery[] }>('/deliveries');
  },

  getById: async (id: string) => {
    return apiRequest<{ delivery: Delivery }>(`/deliveries/${id}`);
  },

  create: async (deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>) => {
    return apiRequest<{ delivery: Delivery }>('/deliveries', {
      method: 'POST',
      body: JSON.stringify(deliveryData),
    });
  },

  update: async (id: string, deliveryData: Partial<Delivery>) => {
    return apiRequest<{ delivery: Delivery }>(`/deliveries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deliveryData),
    });
  },
};