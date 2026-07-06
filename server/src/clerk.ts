import { createClerkClient, verifyToken } from '@clerk/backend';

const secretKey = process.env.CLERK_SECRET_KEY;

// Clerk is optional: if no secret key is configured, the /auth/clerk routes
// simply report it as unavailable rather than crashing the server.
export const clerkEnabled = !!secretKey;

const clerkClient = secretKey ? createClerkClient({ secretKey }) : null;

export interface ClerkIdentity {
  clerkId: string;
  email: string;
  name: string;
}

/**
 * Verify a Clerk session token (from the frontend's getToken()) and return the
 * user's Clerk id, email and display name. Throws if the token is invalid.
 */
export async function verifyClerkToken(token: string): Promise<ClerkIdentity> {
  if (!secretKey || !clerkClient) throw new Error('Clerk is not configured');
  const claims = await verifyToken(token, { secretKey });
  const clerkId = claims.sub;
  const user = await clerkClient.users.getUser(clerkId);
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    '';
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    email ||
    'New user';
  return { clerkId, email: email.toLowerCase(), name };
}
