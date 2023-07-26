namespace PolusggSlim.Configuration
{
    public class AuthEndpointConfig
    {
        public string AuthEndpoint => "http://127.0.0.1:8000";

        // Forward slash on the end of endpoint url because of HttpClient convention
        public string PublicApiBaseUrl => "/api/v1/";
    }
}