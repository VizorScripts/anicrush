(function () {
  // Set the base URL for the AniCrush API.
  // (This API instance is hosted at anicrush.ayoko.fun; the embed endpoint is assumed to be on anicrush.to)
  const API_BASE_URL = "https://anicrush.ayoko.fun/";
  const EMBED_BASE_URL = "https://anicrush.to/";

  // Fetch helper: logs the URL and returns parsed JSON or null on error.
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
    } catch (error) {
      console.error("Fetch error:", error);
      return null;
    }
  }

  // Search for anime using the AniCrush API.
  async function search(query) {
    // Endpoint: GET /api/v1/scraper/search/:query
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

  // Retrieve detailed info for a given anime by its ID.
  async function details(animeId) {
    // Endpoint: GET /api/v1/scraper/anime/:id
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

  // Returns streaming source for a specific anime episode.
  async function content(animeId, episode) {
    // For streaming, use the embed endpoint: 
    // Expected format: /embed/anime/{link_url}-{episode}
    const url = `${EMBED_BASE_URL}embed/anime/${encodeURIComponent(animeId)}-${encodeURIComponent(episode)}`;
    // Here we return an object with the URL; further processing (like resolving stream URLs) can be done by extractStreamUrl.
    return [{ url, quality: "720p", type: "HLS" }];
  }

  // Extract the stream URL from HTML content (handles deobfuscation if needed).
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
      console.log(stream);
      return stream;
    } catch (e) {
      console.error("Error unpacking script:", e);
      return JSON.stringify({ stream: 'N/A' });
    }
  }

  // Export the functions for use by the Sora media app.
  export { search, details, content, extractStreamUrl };
})();
