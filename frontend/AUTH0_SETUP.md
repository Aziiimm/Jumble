# Auth0 Social Login Setup Guide

## 1. Configure Social Providers in Auth0 Dashboard

### Enable Google:

1. Go to **Authentication → Social**
2. Click **"Create Connection"**
3. Select **Google**
4. Fill in your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. **Save** the connection

### Enable GitHub (Optional):

1. Go to **Authentication → Social**
2. Click **"Create Connection"**
3. Select **GitHub**
4. Fill in your GitHub OAuth credentials:
   - **Client ID**: From GitHub Developer Settings
   - **Client Secret**: From GitHub Developer Settings
5. **Save** the connection

### Enable Apple (Required):

1. Go to **Authentication → Social**
2. Click **"Create Connection"**
3. Select **Apple**
4. Fill in your Apple Developer credentials:
   - **Client ID**: From Apple Developer Console
   - **Client Secret**: From Apple Developer Console
   - **Team ID**: From Apple Developer Console
   - **Key ID**: From Apple Developer Console
   - **Private Key**: From Apple Developer Console
5. **Save** the connection

### Enable Database Connection (Email/Password):

1. Go to **Authentication → Database**
2. You should see **"Username-Password-Authentication"** connection
3. If it's disabled, click on it and **Enable** it
4. Configure password policies if desired
5. **Save** the connection

## 2. Update Application Settings

### In your Auth0 Application:

1. Go to **Applications → Applications**
2. Select your **Jumble Game App**
3. Go to **Settings** tab
4. Update **Allowed Callback URLs**:
   ```
   http://localhost:5173, http://localhost:3000, https://yourdomain.com
   ```
5. Update **Allowed Logout URLs**:
   ```
   http://localhost:5173, http://localhost:3000, https://yourdomain.com
   ```
6. Update **Allowed Web Origins**:
   ```
   http://localhost:5173, http://localhost:3000, https://yourdomain.com
   ```
7. **Save Changes**

## 3. Test Your Setup

1. Start your development server: `npm run dev`
2. Click "Log In" in the navbar
3. You should see your custom login page with:
   - Google login button
   - Apple login button
   - GitHub login button
   - Email/password login option

## 4. Connection Names

The connection names used in the code are:

- **Google**: `google-oauth2`
- **Apple**: `apple`
- **GitHub**: `github`
- **Email/Password**: `Username-Password-Authentication` (Auth0's default database connection)

Make sure these match your Auth0 connection names exactly.

## 5. Troubleshooting

### If social login doesn't work:

1. Check that the connection is enabled in Auth0
2. Verify the connection name matches exactly
3. Ensure your OAuth app credentials are correct
4. Check browser console for errors

### If you get redirect errors:

1. Make sure your callback URLs are correctly configured
2. Check that your domain is added to allowed origins
3. Verify your Auth0 domain and client ID in `.env`

## 6. Adding More Providers

To add more social providers:

1. Create the connection in Auth0 Dashboard
2. Add a new button in `Login.tsx`
3. Use the correct connection name in `handleSocialLogin()`

## 6. Important Notes

### Apple Sign-In Requirements:

- Apple Sign-In is required for iOS apps and recommended for web apps
- You need an Apple Developer account ($99/year)
- Apple requires specific setup for web authentication
- Make sure to configure the correct redirect URIs in your Apple Developer Console

### Current Supported Providers:

- **Google**: Most popular, easy to set up
- **Apple**: Required for iOS, professional appearance
- **GitHub**: Great for developer-focused apps

### Security Benefits:

- No password storage on your servers
- OAuth 2.0 security standards
- Automatic account linking
- Reduced password-related security issues
