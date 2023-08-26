namespace PolusggSlim.Configuration
{
    public class AuthEndpointConfig
    {
        public string AuthEndpoint => System.Environment.GetEnvironmentVariable("MWGG_ACCOUNTS_URL");

        // Forward slash on the end of endpoint url because of HttpClient convention
        public string PublicApiBaseUrl => "/api/v2/";
    }
}