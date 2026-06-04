async function loadLatest() {
  try {
    const response = await fetch("./latest.json", { cache: "no-store" });
    if (!response.ok) return;
    const latest = await response.json();
    const server = document.querySelector("#serverDownload");
    const client = document.querySelector("#clientDownload");
    if (latest.server?.url) server.href = latest.server.url;
    if (latest.client?.url) client.href = latest.client.url;
  } catch {
    // Static fallback links remain usable.
  }
}

loadLatest();
