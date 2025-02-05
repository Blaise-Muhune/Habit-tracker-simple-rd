# SimpleR - Task Management Made Simple

SimpleR is a modern task management application built with Next.js, focusing on simplicity and productivity. It helps users organize their daily tasks with smart features and intuitive design.

## Features

- **Smart Task Management**
  - Daily and tomorrow view for better task planning
  - Drag-and-drop task organization
  - Priority task marking
  - Task completion tracking
  - Task descriptions and time scheduling

- **Premium Features**
  - Advanced analytics dashboard
  - AI-powered task suggestions
  - Weekly progress reports
  - Extended task history

- **Notifications**
  - Email reminders
  - Push notifications
  - SMS alerts (Premium)
  - Customizable reminder times

- **User Experience**
  - Dark/Light theme support
  - Responsive design
  - Interactive tour for new users
  - Customizable user preferences

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Analytics**: Firebase Analytics
- **Payments**: Stripe
- **Notifications**: Web Push, Email, SMS

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/simpler.git
cd simpler
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file with the following variables:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MONTHLY_PRICE_ID=
STRIPE_YEARLY_PRICE_ID=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_EMAIL=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/         # Reusable React components
├── context/           # React context providers
├── lib/               # Utility functions and configurations
├── types/             # TypeScript type definitions
└── styles/            # Global styles and Tailwind config
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
