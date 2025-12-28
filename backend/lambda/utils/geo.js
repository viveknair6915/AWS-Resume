export const extractGeoData = async (event) => {
    const headers = event.headers || {};

    // 1. Try CloudFront Headers first (Fastest)
    let country = headers['cloudfront-viewer-country'] || headers['CloudFront-Viewer-Country'] || 'Unknown';
    let city = headers['cloudfront-viewer-city'] || headers['CloudFront-Viewer-City'] || 'Unknown';
    const ip = headers['x-forwarded-for'] || event.requestContext?.http?.sourceIp || 'Unknown';
    const userAgent = headers['user-agent'] || headers['User-Agent'] || 'Unknown';
    const clientIp = ip.split(',')[0].trim();

    // 2. Fallback to IP-API if CloudFront failed and we have an IP
    if ((country === 'Unknown' || city === 'Unknown') && clientIp && clientIp !== 'Unknown' && clientIp !== '127.0.0.1') {
        try {
            console.log(`DEBUG: CloudFront headers missing. Falling back to IP lookup for ${clientIp}`);
            const response = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    country = data.country || country;
                    city = data.city || city;
                    console.log(`DEBUG: IP-API Lookup Success: ${city}, ${country}`);
                }
            }
        } catch (error) {
            console.error('DEBUG: IP-API Lookup Failed:', error);
        }
    }

    return {
        country,
        city,
        ip: clientIp,
        userAgent
    };
};
