# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands
- **Start Development**: `npm start` (Expo development server)
- **Run on Devices**: `npm run ios` or `npm run android`
- **Web Development**: `npm run web`
- **Testing**: `npm test` (all tests) or `npx jest path/to/test-file.tsx` (single test)
- **Linting**: `npm run lint`
- **Reset Project**: `npm run reset-project`

## Code Style Guidelines
- **TypeScript**: Use strong typing with interfaces/types for all components, functions and props
- **Imports**: Group in order: React/RN, third-party, project (use @ alias for project imports)
- **Components**: 
  - Functional components with hooks
  - Use ThemedText and ThemedView for consistent styling
  - Props interfaces should extend existing React Native types
- **Naming**: 
  - PascalCase for components, interfaces, types
  - camelCase for variables, functions, instances
  - Descriptive names that reflect purpose
- **Styling**: Use StyleSheet.create, theme-aware colors from constants/Colors.ts
- **Error Handling**: Try/catch blocks with appropriate error messages/fallbacks
- **Firebase**: Initialize in src/config/firebase.ts, use platform-specific imports

## Project Structure
- **app/**: Expo Router screens and navigation
- **components/**: Reusable UI components (ThemedText, ThemedView, etc.)
- **src/**: Core application code and business logic
- **assets/**: Static resources (images, fonts)