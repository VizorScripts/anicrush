(function () {
  // Base URLs for API and embed endpoints.
  const API_BASE_URL = "https://anicrush.ayoko.fun/"; // API host for search, details, etc.
  const EMBED_BASE_URL = "https://anicrush.to/"; // Used to build embed URLs

  /**
   * Fetch helper to retrieve JSON.
   */
  async function fetchJson(url) {
    try {
      console.log(`Fetching: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
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
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const text = await response.text();
      console.log("Fetched HTML content");
      return text;
    } catch (err) {
      console.error("Fetch text error:", err);
      return null;
    }
  }

  /**
   * Search for anime using the AniCrush API.
   * Endpoint: GET /api/v1/scraper/search/:query
   */
  async function search(query) {
    const url = `${API_BASE_URL}api/v1/scraper/search/${encodeURIComponent(query)}`;
    const data = await fetchJson(url);
    if (!data || !data.results) {
      console.error("Invalid search response:", data);
      return [];
    }
    return data.results.map(item => ({
      id: item.id || item._id,
      title: item.title || item.name,
      description: item.description || "",
      thumbnail: item.thumbnail || item.image || "",
      year: item.year || "Unknown"
    }));
  }

  /**
   * Get detailed info for a specific anime.
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
   * Get streaming source for a specific anime episode.
   * Uses the embed endpoint:
   *   /embed/anime/{link_url}-{episode}
   * Note: This endpoint requires a header (e.g., Referer).
   */
  async function content(animeId, episode) {
    const url = `${EMBED_BASE_URL}embed/anime/${encodeURIComponent(animeId)}-${encodeURIComponent(episode)}`;
    // The embed page requires a Referer header for proper response.
    const headers = { "Referer": "https://anicrush.to/" };
    const html = await fetchText(url, headers);
    if (!html) {
      console.error("Failed to fetch embed page HTML");
      return [];
    }
    // Extract and deobfuscate the stream URL from the HTML.
    const streamUrl = extractStreamUrl(html);
    return [{ url: streamUrl, quality: "720p", type: "HLS" }];
  }

  /**
   * Extracts and deobfuscates the stream URL from HTML.
   * It looks for a packed script (using eval(function(p,a,c,k,e,d)) and evaluates it,
   * then extracts the stream URL using a regex.
   */
  function extractStreamUrl(html) {
    const scriptMatch = html.match(/<script[^>]*>\s*(eval\(function\(p,a,c,k,e,d[\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      console.log("No packed script found");
      return JSON.stringify({ stream: 'N/A' });
    }
    try {
      // This eval deobfuscates the packed script.
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

  // Export the functions for the Sora media app.
  export { search, details, content, extractStreamUrl };
})();
