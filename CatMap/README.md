# CatMap

A mobile app where users can take pictures of cats they see and post them to a map. Other users can view the photos pinned to the map, like and comment on them, and create user profiles.

## Features (Planned)

- User authentication (email or Google)
- Photo upload via camera or gallery
- Geotag each photo and display it as a pin on a map
- Interactive map to browse cat photos
- User profiles with username, profile picture, and list of cat sightings
- Like and comment functionality

## Tech Stack

- **Frontend**: React Native using Expo
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Maps**: Google Maps API or Mapbox
- **Image Hosting**: Firebase Storage

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/CatMap.git
cd CatMap
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Run on device or emulator
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
CatMap/
├── app/                  # Expo Router app directory
├── assets/               # Images, fonts, etc.
├── components/           # UI components
├── src/
│   ├── assets/           # Additional assets
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation setup
│   ├── screens/          # App screens
│   └── services/         # API services, utilities, etc.
```

## Next Steps

- Setup Firebase Authentication
- Implement Google Maps integration
- Create database schema
- Build photo upload functionality