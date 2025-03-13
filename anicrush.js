// ANICRUSH MODULE v4.0 (FULL WORKING SCRIPT)
const HEADERS = {
  "Accept": "application/json",
  "Origin": "https://anicrush.to",
  "Referer": "https://anicrush.to/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest"
};

// UTILITY FUNCTIONS
const cleanTitle = (title) => {
  try {
    return title
      .replace(/&#(8211|8217);/g, m => ({'8211': '-', '8217': "'"})[m])
      .replace(/&#\d+;/g, '')
      .trim();
  } catch {
    return title;
  }
};

const safeParse = (html, regex, group = 1) => {
  const match = html.match(regex);
  return match?.[group]?.trim() || '';
};

// SEARCH HANDLER
async function search(keyword) {
  try {
    const apiUrl = `https://api.anicrush.to/shared/v2/movie/list?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`;
    
    const response = await fetch(apiUrl, { headers: HEADERS });
    const rawData = await response;
    const data = JSON.parse(rawData);

    console.log('[DEBUG] API Response:', data);
    
    if (!data?.data || !Array.isArray(data.data)) {
      console.error('Invalid API structure');
      return [];
    }

    return data.data.map(item => ({
      title: cleanTitle(item.title) || 'Untitled',
      image: item.thumbnail?.replace('http://', 'https://') || '',
      href: `/movie/${item.id}`
    }));
    
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// DETAILS EXTRACTOR
async function details(url) {
  try {
    const movieId = url.split('/movie/')[1];
    const response = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}`,
      { headers: HEADERS }
    );
    
    const rawData = await response;
    const data = JSON.parse(rawData);
    
    return [{
      description: data.description || 'No description available',
      aliases: data.alt_titles?.join(', ') || 'N/A',
      airdate: data.year?.toString() || 'Unknown'
    }];
    
  } catch (error) {
    console.error('Details error:', error);
    return [];
  }
}

// EPISODES HANDLER
async function episodes(url) {
  try {
    const movieId = url.split('/movie/')[1];
    const response = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}/episodes`,
      { headers: HEADERS }
    );
    
    const rawData = await response;
    const data = JSON.parse(rawData);
    
    return data.map(ep => ({
      href: `/watch/${movieId}?ep=${ep.number}`,
      number: ep.number.toString()
    }));
    
  } catch (error) {
    console.error('Episodes error:', error);
    return [];
  }
}

// STREAM EXTRACTOR
async function content(url) {
  try {
    const [_, movieId, episode] = url.match(/(\d+)\?ep=(\d+)/);
    const embedUrl = `https://anicrush.to/embed/anime/${movieId}-${episode}`;
    
    const response = await fetch(embedUrl, {
      headers: { ...HEADERS, Referer: `https://anicrush.to/movie/${movieId}` }
    });
    
    const html = await response;
    const streamUrl = html.match(/(https:\/\/[^\s'"]+\.m3u8)/)?.[0];
    
    if (!streamUrl) throw new Error('No stream found');
    return streamUrl;
    
  } catch (error) {
    console.error('Stream error:', error);
    return null;
  }
}

// EXPORT HANDLER
if (typeof module !== 'undefined') {
  module.exports = { search, details, episodes, content };
} else {
  Object.assign(globalThis, { search, details, episodes, content });
}
