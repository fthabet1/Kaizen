This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, make sure the API server is running:

```bash
# Navigate to the server directory
cd ../server

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The API server should start on port 5000. This is important as the client is configured to connect to `http://localhost:5000` by default.

Then, run the client development server:

```bash
# Navigate to the client directory (if not already there)
cd ../client

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Configuration

The client is configured to connect to the API at `http://localhost:5000` by default. If you need to change this:

1. Create a `.env.local` file in the client directory
2. Add `NEXT_PUBLIC_API_URL=http://your-api-url` to the file

## Troubleshooting

### No data loading or "Failed to fetch" errors

If you're seeing errors loading data:

1. Check that the API server is running on port 5000
2. Check that you're logged in (authentication is required for all API endpoints)
3. Open the browser console to see detailed error messages
4. Verify that the database is running and properly configured in the server's `.env` file

### Authentication Issues

If you're having trouble with authentication:

1. Log out and log back in to refresh your authentication token
2. Check the Firebase configuration in both client and server
3. Verify the Firebase service account key in the server `.env` file

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
