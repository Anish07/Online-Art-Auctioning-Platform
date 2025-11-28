# ArtX — Online Art Auctioning Platform

ArtX is a modern online marketplace for buying and selling art through auctions. Built with React, TypeScript, and Vite.

## Features

*   **Marketplace**: Browse and search for artwork.
*   **Auctions**: Participate in real-time art auctions.
*   **Artists**: Discover and follow artists.
*   **User Roles**: Distinct features for Artists, Buyers, Admins, and CSRs.
*   **Wallet**: Manage funds for bidding and purchasing.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **Backend/Database**: Firebase (Auth, Firestore, Storage)

## Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running the App

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

## Building for Production

To build the app for production:

```bash
npm run build
```

## Deployment

This project is configured for deployment with Firebase Hosting.

```bash
npm run deploy
```

## License

MIT

Built by Danny Guan and Anish Ahuja for Toronto Metropolitan University CPS731 Final Project. 
