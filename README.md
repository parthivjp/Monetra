# Ledgerly Personal Finance Tracker

A full-stack personal finance dashboard built with React, Express, MongoDB, Mongoose, and JWT authentication.

## Database

Database name: **`ledgerly_finance`**

Collections:
- `users`
- `transactions`
- `budgets`

## Local setup

1. Install and start MongoDB on `127.0.0.1:27017`.
2. Run `npm install`.
3. Review `server/.env`. Replace the development JWT secret before production use.
4. Run both services with `npm run dev:full`.
5. Open `http://localhost:5173`.

The API is available at `http://localhost:5000/api`.
For MongoDB Atlas, replace `MONGO_URI` in `server/.env` with the Atlas connection string.

## Security

- Passwords are hashed with bcrypt using 12 salt rounds.
- Email addresses and names are server-validated and normalized.
- Password sign-up rules require at least 8 characters, uppercase, lowercase, and a number.
- JWT tokens are required for protected API routes.
- Transactions and budgets are scoped to the authenticated user.
- Helmet, CORS allowlists, body-size limits, and authentication rate limiting are enabled.

## Production

- Set `NODE_ENV=production`.
- Replace `JWT_SECRET` with a cryptographically random secret of at least 32 characters.
- Set `CLIENT_URL` to the deployed frontend origin.
- Use a restricted MongoDB Atlas or managed MongoDB user.
