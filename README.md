# yamlrg

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Then, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- 🔐 Authentication with Google
- 👥 Member directory with profile management
- 📚 Reading list for sharing resources
- 💼 Job board for member companies
- 📊 Analytics tracking
- 🎁 Year in review (Wrapped)
- 👑 Admin dashboard for managing members

## Deployment

The site is hosted at [yamlrg.com](https://yamlrg.com/)

### Current Setup
- Hosted on Heroku
- Connected to María's GitHub fork of the yamlrg repo
- Deployed from the `react-app` branch
- Domain purchased on GoDaddy (login with yamlrg Gmail)
- Account details stored in Bitwarden

### Production Build

```bash
# Build the application
npm run build

# Start in production mode
npm start
```

## Future Ideas

- [x] Send email to people when they are approved
- [ ] Gravity: randomly match people in 1-on-1 calls to meet each other
- [x] Add Google Analytics / PostHog
- [x] Show number of members in the members page
- [x] Search for members
- [x] Add a "reading list" page
- [x] Add jobs from companies that are hiring

## Authentication Flow

### 1. Join Request
- User fills out join form at `/join`
- Creates document in `joinRequests` collection
- Status starts as 'pending'

### 2. Admin Approval
- Admin reviews request in admin dashboard
- Upon approval:
  - Updates join request status
  - Sends approval email with WhatsApp group link

### 3. First Login
- User authenticates with Google
- System checks for approved join request
- Creates user document if approved
- Redirects to profile completion

### 4. Profile Management
- User completes profile at `/profile`
- Can toggle visibility in member directory
- Can manage job listings and status flags

## Document Structure

**Join Requests:**
```typescript
{
  id?: string;
  email: string;
  name: string;
  interests: string;
  linkedinUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}
```

**Users:**
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isApproved: boolean;
  showInMembers: boolean;
  profileCompleted: boolean;
  linkedinUrl?: string;
  approvedAt?: string;
  joinedAt?: string;
  status: {
    lookingForCofounder: boolean;
    needsProjectHelp: boolean;
    offeringProjectHelp: boolean;
    isHiring: boolean;
    seekingJob: boolean;
    openToNetworking: boolean;
  };
  jobListings?: Array<{
    title: string;
    company: string;
    link: string;
    postedAt: string;
  }>;
}
```

## Analytics

The application uses Google Analytics to track:
- Page views
- User interactions
- Member growth
- Feature usage

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

### Firebase Security Rules
- Users can only read and update their own non-sensitive data
- Only admins can modify approval status and admin privileges
- Join requests can be created by anyone but only read/modified by admins
- Reading list items require authentication to read and create

### Protected Operations
- User approval status can only be modified through admin endpoints
- Profile updates exclude sensitive fields (isApproved, isAdmin, etc.)
- All admin operations require email verification against whitelist