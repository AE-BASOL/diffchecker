# Integrations

The `diffchecker` project is a fully self-contained, client-side web application. 

## External APIs & Services
- **None**: The application performs text comparison directly within the browser using local JavaScript execution. It does not communicate with any external APIs, servers, or backend services.
- Data privacy is inherently maintained, as texts pasted into the "Original" or "Modified" text areas never leave the user's local browser instance.

## Data Sources
- **None**: No external databases or remote data sources are integrated.
- The project includes some static, hardcoded local sample fixtures (e.g., `ubmk26-sample.js` and local fallback sample strings in `app.js`) for demonstration purposes, but it does not fetch external data at runtime.

## Hosting & Deployment
- The app is designed to be hosted as a simple static site. As noted in the README, it integrates naturally with static hosting providers like **GitHub Pages**, which can point to the repository root to publish the tool without any build steps.
