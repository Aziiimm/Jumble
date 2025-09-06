import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export default function ApiTest() {
    const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();
    const [result, setResult] = useState<string>("");

    const callApi = async () => {
        try {
            if (!isAuthenticated) {
                await loginWithRedirect();
                return;
            }
            const token = await getAccessTokenSilently({
                authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
            });

            const res = await fetch("http://localhost:3000/api/protected", {
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
            });
            const data = await res.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (e: any) {
            setResult(`Error: ${e?.message || String(e)}`);
        }
    };

    return (
        <div style={{ padding: 32 }}>
            <h1>API Test</h1>
            <button onClick={callApi}>Call Protected API</button>
            <pre style={{ marginTop: 16 }}>{result}</pre>
        </div>
    );
}
