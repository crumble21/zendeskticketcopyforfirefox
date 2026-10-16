console.log("options.js loaded");

let pickrInstance;

const defaultSwatches = ['#4f6d7a', '#007bff', '#28a745', '#ffc107', '#dc3545'];

function renderSavedColours(colours) {
  const container = document.getElementById('savedColours');
  container.innerHTML = '';

  colours.forEach((colour, index) => {
    const swatch = document.createElement('button');
    swatch.className = 'colour-swatch';
    swatch.style.backgroundColor = colour;
    swatch.title = "Right-click to delete";
    swatch.addEventListener('click', () => {
      pickrInstance.setColor(colour);
      browser.storage.local.set({ buttonColor: colour });
      document.getElementById('button-preview').style.backgroundColor = colour;
    });

    swatch.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      swatch.classList.add('deleting');
      setTimeout(() => {
        colours.splice(index, 1);
        browser.storage.local.set({ savedColours: colours });
        renderSavedColours(colours);
        showTooltip(e.pageX, e.pageY, "Colour deleted");
      }, 300);
    });

    if (index === colours.length - 1) {
      swatch.classList.add('newly-added');
    }

    container.appendChild(swatch);
  });
}

function showTooltip(x, y, message) {
  const tip = document.createElement('div');
  tip.textContent = message;
  tip.style.position = 'absolute';
  tip.style.left = `${x}px`;
  tip.style.top = `${y - 30}px`;
  tip.style.background = '#333';
  tip.style.color = '#fff';
  tip.style.padding = '4px 8px';
  tip.style.borderRadius = '4px';
  tip.style.fontSize = '12px';
  tip.style.pointerEvents = 'none';
  tip.style.zIndex = '999999';
  tip.style.opacity = '1';
  tip.style.transition = 'opacity 0.4s ease';

  document.body.appendChild(tip);

  setTimeout(() => {
    tip.style.opacity = '0';
  }, 1000);

  setTimeout(() => {
    tip.remove();
  }, 1500);
}

browser.storage.local.get(['buttonColor', 'savedColours', 'initialised']).then((data) => {
  let savedList = data.savedColours || [];

  if (!data.initialised) {
    savedList = [...defaultSwatches];
    browser.storage.local.set({
      savedColours: savedList,
      initialised: true
    });
  }

  const savedColor = data.buttonColor || '#4f6d7a';

  pickrInstance = Pickr.create({
    el: '#colour-picker',
    theme: 'classic',
    default: savedColor,
    components: {
      preview: true,
      opacity: false,
      hue: true,
      interaction: {
        input: true,
        save: true
      }
    }
  });

  pickrInstance.on('save', (color) => {
    const hex = color.toHEXA().toString();
    browser.storage.local.set({ buttonColor: hex });
    document.getElementById('button-preview').style.backgroundColor = hex;
    pickrInstance.hide();
  });

  renderSavedColours(savedList);
  document.getElementById('button-preview').style.backgroundColor = savedColor;

  const saveBtn = document.getElementById('saveColour');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const newHex = pickrInstance.getColor().toHEXA().toString();
      if (!savedList.includes(newHex)) {
        savedList.push(newHex);
        browser.storage.local.set({ savedColours: savedList });
        renderSavedColours(savedList);
        console.log('Colour saved:', newHex);
      } else {
        console.log('Colour already saved:', newHex);
      }
    });
  }
}).catch(err => {
  console.error('Failed to load settings:', err);
});

// Keep these defaults in step with content.js
const obsidianDefaults = {
  obsidianVault: '',
  obsidianChoice: 'Open Ticket by Zendesk ID'
};

browser.storage.local.get(Object.keys(obsidianDefaults)).then((data) => {
  Object.keys(obsidianDefaults).forEach((key) => {
    const input = document.getElementById(key);
    input.value = data[key] ?? obsidianDefaults[key];
    input.addEventListener('input', () => {
      browser.storage.local.set({ [key]: input.value.trim() });
    });
  });
});
