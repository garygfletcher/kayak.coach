'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
function closeMenu() { nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menuToggle.focus(); }
});
document.querySelector('#year').textContent = new Date().getFullYear();

// Always share the public canonical URL, including while reviewing on localhost.
const shareData = { title: 'Kayak Coach | Gary Fletcher', text: 'Kayak coaching, wilderness skills and real expedition experience.', url: document.querySelector('link[rel="canonical"]').href };
const shareStatus = document.querySelector('#share-status');
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareData.url);
    shareStatus.textContent = 'Link copied — ready to share.';
    document.querySelector('#copy-fallback').hidden = true;
  } catch {
    const fallback = document.querySelector('#copy-fallback');
    fallback.hidden = false;
    fallback.querySelector('input').select();
    shareStatus.textContent = 'Select and copy the website address below.';
  }
}
document.querySelector('#copy-link').addEventListener('click', copyLink);
const nativeShare = document.querySelector('#native-share');
if (typeof navigator.share === 'function') {
  nativeShare.hidden = false;
  nativeShare.addEventListener('click', async () => {
    try { await navigator.share(shareData); }
    catch (error) { if (error.name !== 'AbortError') await copyLink(); }
  });
}

// Native dialog provides keyboard focus containment and Escape-to-close.
const filmDialog = document.querySelector('#film-dialog');
const filmContainer = document.querySelector('#film-container');
let filmTrigger;
document.querySelectorAll('[data-video]').forEach(link => {
  link.addEventListener('click', event => {
    if (!filmDialog.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    filmTrigger = link;
    document.querySelector('#film-title').textContent = link.dataset.title;
    document.querySelector('#youtube-link').href = link.href;
    const frame = document.createElement('iframe');
    frame.title = link.dataset.title;
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.video}?autoplay=1&rel=0`;
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    filmContainer.replaceChildren(frame);
    filmDialog.showModal();
    document.querySelector('#close-film').focus();
  });
});
document.querySelector('#close-film').addEventListener('click', () => filmDialog.close());
filmDialog.addEventListener('click', event => {
  const bounds = filmDialog.getBoundingClientRect();
  if (event.target === filmDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) filmDialog.close();
});
filmDialog.addEventListener('close', () => { filmContainer.replaceChildren(); filmTrigger?.focus(); });

// Restore the existing Instagram feed, with a useful fallback if it is empty.
async function loadInstagram() {
  const feed = document.querySelector('#instagram-feed');
  if (!feed) return;
  const fallback = () => {
    const message = document.createElement('p');
    message.textContent = 'The Instagram feed is unavailable at the moment. ';
    const link = document.createElement('a');
    link.href = 'https://www.instagram.com/tryingtokayak/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'See the latest updates from @tryingtokayak ↗';
    message.append(link);
    feed.replaceChildren(message);
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://dbsofurxsf.execute-api.eu-west-1.amazonaws.com/default/getTryingToKayakInsta', { signal: controller.signal });
    if (!response.ok) throw new Error('Feed unavailable');
    const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
    // Rebuild only display content from the external feed; no scripts or event handlers.
    const allowed = new Set(['DIV', 'P', 'A', 'IMG', 'SPAN', 'H2', 'H3', 'H4', 'BR', 'STRONG', 'EM', 'UL', 'LI']);
    function cleanNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (node.nodeType !== Node.ELEMENT_NODE || !allowed.has(node.tagName)) return document.createDocumentFragment();
      const element = document.createElement(node.tagName.toLowerCase());
      element.className = node.className;
      if (node.tagName === 'A' || node.tagName === 'IMG') {
        const attribute = node.tagName === 'A' ? 'href' : 'src';
        try {
          const url = new URL(node.getAttribute(attribute));
          if (url.protocol === 'https:') element.setAttribute(attribute, url.href);
        } catch { /* Ignore absent or invalid URLs. */ }
      }
      if (node.tagName === 'A') { element.target = '_blank'; element.rel = 'noopener noreferrer'; }
      if (node.tagName === 'IMG') { element.alt = node.getAttribute('alt') || 'Latest update from @tryingtokayak'; element.loading = 'lazy'; }
      for (const child of node.childNodes) element.append(cleanNode(child));
      return element;
    }
    const content = document.createDocumentFragment();
    for (const node of documentFragment.body.childNodes) content.append(cleanNode(node));
    if (!content.textContent.trim() && !content.querySelector('img[src]')) { fallback(); return; }
    feed.replaceChildren(content);
  } catch { fallback(); }
  finally { clearTimeout(timeout); }
}
loadInstagram();

// Image links remain usable without JavaScript; the dialog adds sequential browsing.
const photoLinks = [...document.querySelectorAll('[data-photo]')];
let activePhotoLinks = [];
const photoDialog = document.querySelector('#photo-dialog');
const photoFull = document.querySelector('#photo-full');
let photoIndex = 0;
let photoTrigger;
function showPhoto(index) {
  photoIndex = (index + activePhotoLinks.length) % activePhotoLinks.length;
  const link = activePhotoLinks[photoIndex];
  photoFull.alt = link.dataset.caption;
  photoFull.src = link.href;
  document.querySelector('#photo-caption').textContent = link.dataset.caption;
  document.querySelector('#photo-count').textContent = `${photoIndex + 1} / ${activePhotoLinks.length}`;
}
photoLinks.forEach(link => link.addEventListener('click', event => {
  if (!photoDialog.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  photoTrigger = link;
  const gallery = link.closest('.expedition-gallery');
  activePhotoLinks = [...gallery.querySelectorAll('[data-photo]')];
  document.querySelector('#photo-title').textContent = gallery.dataset.photoTitle;
  showPhoto(activePhotoLinks.indexOf(link));
  photoDialog.showModal();
  document.querySelector('#close-photo').focus();
}));
document.querySelector('#close-photo').addEventListener('click', () => photoDialog.close());
document.querySelector('#previous-photo').addEventListener('click', () => showPhoto(photoIndex - 1));
document.querySelector('#next-photo').addEventListener('click', () => showPhoto(photoIndex + 1));
photoDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
photoDialog.addEventListener('click', event => {
  const bounds = photoDialog.getBoundingClientRect();
  if (event.target === photoDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) photoDialog.close();
});
photoDialog.addEventListener('close', () => {
  photoFull.removeAttribute('src');
  photoTrigger?.focus({ preventScroll: true });
});
