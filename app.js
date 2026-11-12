"use strict";

/**
 * MjeeZohn Studio catalogue
 * To add a verified release, add an entry below with its real title, credits
 * and published URL. Placeholder concepts must retain status: "in-production".
 */
let releases = [
  {
    id: "001",
    title: "สิบปีแล้วเนาะ…",
    description: "แนวคิดบทเพลงเกี่ยวกับความทรงจำและการกลับมาพบกันอีกครั้ง",
    genre: "Modern Isan Ballad",
    category: "concept",
    status: "in-production",
    art: "one",
    symbol: "๑๐",
    keywords: "สิบปีแล้วเนาะ ความทรงจำ พบกันอีกครั้ง พิณ แคน",
    url: null
  },
  {
    id: "002",
    title: "มนต์เสียงพิณในจังหวะใหม่",
    description: "แนวทางสร้างสรรค์เสียงดนตรีอีสานผสม R&B และกีตาร์ร่วมสมัย",
    genre: "Isan × R&B",
    category: "concept",
    status: "in-production",
    art: "two",
    symbol: "♫",
    keywords: "พิณ แคน R&B อีสาน ดนตรีร่วมสมัย",
    url: null
  },
  {
    id: "003",
    title: "Music Video Teaser",
    description: "รับชมทีเซอร์มิวสิกวิดีโอผ่าน YouTube Shorts",
    genre: "Visual Story",
    category: "video",
    status: "published",
    art: "three",
    symbol: "▶",
    keywords: "ทีเซอร์ มิวสิกวิดีโอ วิดีโอ YouTube Shorts",
    url: "https://www.youtube.com/shorts/U_DMV9IbOGU"
  }
];

const grid = document.getElementById("release-grid");
const emptyState = document.getElementById("library-empty");
const searchInput = document.getElementById("library-search");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
let activeFilter = "all";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function renderCard(item) {
  const published = item.status === "published";
  const thumbnail = item.thumbnail && /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/.test(item.thumbnail) ? item.thumbnail : null;
  const safeUrl = published && /^https:\/\/www\.youtube\.com\/(?:shorts\/[A-Za-z0-9_-]{11}|watch\?v=[A-Za-z0-9_-]{11})$/.test(item.url || "") ? item.url : null;
  const action = safeUrl
    ? `<a class="release-action" href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">ดูวิดีโอ YouTube <span class="small-arrow" aria-hidden="true">↗</span></a>`
    : '<div class="release-action is-inactive"><span>ติดตามความคืบหน้า</span><span class="small-arrow" aria-hidden="true">✳</span></div>';
  return `<article class="release-card">
    <div class="release-art art-${escapeHTML(item.art)}" aria-hidden="true">
      ${thumbnail ? `<img class="release-thumbnail" src="${escapeHTML(thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
      <span class="art-rings"></span><span class="art-number">MZ / ${escapeHTML(item.id)}</span>
      <span class="art-symbol">${escapeHTML(item.symbol)}</span>
      <span class="art-credit"><span>MJEEZOHN STUDIO</span><span>CREATIVE ARCHIVE</span></span>
    </div>
    <div class="release-body">
      <div class="release-tags"><span class="release-tag">${escapeHTML(item.genre)}</span>
      <span class="release-tag status">${published ? "มีวิดีโอให้ชม" : "ระหว่างพัฒนา"}</span></div>
      <h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p>${action}
    </div></article>`;
}
function renderLibrary() {
  const q = (searchInput?.value || "").normalize("NFKC").trim().toLocaleLowerCase("th");
  const items = releases.filter((item) => {
    const matchesCategory = activeFilter === "all" || item.category === activeFilter || (activeFilter === "shorts" && item.kind === "shorts");
    const haystack = [item.title, item.genre, item.description, item.keywords || ""].join(" ").normalize("NFKC").toLocaleLowerCase("th");
    return matchesCategory && haystack.includes(q);
  });
  if (grid) grid.innerHTML = items.map(renderCard).join("");
  if (emptyState) emptyState.hidden = items.length !== 0;
}
for (const button of filterButtons) {
  const count = document.querySelector(`[data-count="${button.dataset.filter}"]`);
  if (count) count.textContent = String(releases.filter((r) => button.dataset.filter === "all" || r.category === button.dataset.filter || (button.dataset.filter === "shorts" && r.kind === "shorts")).length).padStart(2, "0");
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    for (const b of filterButtons) {
      const selected = b === button;
      b.classList.toggle("is-selected", selected);
      b.setAttribute("aria-pressed", String(selected));
    }
    renderLibrary();
  });
}
searchInput?.addEventListener("input", renderLibrary);
renderLibrary();

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

async function loadYouTubeCatalogue() {
  try {
    const response = await fetch("./data/youtube.json", { cache: "no-cache" });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !Array.isArray(data.videos) || !data.syncedAt) return;
    applyChannelAvatar(data.channel?.avatarUrl);
    const uploaded = data.videos.filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.id || "") && typeof v.title === "string");
    const mapped = uploaded.map((v, index) => ({
      id: v.id,
      title: v.title,
      description: v.description || "รับชมผลงานจากช่อง YouTube MjeeZohn Studio",
      genre: v.kind === "shorts" ? "YouTube Shorts" : "Music Video",
      category: "video",
      kind: v.kind,
      status: "published",
      art: ["one", "two", "three"][index % 3],
      symbol: v.kind === "shorts" ? "▶" : "♫",
      keywords: v.title + " YouTube " + (v.kind || ""),
      thumbnail: v.thumbnail,
      url: v.url
    }));
    releases = mapped;
    document.querySelector(".section-footnote").textContent = mapped.length
      ? "รายการวิดีโอสาธารณะจาก YouTube @mjeezohn • อัปเดตล่าสุด " + new Date(data.syncedAt).toLocaleDateString("th-TH")
      : "ยังไม่พบวิดีโอสาธารณะในช่อง YouTube @mjeezohn";
    for (const button of filterButtons) {
      const count = document.querySelector(`[data-count="${button.dataset.filter}"]`);
      if (count) count.textContent = String(releases.filter((r) => button.dataset.filter === "all" || r.category === button.dataset.filter || (button.dataset.filter === "shorts" && r.kind === "shorts")).length).padStart(2, "0");
    }
    renderLibrary();
  } catch (error) {
    // Keep pre-sync sample catalogue if the file is not yet available.
    console.warn("YouTube catalogue unavailable; showing starter items.");
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
}
menuButton?.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
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
    iframe.title = "MjeeZohn Studio — Music Video Teaser";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    stage.replaceChildren(iframe);
  }, { once: true });
});
const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());
