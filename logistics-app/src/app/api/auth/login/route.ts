import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';

// Mock user database
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Driver User',
    email: 'driver@example.com',
    role: 'driver',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Staff User',
    email: 'staff@example.com',
    role: 'staff',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Customer User',
    email: 'customer@example.com',
    role: 'customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // In a real application, you would verify the password against a hash
    // For this demo, we'll just check if the email exists and return a mock user
    const user = mockUsers.find(u => u.email === email);

    if (!user || password !== 'password') { // Using a simple password for demo
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // In a real app, you would generate a JWT token
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}