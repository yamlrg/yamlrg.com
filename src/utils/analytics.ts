// Track custom events in Google Analytics
export const trackEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      // Add event category and non-interaction flag
      const enhancedParams = {
        ...eventParams,
        event_category: 'user_interaction',
        non_interaction: false,
      };

      console.log('📊 Analytics Event:', {
        name: eventName,
        params: enhancedParams,
        timestamp: new Date().toISOString(),
      });
      
      window.gtag('event', eventName, enhancedParams);
    } else {
      console.warn('Google Analytics not initialized');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error tracking event:', error.message);
    }
  }
};
