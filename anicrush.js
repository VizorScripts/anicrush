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
  while ((match = episodeRegex.exec(html))) { // Fixed parenthesis
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

// Rest of the async functions remain the same...

// Universal Export Handler
typeof module !== 'undefined' ? module.exports = {
  searchResults,
  extractDetails,
  extractEpisodes,
  extractStreamUrl,
  search: asyncSearch,
  details: asyncDetails,
  content: asyncStream,
  episodes: asyncEpisodes
} : Object.assign(globalThis, {
  searchResults,
  extractDetails,
  extractEpisodes,
  extractStreamUrl,
  search: asyncSearch,
  details: asyncDetails,
  content: asyncStream,
  episodes: asyncEpisodes
});
