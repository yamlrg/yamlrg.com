// Track custom events in Google Analytics
export const trackEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  
  const tryTrackEvent = () => {
    try {
      console.log('Tracking event:', eventName, eventParams);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, {
          ...eventParams,
          event_category: 'user_interaction',
        });
        console.log('Event tracked successfully');
      } else {
        console.warn('Google Analytics not initialized');
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  tryTrackEvent();
};
