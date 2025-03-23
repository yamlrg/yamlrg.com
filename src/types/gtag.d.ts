declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string,
      config?: {
        page_path?: string;
        send_page_view?: boolean;
        event_category?: string;
        [key: string]: string | boolean | undefined;
      }
    ) => void;
    dataLayer: Array<{
      [key: string]: string | boolean | number | undefined;
    }>;
  }
}

export {}; 