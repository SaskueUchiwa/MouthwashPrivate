/**
 * Configuration for a Mediator HTTP server.
 */
export interface MediatorServerConfig {
    /**
     * Whether or not the server is in development mode, i.e., whether debugging
     * information is emitted to the console.
     */
    development: boolean;
    /**
     * A set of domains that can be allowed to make CORS requests to the server
     * on a user's browser.
     */
    crossDomains: string[];
    /**
     * A set of allowed headers that the client can pass to the server.
     */
    allowedHeaders: string[];
}