'use client';

import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto p-4">
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect happens in useEffect
  }

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'driver':
        return <DriverDashboard />;
      case 'staff':
        return <StaffDashboard />;
      default:
        return <CustomerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        {renderDashboard()}
      </main>
    </div>
  );
}

const AdminDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <DashboardCard 
      title="Total Shipments" 
      value="1,234" 
      change="+12% from last month"
      color="bg-blue-500"
    />
    <DashboardCard 
      title="Active Drivers" 
      value="45" 
      change="+3 from last week"
      color="bg-green-500"
    />
    <DashboardCard 
      title="Revenue" 
      value="$45,678" 
      change="+18% from last month"
      color="bg-purple-500"
    />
    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Recent Shipments</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Delivery</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-6 py-4 whitespace-nowrap">LGS123456789</td>
            <td className="px-6 py-4 whitespace-nowrap">In Transit</td>
            <td className="px-6 py-4 whitespace-nowrap">New York, NY</td>
            <td className="px-6 py-4 whitespace-nowrap">2023-06-15</td>
          </tr>
          <tr>
            <td className="px-6 py-4 whitespace-nowrap">LGS987654321</td>
            <td className="px-6 py-4 whitespace-nowrap">Delivered</td>
            <td className="px-6 py-4 whitespace-nowrap">Los Angeles, CA</td>
            <td className="px-6 py-4 whitespace-nowrap">2023-06-10</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="space-y-4">
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
          Create New Shipment
        </button>
        <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
          Assign Driver
        </button>
        <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded">
          Manage Pricing
        </button>
      </div>
    </div>
  </div>
);

const DriverDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <DashboardCard 
      title="Assignments Today" 
      value="8" 
      change="3 pending, 5 completed"
      color="bg-blue-500"
    />
    <DashboardCard 
      title="Earnings Today" 
      value="$245.50" 
      change="+$45 from yesterday"
      color="bg-green-500"
    />
    <DashboardCard 
      title="Rating" 
      value="4.8" 
      change="Based on 24 reviews"
      color="bg-yellow-500"
    />
    <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Today's Assignments</h2>
      <div className="space-y-4">
        <AssignmentCard 
          id="LGS123456789" 
          destination="123 Main St, New York, NY" 
          status="Pending Pickup" 
          priority="High"
        />
        <AssignmentCard 
          id="LGS987654321" 
          destination="456 Oak Ave, Boston, MA" 
          status="In Transit" 
          priority="Normal"
        />
        <AssignmentCard 
          id="LGS456789123" 
          destination="789 Pine Rd, Philadelphia, PA" 
          status="Ready for Delivery" 
          priority="High"
        />
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="space-y-4">
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
          Mark as Available
        </button>
        <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
          Update Location
        </button>
        <button className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded">
          Complete Assignment
        </button>
      </div>
    </div>
  </div>
);

const StaffDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <DashboardCard 
      title="Shipments Today" 
      value="45" 
      change="+5 from yesterday"
      color="bg-blue-500"
    />
    <DashboardCard 
      title="Delivered Today" 
      value="38" 
      change="84% success rate"
      color="bg-green-500"
    />
    <DashboardCard 
      title="Pending Issues" 
      value="2" 
      change="All resolved today"
      color="bg-yellow-500"
    />
    <div className="md:col-span-3 bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Recent Shipments</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking #</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <tr>
            <td className="px-6 py-4 whitespace-nowrap">LGS123456789</td>
            <td className="px-6 py-4 whitespace-nowrap">John Smith</td>
            <td className="px-6 py-4 whitespace-nowrap">New York, NY</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                In Transit
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
              <button className="text-green-600 hover:text-green-900">Track</button>
            </td>
          </tr>
          <tr>
            <td className="px-6 py-4 whitespace-nowrap">LGS987654321</td>
            <td className="px-6 py-4 whitespace-nowrap">Jane Doe</td>
            <td className="px-6 py-4 whitespace-nowrap">Los Angeles, CA</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Delivered
              </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
              <button className="text-green-600 hover:text-green-900">Track</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const CustomerDashboard = () => (
  <div className="grid grid-cols-1 gap-6">
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Your Shipments</h2>
      <div className="space-y-4">
        <ShipmentCard 
          id="LGS123456789" 
          destination="New York, NY" 
          status="In Transit" 
          estimatedDelivery="2023-06-15"
          progress={75}
        />
        <ShipmentCard 
          id="LGS987654321" 
          destination="Los Angeles, CA" 
          status="Delivered" 
          estimatedDelivery="2023-06-10"
          progress={100}
        />
        <ShipmentCard 
          id="LGS456789123" 
          destination="Chicago, IL" 
          status="Pending" 
          estimatedDelivery="2023-06-20"
          progress={25}
        />
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded">
          Create New Shipment
        </button>
        <button className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded">
          Track Shipment
        </button>
        <button className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded">
          Request Pickup
        </button>
      </div>
    </div>
  </div>
);

interface DashboardCardProps {
  title: string;
  value: string;
  change: string;
  color: string;
}

const DashboardCard = ({ title, value, change, color }: DashboardCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center">
      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white`}>
        <span className="text-xl font-bold">{value.charAt(0)}</span>
      </div>
      <div className="ml-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500">{change}</p>
      </div>
    </div>
  </div>
);

interface AssignmentCardProps {
  id: string;
  destination: string;
  status: string;
  priority: string;
}

const AssignmentCard = ({ id, destination, status, priority }: AssignmentCardProps) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium">{id}</h4>
        <p className="text-sm text-gray-600">{destination}</p>
      </div>
      <span className={`px-2 py-1 text-xs rounded ${
        priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {priority}
      </span>
    </div>
    <div className="mt-2 flex justify-between items-center">
      <span className={`px-2 py-1 text-xs rounded ${
        status === 'Pending Pickup' ? 'bg-yellow-100 text-yellow-800' :
        status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
        'bg-green-100 text-green-800'
      }`}>
        {status}
      </span>
      <button className="text-blue-600 hover:text-blue-800 text-sm">View Details</button>
    </div>
  </div>
);

interface ShipmentCardProps {
  id: string;
  destination: string;
  status: string;
  estimatedDelivery: string;
  progress: number;
}

const ShipmentCard = ({ id, destination, status, estimatedDelivery, progress }: ShipmentCardProps) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium">{id}</h4>
        <p className="text-sm text-gray-600">To: {destination}</p>
      </div>
      <span className={`px-2 py-1 text-xs rounded ${
        status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
        status === 'Delivered' ? 'bg-green-100 text-green-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {status}
      </span>
    </div>
    <div className="mt-3">
      <div className="flex justify-between text-sm mb-1">
        <span>Estimated: {estimatedDelivery}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            progress === 100 ? 'bg-green-500' : 
            progress > 50 ? 'bg-blue-500' : 'bg-yellow-500'
          }`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
    <div className="mt-3 flex justify-end">
      <button className="text-blue-600 hover:text-blue-800 text-sm">Track Shipment</button>
    </div>
  </div>
);