import { Auth0Provider } from "@auth0/auth0-react";

export default function Auth0ProviderWithNavigate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN!}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      useFormData={false} // Use query parameters instead of form data
    >
      {children}
    </Auth0Provider>
  );
}
