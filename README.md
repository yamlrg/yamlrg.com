# yamlrg

## Getting Started

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

The site is hosted at [yamlrg.com](https://www.yamlrg.com/)

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

- [ ] Gravity: randomly match people in 1-on-1 calls to meet each other
- [ ] Points system for members
- [x] Send email to admins when someone sends a join request
