# Logistics Management Application

A comprehensive logistics management system built with Next.js, TypeScript, and Tailwind CSS. This application provides role-based access for admins, drivers, staff, and customers to manage shipments, track deliveries, and handle logistics operations.

## Features

- **Role-based Authentication**: Different dashboards and permissions for admins, drivers, staff, and customers
- **Real-time Tracking**: Track shipments and deliveries with progress indicators
- **Dashboard Views**: Customized dashboards for each user role
- **Responsive Design**: Works on desktop and mobile devices
- **Type Safety**: Built with TypeScript for enhanced code quality
- **Modern UI**: Clean interface using Tailwind CSS

## Tech Stack

- Next.js 16 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- NextAuth.js (Authentication)
- Prisma (Database ORM)
- Zod (Validation)
- JWT (Token-based authentication)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Update the `.env.local` file with your configuration:

```env
DATABASE_URL="your-database-url"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── auth/          # Authentication API routes
│   ├── login/             # Login page
│   └── ...                # Other pages
├── components/            # Reusable React components
├── contexts/              # React context providers
├── lib/                   # Utility functions and libraries
├── types/                 # TypeScript type definitions
├── utils/                 # Helper functions
└── middleware.ts          # Next.js middleware
```

## API Routes

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration (to be implemented)
- `POST /api/auth/logout` - User logout (to be implemented)
- `GET /api/auth/me` - Get current user info (to be implemented)

## Authentication

The application uses JWT-based authentication with role-based access control. Users are authenticated via the `/api/auth/login` endpoint and tokens are stored in localStorage.

## Environment Variables

- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `NEXTAUTH_URL` - Application URL for NextAuth.js

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The application is ready for deployment on Vercel, Netlify, or any Node.js hosting platform that supports Next.js.

## Security Considerations

- JWT tokens are used for authentication
- Role-based access control ensures users only see relevant data
- Input validation using Zod
- Secure password handling with bcrypt
- Rate limiting (to be implemented)
- XSS protection via React's built-in escaping

## Future Enhancements

- Real-time updates with WebSockets
- Email notifications
- Advanced reporting and analytics
- Integration with mapping services
- Mobile app using React Native
- Payment integration
- Advanced shipment tracking with geolocation
- Integration with external logistics providers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
