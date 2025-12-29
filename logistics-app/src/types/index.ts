export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'driver' | 'staff' | 'customer';
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  sender: string;
  recipient: string;
  origin: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'cancelled';
  estimatedDelivery: string;
  actualDelivery?: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  price: number;
  driverId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string;
  status: 'available' | 'on-delivery' | 'offline';
  currentLocation?: string;
  assignedShipments: string[];
  rating?: number;
  totalDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  shipmentId: string;
  driverId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  pickupTime?: string;
  deliveryTime?: string;
  signature?: string;
  proofOfDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRule {
  id: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  pricePerKg: number;
  minPrice: number;
  maxPrice: number;
  zones: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}