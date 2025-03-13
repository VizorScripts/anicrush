// ANICRUSH MODULE v4.1 (doubt it works)
const HEADERS = {
  "Accept": "application/json",
  "Origin": "https://anicrush.to",
  "Referer": "https://anicrush.to/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest"
};

// CORE SEARCH FUNCTION
async function search(keyword) {
  try {
    const apiUrl = `https://api.anicrush.to/shared/v2/movie/list?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`;
    
    // Get raw response text directly
    const rawData = await fetch(apiUrl, { headers: HEADERS });
    const data = JSON.parse(rawData);

    // Validate API response structure
    if (!data?.data || !Array.isArray(data.data)) {
      console.error('Invalid API response format');
      return [];
    }

    // Transform results
    return data.data.map(item => ({
      title: item.title?.trim() || 'Untitled',
      image: item.thumbnail?.replace('http://', 'https://') || '',
      href: `/movie/${item.id}`
    }));

  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// DETAILS HANDLER
async function details(url) {
  try {
    const movieId = url.split('/movie/')[1];
    const rawData = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}`,
      { headers: HEADERS }
    );
    
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
    const rawData = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}/episodes`,
      { headers: HEADERS }
    );
    
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
    const rawData = await fetch(
      `https://anicrush.to/embed/anime/${movieId}-${episode}`,
      { headers: { ...HEADERS, Referer: `https://anicrush.to/movie/${movieId}` } }
    );
    
    const html = await rawData;
    const streamUrl = html.match(/(https:\/\/[^\s'"]+\.m3u8)/)?.[0];
    return streamUrl || null;
    
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
