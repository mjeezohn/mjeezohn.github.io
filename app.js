"use strict";

/** Landing preview: four latest regular videos, then two latest confirmed Shorts. */
const LIBRARY_LIMIT = 6;
const REGULAR_LIMIT = 4;
const SHORTS_LIMIT = 2;
const CHANNEL_SHORTS_URL = "https://www.youtube.com/@mjeezohn/shorts";
let releases = [];
let showShortsCollection = false;
const grid = document.getElementById("release-grid");
const emptyState = document.getElementById("library-empty");
const libraryFootnote = document.getElementById("library-footnote");
const libraryMvCount = document.getElementById("library-mv-count");
const libraryShortsCount = document.getElementById("library-shorts-count");

function showLibraryState(title, description) {
  if (!emptyState) return;
  const heading = emptyState.querySelector("h3");
  const detail = emptyState.querySelector("p");
  if (heading) heading.textContent = title;
  if (detail) detail.textContent = description;
  emptyState.hidden = false;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function renderShortsCollectionCard() {
  return `<article class="release-card release-card-shorts-more">
    <div class="release-art art-three" aria-hidden="true">
      <span class="art-rings"></span><span class="art-symbol">▶</span>
      <span class="art-credit"><span>MJEEZOHN STUDIO</span><span>SHORTS COLLECTION</span></span>
    </div>
    <div class="release-body">
      <div class="release-tags"><span class="release-tag">YouTube Shorts</span>
        <span class="release-tag status">คลิปสั้น</span></div>
      <h3>ดู Shorts เพิ่มเติม</h3>
      <p>สำรวจคลิปสั้นจากช่อง mJeeZohn Music Official ผ่าน YouTube</p>
      <a class="release-action" href="${CHANNEL_SHORTS_URL}" target="_blank" rel="noopener noreferrer">
        เปิดช่อง Shorts <span class="small-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </article>`;
}

function getVideoUrl(item) {
  return item.status === "published" && /^https:\/\/www\.youtube\.com\/(?:shorts\/[A-Za-z0-9_-]{11}|watch\?v=[A-Za-z0-9_-]{11})$/.test(item.url || "") ? item.url : null;
}

function renderCard(item) {
  const published = item.status === "published";
  const thumbnail = item.thumbnail && /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/.test(item.thumbnail) ? item.thumbnail : null;
  const safeUrl = getVideoUrl(item);
  const shorts = item.kind === "shorts";
  const publishedDate = item.publishedAt && !Number.isNaN(Date.parse(item.publishedAt))
    ? new Date(item.publishedAt).toLocaleDateString("th-TH", {day:"numeric",month:"short",year:"numeric"}) : "";
  const seconds = Number.isFinite(item.durationSeconds) ? item.durationSeconds : null;
  const duration = seconds == null ? "" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const durationBadge = duration ? `<span class="release-duration">${escapeHTML(duration)}</span>` : "";
  const action = safeUrl
    ? `<a class="release-action" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">ดูวิดีโอ YouTube <span class="small-arrow" aria-hidden="true">↗</span></a>`
    : '<div class="release-action is-inactive"><span>ติดตามความคืบหน้า</span><span class="small-arrow" aria-hidden="true">✳</span></div>';
  return `<article class="release-card">
    <div class="release-art art-${escapeHTML(item.art)}">
      ${thumbnail ? `<img class="release-thumbnail" src="${escapeHTML(thumbnail)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
      <span class="release-kind">${shorts ? "SHORTS" : "MUSIC VIDEO"}</span>
      ${durationBadge}
      ${safeUrl ? `<a class="release-cover-link" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="เปิด ${escapeHTML(item.title)} บน YouTube ในแท็บใหม่"><span class="release-cover-play" aria-hidden="true">▶</span></a>` : ""}
      <span class="art-rings"></span><span class="art-number">MZ / ${escapeHTML(item.id)}</span>
      <span class="art-symbol">${escapeHTML(item.symbol)}</span>
      <span class="art-credit"><span>MJEEZOHN STUDIO</span><span>CREATIVE ARCHIVE</span></span>
    </div>
    <div class="release-body">
      <div class="release-tags"><span class="release-tag">${escapeHTML(item.genre)}</span>${publishedDate ? `<time class="release-date" datetime="${escapeHTML(item.publishedAt.slice(0,10))}">${escapeHTML(publishedDate)}</time>` : ""}</div>
      <h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p>${action}
    </div></article>`;
}
function renderLibrary() {
  const latest = releases.slice(0, LIBRARY_LIMIT);
  const collectionCard = showShortsCollection ? renderShortsCollectionCard() : "";
  if (grid) grid.innerHTML = latest.map(renderCard).join("") + collectionCard;
  if (emptyState) emptyState.hidden = latest.length > 0 || showShortsCollection;
}

// Use the actual public avatar provided by the channel's YouTube Data API snippet.
// Never substitute an unrelated image; retain the existing mark if retrieval fails.
function applyChannelAvatar(avatarUrl) {
  if (typeof avatarUrl !== "string") return;
  let url;
  try {
    url = new URL(avatarUrl);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !(
      hostname === "yt3.ggpht.com" ||
      hostname === "yt3.googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com") ||
      hostname.endsWith(".ggpht.com")
    )) return;
  } catch {
    return;
  }

  const preview = new Image();
  preview.onload = () => {
    document.querySelectorAll("[data-channel-avatar]").forEach((img) => {
      img.src = url.href;
      img.hidden = false;
    });
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.removeAttribute("type");
      favicon.href = url.href;
    }
  };
  preview.src = url.href;
}


function updateLatestAndFeatured(uploaded) {
  const latest = uploaded.find(v => v.kind !== "shorts") || uploaded[0];
  if (!latest || !/^[A-Za-z0-9_-]{11}$/.test(latest.id)) return;
  const href = latest.kind === "shorts" ? `https://www.youtube.com/shorts/${latest.id}`
    : `https://www.youtube.com/watch?v=${latest.id}`;
  const title = latest.title || "ผลงานล่าสุดจาก MjeeZohn Studio";
  const hero = document.getElementById("hero-feature");
  const heroTitle = document.getElementById("hero-feature-title");
  const heroImage = document.getElementById("hero-feature-image");
  if (hero && heroTitle && heroImage) {
    hero.href = href;
    heroTitle.textContent = title;
    heroImage.src = `https://i.ytimg.com/vi/${latest.id}/mqdefault.jpg`;
    heroImage.alt = "ภาพปก " + title;
    hero.hidden = false;
  }

  const titleNode = document.getElementById("featured-video-title");
  const descNode = document.getElementById("featured-video-description");
  const kindNode = document.getElementById("featured-video-kind");
  const formatNode = document.getElementById("featured-video-format");
  const play = document.getElementById("featured-video-play");
  const link = document.getElementById("featured-video-link");
  const backdrop = document.getElementById("featured-video-image");
  if (titleNode) titleNode.textContent = title;
  if (descNode) descNode.textContent = latest.description ||
    "รับชมเพลงและวิดีโอล่าสุดจาก mJeeZohn Music Official";
  if (kindNode) kindNode.textContent = latest.kind === "shorts" ? "YOUTUBE SHORTS" : "MUSIC VIDEO";
  if (formatNode) formatNode.textContent = latest.kind === "shorts" ? "SHORTS" : "MUSIC VIDEO";
  if (play) {
    play.dataset.youtubeId = latest.id;
    play.setAttribute("aria-label", "เล่นวิดีโอ " + title);
  }
  if (link) link.href = href;
  if (backdrop) {
    backdrop.style.backgroundImage =
      `linear-gradient(180deg,rgba(8,8,12,.12),rgba(8,8,12,.65)),url("https://i.ytimg.com/vi/${latest.id}/hqdefault.jpg")`;
    backdrop.style.backgroundSize = "cover";
    backdrop.style.backgroundPosition = "center";
    backdrop.setAttribute("aria-label", "ภาพปกวิดีโอ " + title);
  }
}

async function loadYouTubeCatalogue() {
  try {
    const response = await fetch("./data/youtube.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Catalogue unavailable");
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !Array.isArray(data.videos) || !data.syncedAt) throw new Error("Invalid catalogue");
    applyChannelAvatar(data.channel?.avatarUrl);
    // Pin regular uploads in slots 1–4 and confirmed Shorts in slots 5–6.
    // The YouTube Data API does not expose an authoritative Shorts flag; only
    // records verified as 'shorts' by the channel sync are treated as Shorts.
    const uploaded = data.videos
      .filter((video) => /^[A-Za-z0-9_-]{11}$/.test(video.id || "") &&
        typeof video.title === "string")
      .sort((left, right) => (Date.parse(right.publishedAt || "") || 0) -
        (Date.parse(left.publishedAt || "") || 0));
    const regular = uploaded.filter((video) => video.kind !== "shorts").slice(0, REGULAR_LIMIT);
    const shorts = uploaded.filter((video) => video.kind === "shorts").slice(0, SHORTS_LIMIT);
    const mapped = [...regular, ...shorts].map((v, index) => ({
      id: v.id,
      title: v.title,
      description: v.description || "รับชมผลงานจากช่อง YouTube MjeeZohn Studio",
      genre: v.kind === "shorts" ? "YouTube Shorts" : "Music Video",
      category: "video",
      kind: v.kind,
      status: "published",
      art: ["one", "two", "three"][index % 3],
      symbol: v.kind === "shorts" ? "▶" : "♫",
      keywords: v.title + " YouTube",
      thumbnail: v.thumbnail,
      publishedAt: v.publishedAt,
      durationSeconds: v.durationSeconds,
      url: v.url
    }));
    // Maintain six tiles without misrepresenting a regular video as a Short.
    // With only one confirmed Short, slot six links to the real Shorts channel.
    showShortsCollection = regular.length === REGULAR_LIMIT &&
      shorts.length === 1;
    releases = mapped;
    if (libraryMvCount) libraryMvCount.textContent = String(regular.length);
    if (libraryShortsCount) libraryShortsCount.textContent = String(shorts.length);
    updateLatestAndFeatured(uploaded);
    if (libraryFootnote) {
      libraryFootnote.textContent = "✳ เพลงล่าสุด " + regular.length + " รายการ • Shorts " + shorts.length +
        " รายการ" + (showShortsCollection ? " • ดู Shorts เพิ่มเติมได้จากช่อง YouTube" : "") +
        " • ผลงานสาธารณะทั้งหมด " + uploaded.length + " รายการ • อัปเดต " +
        new Date(data.syncedAt).toLocaleDateString("th-TH");
    }
    if (mapped.length === 0) {
      showLibraryState("ยังไม่พบเพลงที่เผยแพร่", "กดดูเพลงอื่นๆ เพื่อเปิดช่อง YouTube");
    }
    renderLibrary();
  } catch (error) {
    showLibraryState("ไม่สามารถโหลดเพลงล่าสุดได้", "กดดูเพลงอื่นๆ เพื่อเปิดรายการบน YouTube โดยตรง");
    console.warn("YouTube catalogue unavailable; open the channel for all music.");
  }
}
loadYouTubeCatalogue();

