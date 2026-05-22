# TaskFlow-App
Application of a to do app, made as a internship project, for no comercial porposes

## Deployment Instructions (Vercel)

1. Connect this repository to your Vercel account.
2. The root directory for the framework should be `frontend`.
3. Vercel will automatically detect that it's a Vite (React) project and set the build command to `npm run build` and output directory to `dist`.
4. **Important**: A `vercel.json` file has been added to the `frontend` folder to correctly handle client-side routing. Without this file, reloading the page or sharing a link to a specific project would result in a `404 Not Found` error.
5. If using Firebase Auth/Firestore, make sure your Firebase config in `src/firebase.js` matches your project.
6. Deploy!
