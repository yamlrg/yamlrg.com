
/* eslint-disable @typescript-eslint/no-explicit-any */
// Track custom events in Google Analytics
export const trackEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  try {
    console.log('Trying to track event:', eventName, eventParams);
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('📊 Analytics Event:', {
        name: eventName,
        params: eventParams,
        timestamp: new Date().toISOString(),
      });
      
      window.gtag('event', eventName, eventParams);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error tracking event:', error.message);
    }
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
