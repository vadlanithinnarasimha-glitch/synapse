/* ── PDF.js worker ───────────────────────────────────────────── */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ── PageFlip instance ───────────────────────────────────────── */
const flipbook = document.getElementById("flipbook");

const pageFlip = new St.PageFlip(flipbook, {
  width:              500, // Base calculation width
  height:             700, // Base calculation height
  size:               "stretch", // Allows the book to stretch dynamically
  minWidth:           200, // Adjusted so it scales down well on mobile
  maxWidth:           3000, // Forcing a massive max width so it fills large screens
  minHeight:          300,
  maxHeight:          3000, // Forcing a massive max height so it fills large screens
  showCover:          true,
  mobileScrollSupport: true,
  usePortrait:        true,
  startZIndex:        10,
  drawShadow:         true,
  flippingTime:       700,
  useMouseEvents:     true,
});

/* ── DOM refs ────────────────────────────────────────────────── */
const $loader      = document.getElementById('loader');
const $progressBar = document.getElementById('progress-bar');
const $loaderPct   = document.getElementById('loader-pct');
const $pageInd     = document.getElementById('page-indicator');
const $totalPages  = document.getElementById('total-pages');
const $curSpread   = document.getElementById('current-spread');
const $pubName     = document.getElementById('pub-name');
const $btnPrev     = document.getElementById('btn-prev');
const $btnNext     = document.getElementById('btn-next');
const $btnFirst    = document.getElementById('btn-first');
const $btnLast     = document.getElementById('btn-last');
const $btnFullscreen = document.getElementById('btn-fullscreen');
const $jumpInput   = document.getElementById('jump-input');
const $btnJump     = document.getElementById('btn-jump');

/* ── Load & render PDF ───────────────────────────────────────── */
async function loadPDF() {
  try {
    const pdf = await pdfjsLib.getDocument('newsletter.pdf').promise;
    const total = pdf.numPages;

    // Update sidebar
    $totalPages.textContent = total;
    $jumpInput.max = total;

    // Try to get title from PDF metadata
    try {
      const meta = await pdf.getMetadata();
      const title = meta?.info?.Title;
      if (title) $pubName.textContent = title;
    } catch (_) {}

    const pages = [];

    for (let i = 1; i <= total; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas  = document.createElement("canvas");
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      }).promise;

      const div = document.createElement("div");
      div.classList.add("page");

      const img = document.createElement("img");
      img.src          = canvas.toDataURL();
      img.style.width  = "100%";
      img.style.height = "100%";
      div.appendChild(img);
      pages.push(div);

      // Progress
      const pct = Math.round((i / total) * 100);
      $progressBar.style.width = pct + '%';
      $loaderPct.textContent   = pct + '%';
    }

    pageFlip.loadFromHTML(pages);

    // Hide loader
    $loader.style.display = 'none';

    // Wire page-flip events
    pageFlip.on('flip', (e) => updateUI(e.data, total));
    pageFlip.on('changeOrientation', () => updateUI(pageFlip.getCurrentPageIndex(), total));

    updateUI(0, total);

  } catch (err) {
    console.error('PDF load error:', err);
    $loaderPct.textContent  = '!';
    document.querySelector('.loader-text').textContent =
      'Could not load newsletter.pdf — check filename.';
  }
}

/* ── Update UI state ─────────────────────────────────────────── */
function updateUI(pageIndex, total) {
  const p = pageIndex + 1;
  $pageInd.textContent  = `${p} / ${total}`;
  $curSpread.textContent = `${p}–${Math.min(p + 1, total)}`;

  $btnFirst.disabled = pageIndex === 0;
  $btnPrev.disabled  = pageIndex === 0;
  $btnNext.disabled  = pageIndex >= total - 1;
  $btnLast.disabled  = pageIndex >= total - 1;
}

/* ── Button controls ─────────────────────────────────────────── */
$btnPrev.addEventListener('click',  () => pageFlip.flipPrev());
$btnNext.addEventListener('click',  () => pageFlip.flipNext());
$btnFirst.addEventListener('click', () => pageFlip.flip(0));
$btnLast.addEventListener('click',  () => {
  const total = pageFlip.getPageCount();
  pageFlip.flip(total - 1);
});

$btnJump.addEventListener('click', jumpToPage);
$jumpInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') jumpToPage();
});

function jumpToPage() {
  const val = parseInt($jumpInput.value, 10);
  if (!isNaN(val) && val >= 1) {
    pageFlip.flip(val - 1);
    $jumpInput.value = '';
  }
}

/* ── Keyboard navigation ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') pageFlip.flipNext();
  if (e.key === 'ArrowLeft')  pageFlip.flipPrev();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});

/* ── Fullscreen toggle ───────────────────────────────────────── */
$btnFullscreen.addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen?.() ||
    elem.webkitRequestFullscreen?.() ||
    elem.mozRequestFullScreen?.() ||
    elem.msRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() ||
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.() ||
    document.msExitFullscreen?.();
  }
}

/* ── Start ───────────────────────────────────────────────────── */
loadPDF();