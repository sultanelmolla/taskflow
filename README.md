# TaskFlow v0.2

Run:
npm install
npm run dev

New:
- Real sidebar navigation
- Tasks page
- Clients page with automatic balances
- Categories + default prices
- Reports
- Edit/Delete task
- Partial payment tracking
- Quick complete / mark fully paid
- Search
- Local browser persistence

Next: SQLite database, proper payment history, calendar, client detail pages and backup/export.

## Firebase Authentication setup
1. Create a Firebase project and add a Web app.
2. In Firebase Console > Authentication > Sign-in method, enable Email/Password.
3. In Authentication > Users, create the TaskFlow user account.
4. Copy `.env.local.example` to `.env.local` and paste the Web app configuration values.
5. Run `npm install` and then `npm run dev`.
6. For Vercel, add the same `NEXT_PUBLIC_FIREBASE_*` variables in Project Settings > Environment Variables and redeploy.

This version uses Firebase only for authentication. Tasks, clients, and categories remain in browser localStorage for now.
