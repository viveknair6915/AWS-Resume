export const extractGeoData = (event) => {
    const headers = event.headers || {};

    // CloudFront adds these headers if configured
    const country = headers['cloudfront-viewer-country'] || 'Unknown';
    const city = headers['cloudfront-viewer-city'] || 'Unknown';
    const ip = headers['x-forwarded-for'] || event.requestContext?.http?.sourceIp || 'Unknown';
    const userAgent = headers['user-agent'] || 'Unknown';

    return {
        country,
        city,
        ip: ip.split(',')[0].trim(), // Get client IP if proxy chain
        userAgent
    };
};
