(function () {
  // Base URLs for API and embed endpoints.
  const API_BASE_URL = "https://anicrush.ayoko.fun/"; // AniCrush API endpoint from shimizudev/anicrush-api
  const EMBED_BASE_URL = "https://anicrush.to/";         // Embed endpoint for streaming links

  /**
   * Fetch helper to retrieve JSON data.
   */
  async function fetchJson(url) {
    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("API Response:", data);
      return data;
    } catch (err) {
      console.error("Fetch error:", err);
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
   * Searches for anime using the AniCrush API.
   * Endpoint: GET /api/v1/scraper/search/:query
   */
  async function search(query) {
    const url = `${API_BASE_URL}api/v1/scraper/search/${encodeURIComponent(query)}`;
    const data = await fetchJson(url);
    if (!data) {
      console.error("Invalid search response:", data);
      return [];
    }
    // Check if the API returned an array directly or an object with a "results" property.
    let results = [];
    if (Array.isArray(data)) {
      results = data;
    } else if (data.results && Array.isArray(data.results)) {
      results = data.results;
    } else {
      console.error("Search response structure not recognized:", data);
      return [];
    }
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
    // Add the required Referer header.
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
   * then uses a regex to extract the URL.
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

  // Export functions for the Sora media app.
  export { search, details, content, extractStreamUrl };
})();
