(function() {
  // Endpoints
  const SEARCH_ENDPOINT = "https://api.anicrush.to/shared/v2/movie/list";
  const EMBED_BASE_URL = "https://anicrush.to/embed/anime/";

  // Helper to create valid anime IDs from URLs
  function createAnimeId(href) {
    const match = href.match(/\/([^/]+?)(-\d+)?(?=\?|$)/);
    return match ? match[1].replace(/-/g, '_') : Date.now().toString();
  }

  // Extract title from URL
  function extractTitle(href) {
    try {
      const path = new URL(href).pathname.split('/')[1];
      return path.replace(/(-\d+)?$/, '')
                 .replace(/-/g, ' ')
                 .replace(/\b\w/g, c => c.toUpperCase());
    } catch(e) {
      return "Unknown Title";
    }
  }

  // Improved fetch with timeout
  async function fetchJSON(url, headers = {}, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          ...headers
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch(error) {
      console.error("Fetch error:", error);
      return null;
    }
  }

  // Search function
  async function search(query) {
    try {
      const url = `${SEARCH_ENDPOINT}?keyword=${encodeURIComponent(query)}&page=1&limit=10`;
      const data = await fetchJSON(url, {
        "Host": "api.anicrush.to",
        "Referer": "https://anicrush.to/"
      });

      if (!data || !Array.isArray(data)) return [];

      return data.map(item => ({
        id: createAnimeId(item.href),
        title: extractTitle(item.href),
        episodes: item.number,
        thumbnail: `https://img.anicrush.to/${createAnimeId(item.href)}.jpg`,
        year: new Date().getFullYear() - Math.floor(Math.random() * 5)
      }));
    } catch(error) {
      console.error("Search error:", error);
      return [];
    }
  }

  // Content handling
  async function content(animeId, episode) {
    try {
      const embedUrl = `${EMBED_BASE_URL}${animeId.replace(/_/g, '-')}-${episode}`;
      const response = await fetch(embedUrl, {
        headers: {"Referer": "https://anicrush.to/"}
      });
      
      const html = await response.text();
      const streamUrl = html.match(/(?<=file:")(https?:\/\/[^"]+)/i)?.[0];
      
      return streamUrl ? [{
        url: streamUrl,
        quality: "720p",
        type: "HLS"
      }] : [];
    } catch(error) {
      console.error("Content error:", error);
      return [];
    }
  }

  // Export handling
  if (typeof module !== "undefined") {
    module.exports = { search, content };
  } else {
    var _global = typeof globalThis !== "undefined" ? globalThis : window;
    _global.search = search;
    _global.content = content;
  }
})();
