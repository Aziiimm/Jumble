// backend/auth.js
import { auth } from "express-oauth2-jwt-bearer";

export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE, // e.g. "https://jumble.api"
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`, // e.g. "https://dev-p1w56dwo6khdymxn.us.auth0.com/"
  tokenSigningAlg: "RS256",
});