const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
function setMenu(open) {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง");
  mobileNav.hidden = !open;
  if (open) mobileNav.querySelector("a")?.focus();
}
menuButton?.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
// Keep background document navigation and focus predictable on mobile.
mobileNav?.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || mobileNav.hidden) return;
  const focusable = [...mobileNav.querySelectorAll("a")];
  if (!focusable.length) return;
  if (event.shiftKey && document.activeElement === focusable[0]) {
    event.preventDefault(); menuButton?.focus();
  } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
    event.preventDefault(); menuButton?.focus();
  }
});
mobileNav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menuButton.focus();
  }
});
window.addEventListener("resize", () => { if (innerWidth > 760) setMenu(false); });

const navLinks = [...document.querySelectorAll(".desktop-nav a")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    for (const link of navLinks) link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
  }, { rootMargin: "-20% 0px -50% 0px", threshold: [0, .1, .4] });
  for (const id of ["home", "music", "videos", "studio"]) {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  }
}

// Load YouTube only after the visitor requests playback.
// The default youtube-nocookie embed minimizes third-party requests before consent.
document.querySelectorAll("[data-youtube-id]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.youtubeId || "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const stage = button.closest("#video-stage");
    if (!stage) return;
    const iframe = document.createElement("iframe");
    iframe.className = "video-frame";
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = "MjeeZohn Studio — " + (document.getElementById("featured-video-title")?.textContent || "Music Video");
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    stage.replaceChildren(iframe);
  }, { once: true });
});
const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());
