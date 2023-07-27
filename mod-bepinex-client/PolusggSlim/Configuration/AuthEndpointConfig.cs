namespace PolusggSlim.Configuration
{
    public class AuthEndpointConfig
    {
        public string AuthEndpoint => "https://accounts.mouthwash.midlight.studio";

        // Forward slash on the end of endpoint url because of HttpClient convention
        public string PublicApiBaseUrl => "/api/v1/";
    }
}