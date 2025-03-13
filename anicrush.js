// Universal Helper Functions
const cleanTitle = (title) => title
  .replace(/&#(8211|8217);/g, m => ({'8211': '-', '8217': "'"})[m])
  .replace(/&#\d+;/g, '');

const safeParse = (html, regex, group = 1) => (html.match(regex) || [])[group] || '';

// Normal Mode Functions
function searchResults(html) {
  const results = [];
  const itemRegex = /<div class="movie-item"[^>]*>[\s\S]*?<\/div>/g;
  
  (html.match(itemRegex) || []).forEach(item => {
    results.push({
      title: cleanTitle(safeParse(item, /alt="([^"]+)"/)),
      image: safeParse(item, /data-src="([^"]+)"/),
      href: safeParse(item, /href="([^"]+)"/)
    });
  });
  
  return results;
}

function extractDetails(html) {
  return [{
    description: safeParse(html, /<div class="desc"[^>]*>([\s\S]*?)<\/div>/),
    aliases: safeParse(html, /<div class="aka"[^>]*>([\s\S]*?)<\/div>/),
    airdate: safeParse(html, /<span class="year">(\d{4})<\/span>/)
  }];
}

function extractEpisodes(html) {
  const episodes = [];
  const episodeRegex = /<a class="ep-item"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span>(\d+)<\/span>/g;
  
  let match;
  while ((match = episodeRegex.exec(html)) {
    episodes.push({
      href: match[1],
      number: match[2]
    });
  }
  
  return episodes.reverse();
}

function extractStreamUrl(html) {
  return safeParse(html, /(https:\/\/[^\s'"]+\.m3u8)/);
}

// Async Mode Functions
async function asyncSearch(keyword) {
  const response = await fetch(`https://api.anicrush.to/shared/v2/movie/list?keyword=${encodeURIComponent(keyword)}&page=1&limit=10`, {
    headers: {
      "Referer": "https://anicrush.to/",
      "X-Requested-With": "XMLHttpRequest"
    }
  });
  
  const data = await JSON.parse(response);
  return data.map(item => ({
    title: item.title,
    image: item.thumbnail,
    href: `${item.id}`
  }));
}

async function asyncDetails(url) {
  const response = await fetch(`https://api.anicrush.to/shared/v2/movie/${url.split('/').pop()}`, {
    headers: {"Referer": "https://anicrush.to/"}
  });
  
  const data = await JSON.parse(response);
  return [{
    description: data.description,
    aliases: data.alt_titles.join(', '),
    airdate: data.year
  }];
}

async function asyncEpisodes(url) {
  const response = await fetch(`https://api.anicrush.to/shared/v2/movie/${url.split('/').pop()}/episodes`);
  const data = await JSON.parse(response);
  
  return data.map(ep => ({
    href: `${url}?ep=${ep.number}`,
    number: ep.number
  }));
}

async function asyncStream(url) {
  const embedUrl = `https://anicrush.to/embed/anime/${url.split('/').pop()}`;
  const response = await fetch(embedUrl, {
    headers: {"Referer": "https://anicrush.to/"}
  });
  
  return extractStreamUrl(await response);
}

// Universal Export Handler
const exportForSora = () => ({
  // Normal Mode Exports
  searchResults: typeof html !== 'undefined' ? searchResults : null,
  extractDetails: typeof html !== 'undefined' ? extractDetails : null,
  extractEpisodes: typeof html !== 'undefined' ? extractEpisodes : null,
  extractStreamUrl: typeof html !== 'undefined' ? extractStreamUrl : null,
  
  // Async Mode Exports
  search: asyncSearch,
  details: asyncDetails,
  content: asyncStream,
  episodes: asyncEpisodes
});

typeof module !== 'undefined' ? module.exports = exportForSora() : Object.assign(globalThis, exportForSora());
