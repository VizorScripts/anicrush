(function () {
  // Endpoints and base URLs.
  const SEARCH_ENDPOINT = "https://api.anicrush.to/shared/v2/movie/list";
  const EMBED_BASE_URL = "https://anicrush.to/embed/anime/";

  /**
   * Fetch helper to retrieve JSON data with custom headers.
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
   * Fetch helper to retrieve plain text with custom headers.
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
   * Endpoint: GET /shared/v2/movie/list?keyword={query}&page=1&limit=10
   */
  async function search(query) {
    const url = `${SEARCH_ENDPOINT}?keyword=${encodeURIComponent(query)}&page=1&limit=10`;
    const headers = {
      "Host": "api.anicrush.to",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/120.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive"
    };

    const data = await fetchJson(url, headers);
    if (!data) {
      console.error("Search returned no data.");
      return [];
    }
    let results = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data.data && Array.isArray(data.data)) {
      results = data.data;
    } else if (data.movies && Array.isArray(data.movies)) {
      results = data.movies;
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
   * Retrieves detailed anime information.
   * (Placeholder – adjust if a details endpoint is available.)
   */
  async function details(animeId) {
    console.log(`Fetching details for anime ID: ${animeId}`);
    return {
      id: animeId,
      title: animeId,
      description: "No description available",
      cast: [],
      genres: [],
      releaseDate: "Unknown"
    };
  }

  /**
   * Retrieves streaming source(s) for a given anime episode.
   * Constructs an embed URL using the provided anime ID and episode number.
   * The embed URL format is:
   *   https://anicrush.to/embed/anime/<kebab-case-anime-id>-<episode-number>
   * and fetches the page with the required Referer header.
   */
  async function content(animeId, episode) {
    const kebabId = toKebabCase(animeId);
    const embedUrl = `${EMBED_BASE_URL}${encodeURIComponent(kebabId)}-${encodeURIComponent(episode)}`;
    const headers = { "Referer": "https://anicrush.to/" };
    const html = await fetchText(embedUrl, headers);
    if (!html) {
      console.error("Failed to fetch embed page HTML");
      return [];
    }
    const streamUrl = extractStreamUrl(html);
    return [{ url: streamUrl, quality: "720p", type: "HLS" }];
  }

  /**
   * Extracts and deobfuscates the stream URL from HTML.
   * It searches for a packed script (using eval(function(p,a,c,k,e,d)...))
   * and extracts the URL using regex.
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

  // UMD-style export using globalThis.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { search, details, content, extractStreamUrl };
  } else if (typeof globalThis !== "undefined") {
    globalThis.search = search;
    globalThis.details = details;
    globalThis.content = content;
    globalThis.extractStreamUrl = extractStreamUrl;
  } else {
    this.search = search;
    this.details = details;
    this.content = content;
    this.extractStreamUrl = extractStreamUrl;
  }
})();
