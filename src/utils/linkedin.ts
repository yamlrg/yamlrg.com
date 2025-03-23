export const formatLinkedInUrl = (input: string, returnUsername: boolean = false): string => {
  if (!input) return '';
  
  try {
    // Extract username whether input is full URL or just username
    let username = input;
    
    if (input.includes('linkedin.com/in/')) {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      username = url.pathname.split('/in/')[1]?.replace(/\/$/, '') || '';
    } else {
      username = input.replace(/^\/|\/$/g, '').replace(/https?:\/\/(www\.)?/i, '');
    }

    // Return either username or full URL based on returnUsername parameter
    return returnUsername 
      ? username 
      : `https://www.linkedin.com/in/${username}/`;
  } catch (error) {
    // If parsing fails, clean up the input as best we can
    const cleaned = input
      .replace(/https?:\/\/(www\.)?/i, '')
      .replace(/linkedin\.com\/in\//i, '')
      .replace(/^\/|\/$/g, '');
    console.log('error', error);
    return returnUsername ? cleaned : `https://www.linkedin.com/in/${cleaned}/`;
  }
}; 