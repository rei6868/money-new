# Bug Fix: Database Not Configured - Mock Data Fallback

## Issue
After implementing Sprint 8, the accounts and transactions pages were showing blank/no data because the database connection was not configured (no `DATABASE_URL` environment variable).

## Root Cause
The API endpoints (`/api/accounts`, `/api/people`, `/api/transactions`) were returning error responses when the database was not configured, causing the frontend to fail loading any data.

## Solution
Added mock data fallback to all API endpoints when the database is not configured. This allows the application to work in development mode without requiring a database connection.

## Changes Made

### 1. `/api/accounts/index.ts`
- Added `MOCK_ACCOUNTS` array with 4 sample accounts (Bank, Cash, Credit, E-wallet)
- Modified handler to return mock data when `db` is `null`
- Supports both GET (fetch accounts) and POST (create account) with mock data
- Mock accounts persist in memory during the session

### 2. `/api/people/index.ts`
- Added `MOCK_PEOPLE` array with 2 sample people (John Doe, Jane Smith)
- Modified handler to return mock data when `db` is `null`
- Supports both GET (fetch people) and POST (create person) with mock data
- Mock people persist in memory during the session

### 3. `/api/transactions/index.ts`
- Added `MOCK_TRANSACTIONS` array with 2 sample transactions (Expense, Income)
- Modified handler to return mock data when `db` is `null`
- Supports pagination with mock data
- Supports both GET (fetch transactions) and POST (create transaction) with mock data
- Mock transactions persist in memory during the session

## Mock Data Details

### Mock Accounts (4 items)
1. **Vietcombank Savings** (Bank)
   - Opening Balance: 10,000,000 VND
   - Current Balance: 12,500,000 VND
   - Owner: John Doe

2. **Cash Wallet** (Cash)
   - Opening Balance: 500,000 VND
   - Current Balance: 750,000 VND
   - Owner: John Doe

3. **Credit Card** (Credit)
   - Opening Balance: 0 VND
   - Current Balance: -2,000,000 VND
   - Owner: John Doe

4. **MoMo E-Wallet** (E-wallet)
   - Opening Balance: 100,000 VND
   - Current Balance: 350,000 VND
   - Owner: John Doe

### Mock People (2 items)
1. **John Doe** (Primary user)
   - Email: john@example.com
   - Status: Active

2. **Jane Smith** (Secondary user)
   - Email: jane@example.com
   - Status: Active

### Mock Transactions (2 items)
1. **Groceries** (Expense)
   - Amount: 150,000 VND
   - Account: Vietcombank Savings
   - Category: Groceries

2. **Salary** (Income)
   - Amount: 5,000,000 VND
   - Account: Vietcombank Savings
   - Category: Salary

## How to Use

### Development Mode (No Database)
1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000
3. **Login with credentials:**
   - Username: `admin`
   - Password: `admin`
4. Navigate to Accounts page - you'll see 4 mock accounts
5. Navigate to Transactions page - you'll see 2 mock transactions
6. You can add new accounts/transactions - they'll persist in memory until server restart

### Production Mode (With Database)
1. Set the `DATABASE_URL` environment variable in `.env` file
2. The application will automatically use the real database instead of mock data

## Important Notes

### Authentication Required
The accounts and transactions pages require authentication. If you see a blank page:
1. Make sure you're logged in
2. Login credentials: `admin` / `admin`
3. Authentication state is stored in localStorage with key `finance-app-authenticated`

### Mock Data Limitations
- Mock data persists only in memory (lost on server restart)
- Mock data is shared across all users/sessions
- No real database operations (no persistence)
- Suitable for development and testing only

### Console Warnings
You'll see this warning in the server console when using mock data:
```
Database connection is not configured - using mock data
```

This is expected and indicates the application is running in mock mode.

## Testing

### Test API Endpoints Directly
```bash
# Test accounts API
curl http://localhost:3000/api/accounts | jq .

# Test people API
curl http://localhost:3000/api/people | jq .

# Test transactions API
curl http://localhost:3000/api/transactions | jq .
```

### Test in Browser
1. Open http://localhost:3000
2. Login with `admin` / `admin`
3. Navigate to Accounts page
4. You should see 4 accounts with different types
5. Click on account type tabs (All, Bank, Cash, Credit, E-wallet)
6. Try adding a new account via "+ Add Account" button
7. The new account should appear immediately in the list

## Troubleshooting

### Still seeing blank pages?
1. **Check if you're logged in:**
   - Open browser DevTools → Application → Local Storage
   - Look for key `finance-app-authenticated` with value `true`
   - If not present, go to /login and login with `admin` / `admin`

2. **Check browser console for errors:**
   - Open browser DevTools → Console
   - Look for any red error messages
   - Common issues: CORS errors, network errors, JavaScript errors

3. **Check server logs:**
   - Look at the terminal where `npm run dev` is running
   - You should see "Database connection is not configured - using mock data"
   - If you see other errors, investigate those

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

5. **Restart development server:**
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again
   - Navigate to http://localhost:3000

## Next Steps

To use a real database:
1. Set up a PostgreSQL database (e.g., Neon, Supabase, local PostgreSQL)
2. Create a `.env` file in the project root
3. Add your database connection string:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```
4. Run database migrations (if applicable)
5. Restart the development server
6. The application will automatically use the real database

## Files Modified
- `pages/api/accounts/index.ts` - Added mock accounts fallback
- `pages/api/people/index.ts` - Added mock people fallback
- `pages/api/transactions/index.ts` - Added mock transactions fallback

---

**Status:** ✅ **FIXED**

The application now works in development mode without requiring a database connection. All pages load correctly with mock data after logging in.

