// ANICRUSH MODULE v3.2 
const HEADERS = {
  "Host": "api.anicrush.to",
  "Origin": "https://anicrush.to",
  "Referer": "https://anicrush.to/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json"
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

// JAVASCRIPT UNPACKER (KINOGER-STYLE)
function unpackScript(packedCode) {
  try {
    const unpack = new Function('return ' + packedCode.replace(/^eval/, ''))();
    return unpack.replace(/\\'/g, "'").replace(/\\"/g, '"');
  } catch (e) {
    console.error('Unpack error:', e);
    return packedCode;
  }
}

// NORMAL MODE FUNCTIONS
function searchResults(html) {
  const results = [];
  const itemRegex = /<div class="film-poster">\s*<a href="([^"]+)"[^>]*>\s*<img[^>]*data-src="([^"]+)"[^>]*alt="([^"]+)"/gs;
  
  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    results.push({
      title: cleanTitle(match[3]),
      image: match[2].startsWith('//') ? `https:${match[2]}` : match[2],
      href: match[1].startsWith('/') ? `https://anicrush.to${match[1]}` : match[1]
    });
  }
  return results.slice(0, 20);
}

function extractDetails(html) {
  return [{
    description: safeParse(html, /<div class="description">([\s\S]*?)<\/div>/),
    aliases: safeParse(html, /<span class="aka">([\s\S]*?)<\/span>/),
    airdate: safeParse(html, /<span class="year">(\d{4})<\/span>/)
  }];
}

function extractEpisodes(html) {
  const episodes = [];
  const episodeRegex = /<a class="ep-item[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>(\d+)<\/span>/g;
  
  let match;
  while ((match = episodeRegex.exec(html)) !== null) {
    episodes.push({
      href: match[1].startsWith('/') ? `https://anicrush.to${match[1]}` : match[1],
      number: match[2]
    });
  }
  return episodes.reverse().slice(0, 500);
}

function extractStreamUrl(html) {
  try {
    // Find packed script
    const packed = html.match(/eval\(function\(p,a,c,k,e,d\){.*?}\s*\)/s)?.[0];
    if (packed) {
      const unpacked = unpackScript(packed);
      return unpacked.match(/(https:\/\/[^\s'"]+\.m3u8)/)?.[0];
    }
    
    // Fallback to direct match
    return safeParse(html, /(https:\/\/[^\s'"]+\.m3u8)/);
  } catch (e) {
    console.error('Stream extraction error:', e);
    return null;
  }
}

// ASYNC MODE FUNCTIONS
async function search(keyword) {
  try {
    const response = await fetch(
      `https://api.anicrush.to/shared/v2/movie/list?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`,
      { headers: HEADERS }
    );
    
    const data = await JSON.parse(response);
    return data.map(item => ({
      title: cleanTitle(item.title),
      image: item.thumbnail.replace('http://', 'https://'),
      href: `/movie/${item.id}`
    }));
  } catch (error) {
    console.error('[AniCrush] Search error:', error);
    return [];
  }
}

async function details(url) {
  try {
    const movieId = url.split('/movie/')[1];
    const response = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}`,
      { headers: HEADERS }
    );
    
    const data = await JSON.parse(response);
    return [{
      description: data.description || 'No description',
      aliases: data.alt_titles?.join(', ') || 'N/A',
      airdate: data.year?.toString() || 'Unknown'
    }];
  } catch (error) {
    console.error('[AniCrush] Details error:', error);
    return [];
  }
}

async function episodes(url) {
  try {
    const movieId = url.split('/movie/')[1];
    const response = await fetch(
      `https://api.anicrush.to/shared/v2/movie/${movieId}/episodes`,
      { headers: HEADERS }
    );
    
    const data = await JSON.parse(response);
    return data.map(ep => ({
      href: `/watch/${movieId}?ep=${ep.number}`,
      number: ep.number.toString()
    }));
  } catch (error) {
    console.error('[AniCrush] Episodes error:', error);
    return [];
  }
}

async function content(url) {
  try {
    const [_, movieId, episode] = url.match(/(\d+)\?ep=(\d+)/);
    const response = await fetch(
      `https://anicrush.to/embed/anime/${movieId}-${episode}`,
      { headers: { ...HEADERS, "Referer": `https://anicrush.to/movie/${movieId}` } }
    );
    
    const html = await response;
    return extractStreamUrl(html);
  } catch (error) {
    console.error('[AniCrush] Stream error:', error);
    return null;
  }
}

// EXPORT HANDLER
if (typeof module !== 'undefined') {
  module.exports = {
    searchResults,
    extractDetails,
    extractEpisodes,
    extractStreamUrl,
    search,
    details,
    episodes,
    content
  };
} else {
  Object.assign(globalThis, {
    searchResults,
    extractDetails,
    extractEpisodes,
    extractStreamUrl,
    search,
    details,
    episodes,
    content
  });
}
