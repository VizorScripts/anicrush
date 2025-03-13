(function () {
  // Base URLs
  const API_BASE_URL = "https://anicrush.ayoko.fun/"; // For details, etc.
  const EMBED_BASE_URL = "https://anicrush.to/";       // For embed/streaming
  // Search endpoint using the provided server example:
  const SEARCH_ENDPOINT = "https://api.anicrush.to/shared/v2/movie/list";

  /**
   * Helper to fetch JSON data with custom headers.
   */
  async function fetchJson(url, headers = {}) {
    try {
      console.log(`Fetching JSON: ${url}`);
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("API Response:", data);
      return data;
    } catch (err) {
      console.error("Fetch JSON error:", err);
      return null;
    }
  }

  /**
   * Helper to fetch plain text with custom headers.
   */
  async function fetchText(url, headers = {}) {
    try {
      console.log(`Fetching text: ${url}`);
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const text = await response.text();
      console.log("Fetched HTML content");
      return text;
    } catch (err) {
      console.error("Fetch text error:", err);
      return null;
    }
  }

  /**
   * Converts a string to kebab-case.
   */
  function toKebabCase(str) {
    return str.trim().toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Searches for anime/movies using the AniCrush shared API.
   * Uses the endpoint:
   *   https://api.anicrush.to/shared/v2/movie/list?keyword={query}&page=1&limit=10
   * with custom headers.
   */
  async function search(query) {
    const url = `${SEARCH_ENDPOINT}?keyword=${encodeURIComponent(query)}&page=1&limit=10`;
    // Define headers as in your example:
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/120.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "DNT": "1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "x-site": "anicrush",
      "X-Requested-With": "XMLHttpRequest"
    };

    const data = await fetchJson(url, headers);
    if (!data) {
      console.error("Search returned no data.");
      return [];
    }
    // Assuming the API returns an object with a "data" property as an array.
    let results = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data.data && Array.isArray(data.data)) {
      results = data.data;
    } else {
      console.error("Search response structure not recognized:", data);
      return [];
    }
    console.log(`Found ${results.length} results for query "${query}"`);
    return results.map(item => ({
      id: item.id || item._id,
      title: item.title || item.name,
      description: item.description || "",
      thumbnail: item.thumbnail || item.image || "",
      year: item.year || "Unknown"
    }));
  }

  /**
   * Retrieves detailed anime info.
   * Endpoint: GET /api/v1/scraper/anime/:id
   */
  async function details(animeId) {
    const url = `${API_BASE_URL}api/v1/scraper/anime/${encodeURIComponent(animeId)}`;
    const data = await fetchJson(url);
    if (!data || !data.title) {
      console.error("Invalid details response:", data);
      return {};
    }
    return {
      id: data.id || animeId,
      title: data.title,
      description: data.description || "No description available",
      cast: data.cast || [],
      genres: data.genres || [],
      releaseDate: data.release_date || "Unknown"
    };
  }

  /**
   * Retrieves streaming source(s) for a given anime episode.
   * Builds an embed URL using the provided anime ID and episode number.
   * A required Referer header is added when fetching the embed page.
   */
  async function content(animeId, episode) {
    const url = `${EMBED_BASE_URL}embed/anime/${encodeURIComponent(animeId)}-${encodeURIComponent(episode)}`;
    const headers = { "Referer": "https://anicrush.to/" };
    const html = await fetchText(url, headers);
    if (!html) {
      console.error("Failed to fetch embed page HTML");
      return [];
    }
    const streamUrl = extractStreamUrl(html);
    return [{ url: streamUrl, quality: "720p", type: "HLS" }];
  }

  /**
   * Extracts and deobfuscates the stream URL from HTML.
   * It finds a packed script (eval(function(p,a,c,k,e,d)...)) and evaluates it,
   * then extracts the stream URL using regex.
   */
  function extractStreamUrl(html) {
    const scriptMatch = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      console.log("No packed script found");
      return JSON.stringify({ stream: 'N/A' });
    }
    try {
      const unpackedScript = eval(scriptMatch[1]);
      const streamMatch = unpackedScript.match(/(?<=file:")[^"]+/);
      const stream = streamMatch ? streamMatch[0].trim() : 'N/A';
      console.log("Extracted stream URL:", stream);
      return stream;
    } catch (e) {
      console.error("Error unpacking script:", e);
      return JSON.stringify({ stream: 'N/A' });
    }
  }

  // Export functions for Sora.
  export { search, details, content, extractStreamUrl };
})();
