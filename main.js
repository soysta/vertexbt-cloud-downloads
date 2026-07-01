function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeUrl(value, fallback) {
  const text = String(value || "");
  if (text.startsWith("https://github.com/") || text.startsWith("https://api.github.com/")) return escapeHtml(text);
  return escapeHtml(fallback);
}

const releaseRepo = "soysta/vertexbt-cloud-downloads";
const releasesUrl = `https://api.github.com/repos/${releaseRepo}/releases?per_page=8`;
const allReleasesUrl = `https://github.com/${releaseRepo}/releases`;

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function assetByKind(assets = [], kind) {
  return assets.find((asset) => {
    const name = String(asset.name || "").toLowerCase();
    return name.endsWith(".msi") && name.includes(kind);
  });
}

function releaseAssetButton(asset, label) {
  if (!asset) {
    return `<span class="release-missing">${escapeHtml(label)} yok</span>`;
  }

  return `<a class="release-download" href="${escapeUrl(asset.browser_download_url, allReleasesUrl)}">${escapeHtml(label)} indir</a>`;
}

function releaseTitle(release) {
  return release.name || release.tag_name || "Sürüm";
}

function renderReleaseArchive(releases) {
  const archive = document.querySelector("#releaseArchive");
  if (!archive) return;

  const visibleReleases = releases.filter((release) => !release.draft).slice(0, 8);

  if (!visibleReleases.length) {
    archive.innerHTML = `
      <article class="release-card">
        <div>
          <span>Arşiv boş</span>
          <strong>Henüz yayınlanmış paket bulunamadı.</strong>
        </div>
        <a class="release-download" href="${escapeHtml(allReleasesUrl)}">GitHub'da aç</a>
      </article>
    `;
    return;
  }

  archive.innerHTML = visibleReleases
    .map((release, index) => {
      const serverAsset = assetByKind(release.assets, "server");
      const clientAsset = assetByKind(release.assets, "client");
      const badge = index === 0 ? "Güncel" : "Eski sürüm";
      const publishedAt = formatDate(release.published_at || release.created_at);
      const notesUrl = escapeUrl(release.html_url, allReleasesUrl);

      return `
        <article class="release-card">
          <div class="release-card-main">
            <span>${escapeHtml(badge)}</span>
            <strong>${escapeHtml(releaseTitle(release))}</strong>
            <small>${escapeHtml(publishedAt)}</small>
          </div>
          <div class="release-card-actions">
            ${releaseAssetButton(serverAsset, "Server")}
            ${releaseAssetButton(clientAsset, "Client")}
            <a class="release-notes" href="${notesUrl}">Notlar</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadReleaseArchive() {
  const archive = document.querySelector("#releaseArchive");
  if (!archive) return;

  try {
    try {
      renderReleaseArchive(await fetchJsonWithTimeout(`./versions.json?v=${Date.now()}`, { cache: "no-store" }));
      return;
    } catch {
      renderReleaseArchive(await fetchJsonWithTimeout(`${releasesUrl}&v=${Date.now()}`, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store"
      }));
    }
  } catch {
    archive.innerHTML = `
      <article class="release-card">
        <div>
          <span>Arşiv alınamadı</span>
          <strong>GitHub sürüm sayfasından tüm paketlere ulaşabilirsiniz.</strong>
        </div>
        <a class="release-download" href="${escapeHtml(allReleasesUrl)}">Tüm sürümler</a>
      </article>
    `;
  }
}

async function loadLatest() {
  const releaseInfo = document.querySelector("#releaseInfo");

  try {
    const response = await fetch(`./latest.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;

    const latest = await response.json();
    const server = document.querySelector("#serverDownload");
    const client = document.querySelector("#clientDownload");

    if (latest.server?.url) server.href = latest.server.url;
    if (latest.client?.url) client.href = latest.client.url;

    const version = latest.tag || latest.version || "Güncel";
    const serverSize = formatBytes(latest.server?.size);
    const clientSize = formatBytes(latest.client?.size);

    setText("#releaseVersion", version);
    setText("#releaseDate", formatDate(latest.releasedAt));
    setText("#serverPackageName", `${latest.server?.fileName || "Server MSI"}${serverSize ? ` · ${serverSize}` : ""}`);
    setText("#clientPackageName", `${latest.client?.fileName || "Client MSI"}${clientSize ? ` · ${clientSize}` : ""}`);

    if (releaseInfo) {
      releaseInfo.textContent = `Son sürüm ${version} · Server ${serverSize} · Client ${clientSize}`;
    }
  } catch {
    if (releaseInfo) releaseInfo.textContent = "Son sürüm bilgisi alınamadı; release sayfasından indirebilirsiniz.";
    setText("#releaseVersion", "Release sayfası");
  }
}

loadLatest();
loadReleaseArchive();
