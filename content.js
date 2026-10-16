console.log("Content script loaded");

const DEFAULT_COLOR = '#4f6d7a';
const DEFAULT_VAULT = '';
const DEFAULT_CHOICE = 'Open Ticket by Zendesk ID';

let buttonColor = DEFAULT_COLOR;

let copyClickTimestamps = [];
const chimeAudio = new Audio(browser.runtime.getURL('chime.mp3'));

function trackCopyClicks() {
  const now = Date.now();
  copyClickTimestamps = copyClickTimestamps.filter(t => now - t < 3000);
  copyClickTimestamps.push(now);

  if (copyClickTimestamps.length >= 10) {
    chimeAudio.play();
    copyClickTimestamps = [];
  }
}

// Helper to lighten hex colour by a percentage
function lightenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return (
    "#" +
    (0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255))
      .toString(16)
      .slice(1)
  );
}

function getTicketNumber(ticketEl) {
  const match = ticketEl.innerText.match(/\d+/);
  return match ? match[0] : '';
}

// QuickAdd reads `choice` by name and exposes each `value-<name>` param to the
// macro as a variable; `vault` is handled by Obsidian itself. With no vault
// set, Obsidian uses whichever vault was focused last.
function buildObsidianUri(ticketNumber, vault, choice) {
  const params = [];
  if (vault) params.push('vault=' + encodeURIComponent(vault));
  params.push('choice=' + encodeURIComponent(choice));
  params.push('value-ticket=' + encodeURIComponent(ticketNumber));
  return 'obsidian://quickadd?' + params.join('&');
}

// Launch through a hidden iframe so the Zendesk page itself never navigates;
// a top-level navigation trips Zendesk's "leave page?" prompt when a reply is
// in progress. If the page's CSP refuses the frame, fall back to navigating.
function openExternalUri(uri) {
  const scheme = uri.split(':')[0];
  const frame = document.createElement('iframe');
  frame.style.display = 'none';

  const onViolation = (event) => {
    if (!event.blockedURI.startsWith(scheme)) return;
    cleanup();
    window.location.href = uri;
  };
  const cleanup = () => {
    document.removeEventListener('securitypolicyviolation', onViolation);
    frame.remove();
  };

  document.addEventListener('securitypolicyviolation', onViolation);
  frame.src = uri;
  document.body.appendChild(frame);
  setTimeout(cleanup, 3000);
}

function showPopup(button, text) {
  const existingPopup = document.querySelector('.copied-popup');
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement('div');
  popup.className = 'copied-popup';
  popup.textContent = text;
  popup.style.position = 'fixed';
  popup.style.backgroundColor = '#333';
  popup.style.color = '#fff';
  popup.style.padding = '4px 8px';
  popup.style.borderRadius = '4px';
  popup.style.fontSize = '12px';
  popup.style.whiteSpace = 'nowrap';
  popup.style.pointerEvents = 'none';
  popup.style.zIndex = '999999';
  popup.style.opacity = '1';
  popup.style.transition = 'opacity 0.4s ease';

  const rect = button.getBoundingClientRect();
  popup.style.top = `${rect.top - 30}px`;
  popup.style.left = `${rect.left + rect.width / 2}px`;
  popup.style.transform = 'translateX(-50%)';

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = '0';
  }, 1500);

  setTimeout(() => {
    popup.remove();
  }, 2000);
}

function createButton(label, className, title) {
  const button = document.createElement('button');
  button.className = `zd-ticket-button ${className}`;
  button.textContent = label;
  button.title = title;

  // Apply styles
  button.style.backgroundColor = buttonColor;
  button.style.color = '#ffffff';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.padding = '2px 8px';
  button.style.marginLeft = '10px';
  button.style.marginTop = '-2px';
  button.style.fontSize = '0.85rem';
  button.style.cursor = 'pointer';
  button.style.display = 'inline-block';
  button.style.verticalAlign = 'text-top';
  button.style.position = 'relative';
  button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
  button.style.transition = 'transform 0.1s ease, background-color 0.2s ease';

  // Hover behaviour
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = lightenColor(buttonColor, 10); // 10% lighter on hover
  });
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = buttonColor;
    button.style.transform = 'scale(1)';
  });

  // Press effect
  button.addEventListener('mousedown', () => {
    button.style.transform = 'scale(0.95)';
  });
  button.addEventListener('mouseup', () => {
    button.style.transform = 'scale(1)';
  });

  return button;
}

function insertButtons() {
  const ticketEls = document.querySelectorAll('[data-test-id^="tabs-section-nav-item-ticket"]');
  ticketEls.forEach(ticketEl => {
    if (ticketEl.hasAttribute('data-copy-processed')) return;
    ticketEl.setAttribute('data-copy-processed', 'true');

    // Click to copy
    const copyButton = createButton('Copy', 'copy-button', 'Copy ticket number');
    copyButton.addEventListener('click', () => {
      const ticketNumber = getTicketNumber(ticketEl);

      navigator.clipboard.writeText(ticketNumber)
        .then(() => {
          trackCopyClicks();
          console.log(`Ticket number ${ticketNumber} copied to clipboard!`);
          showPopup(copyButton, 'Copied!');
        })
        .catch((err) => {
          console.error('Failed to copy ticket number', err);
        });
    });

    // Click to open the matching ticket note in Obsidian
    const obsidianButton = createButton('Obsidian', 'obsidian-button', 'Open ticket in Obsidian');
    obsidianButton.addEventListener('click', () => {
      const ticketNumber = getTicketNumber(ticketEl);
      if (!ticketNumber) {
        showPopup(obsidianButton, 'No ticket number');
        return;
      }

      browser.storage.local.get(['obsidianVault', 'obsidianChoice']).then((data) => {
        const vault = data.obsidianVault ?? DEFAULT_VAULT;
        const choice = data.obsidianChoice || DEFAULT_CHOICE;
        openExternalUri(buildObsidianUri(ticketNumber, vault, choice));
        showPopup(obsidianButton, 'Opening…');
      });
    });

    ticketEl.appendChild(copyButton);
    ticketEl.appendChild(obsidianButton);
  });
}

browser.storage.local.get('buttonColor').then((data) => {
  buttonColor = data.buttonColor || DEFAULT_COLOR;

  insertButtons();

  const observer = new MutationObserver(() => {
    insertButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(insertButtons, 1000);
});

// ✅ Watch for dynamic colour changes and update all buttons live
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.buttonColor) {
    buttonColor = changes.buttonColor.newValue || DEFAULT_COLOR;
    document.querySelectorAll('.zd-ticket-button').forEach(button => {
      button.style.backgroundColor = buttonColor;
    });
  }
});
