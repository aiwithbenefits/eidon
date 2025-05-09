// main.js

$(document).ready(function() {
  const commandPalette = $('#commandPalette');
  const commandSearchInput = $('#commandSearchInput');
  const commandSearchClearBtn = $('#commandSearchClearBtn');
  const closeCommandPaletteBtn = $('#closeCommandPalette');
  const mainContent = $('#mainContent'); // For ARIA when palette is open
  const accessPaletteHint = $('#access-palette-hint'); // Hint bar

  let previouslyFocusedElement = null;

  // --- Command Palette Toggle ---
  function showCommandPalette() {
      previouslyFocusedElement = document.activeElement;
      commandPalette.addClass('visible');
      commandSearchInput.focus();
      mainContent.attr('aria-hidden', 'true'); // Hide main content from screen readers
      accessPaletteHint.attr('aria-hidden', 'true');
  }

  function hideCommandPalette() {
      commandPalette.removeClass('visible');
      if (previouslyFocusedElement) {
          $(previouslyFocusedElement).focus();
      }
      mainContent.removeAttr('aria-hidden');
      accessPaletteHint.removeAttr('aria-hidden');
  }

  $(document).on('keydown', function(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          if (commandPalette.hasClass('visible')) {
              hideCommandPalette();
          } else {
              showCommandPalette();
          }
      }
      if (event.key === 'Escape' && commandPalette.hasClass('visible')) {
          hideCommandPalette();
      }
  });

  commandPalette.on('click', function(event) {
      if (event.target === this) { // Click on backdrop
          hideCommandPalette();
      }
  });

  if (closeCommandPaletteBtn.length) {
      closeCommandPaletteBtn.on('click', hideCommandPalette);
  }
  
  // Prevent form submission from closing palette if search happens on same page
  $('#commandSearchForm').on('submit', function() {
      // If search results are NOT displayed in the palette,
      // then submitting should likely hide the palette before navigation.
      setTimeout(hideCommandPalette, 100); // Slight delay to allow form submission
  });

  // Hide palette if timeline link is clicked
  $('#paletteTimelineLink').on('click', function() {
      setTimeout(hideCommandPalette, 100);
  });


  // --- Search Input Clear Button for Palette ---
  if (commandSearchInput.length && commandSearchClearBtn.length) {
      commandSearchInput.on('input', function() {
          commandSearchClearBtn.toggle($(this).val().length > 0);
      });
      commandSearchClearBtn.on('click', function() {
          commandSearchInput.val('').trigger('input').focus();
      });
      commandSearchClearBtn.toggle(commandSearchInput.val().length > 0);
  }

  // --- Filter Panel Toggle (if using a filter button in palette, unlikely for global palette) ---
  // This was originally for a navbar button. If you add a filter button to the palette
  // that should only work on /search page, it would need different logic.
  // const filterToggleBtn = $('#toggleFilterBtn'); 
  // const filterPanel = $('#filterPanel');
  // if (filterToggleBtn.length && filterPanel.length) { ... }


  // --- Capture Toggle for Palette ---
  const paletteCaptureToggleButton = $('#paletteCaptureToggle');
  if (paletteCaptureToggleButton.length) {
      function updatePaletteCaptureButtonState(isPaused) {
          const iconEl = paletteCaptureToggleButton.find('i');
          const textEl = paletteCaptureToggleButton.find('.button-text');
          if (isPaused) {
              paletteCaptureToggleButton.attr('title', 'Resume Screenshot Capture');
              iconEl.removeClass('bi-pause-circle-fill').addClass('bi-play-circle-fill');
              if(textEl.length) textEl.text('Resume');
              paletteCaptureToggleButton.removeClass('btn-danger btn-outline-danger').addClass('btn-info btn-outline-info');
          } else {
              paletteCaptureToggleButton.attr('title', 'Pause Screenshot Capture');
              iconEl.removeClass('bi-play-circle-fill').addClass('bi-pause-circle-fill');
              if(textEl.length) textEl.text('Pause');
              paletteCaptureToggleButton.removeClass('btn-info btn-outline-info').addClass('btn-danger btn-outline-danger');
          }
      }

      // Set initial class for styling before status is known
      paletteCaptureToggleButton.addClass('btn-outline-danger');
      // Ensure capture toggle button text is always visible and overrides any inherited styles
      paletteCaptureToggleButton.find('.button-text').css({
        'visibility': 'visible',
        'display': 'inline',
        'opacity': '1'
      });

      $.get('/api/capture_status', function(data) {
          if (data && data.status) {
              updatePaletteCaptureButtonState(data.status === 'paused');
          }
      }).fail(function() {
          console.error("Failed to fetch initial capture status for palette.");
          updatePaletteCaptureButtonState(false); 
      });

      paletteCaptureToggleButton.on('click', function() {
          const originalIconClass = $(this).find('i').attr('class');
          const originalButtonClass = $(this).attr('class');
          $(this).find('i').removeClass().addClass('bi bi-hourglass-split');
          $(this).prop('disabled', true);

          $.post('/api/toggle_capture', function(data) {
              if (data && data.status) {
                  updatePaletteCaptureButtonState(data.status === 'paused');
              }
          }).fail(function() {
              console.error("Failed to toggle capture status from palette.");
              alert("Error toggling capture status. Please try again.");
              // Restore previous state on failure
              $(this).find('i').removeClass().addClass(originalIconClass);
              $(this).attr('class', originalButtonClass);
          }).always(function() {
              paletteCaptureToggleButton.prop('disabled', false);
          });
      });
  }
});

// --- Theme Switcher (IIFE) - Adapted to handle multiple buttons ---
(function () {
  const THEMES = ['light', 'dark', 'auto'];
  const THEME_ICONS = { 
    'light': 'bi-sun-fill',
    'dark': 'bi-moon-stars-fill',
    'auto': 'bi-circle-half' 
  };
  const STORAGE_KEY = 'eidon-theme';
  
  function updateButtonIcon(buttonElement, theme) {
      if (!buttonElement) return;
      const iconClass = THEME_ICONS[theme] || THEME_ICONS['auto'];
      const currentIcon = buttonElement.querySelector('i');
      if (currentIcon) {
          // Preserve other classes on the icon if any, replace only bi-*
          let existingClasses = currentIcon.className.split(' ').filter(c => !c.startsWith('bi-'));
          existingClasses.push('bi');
          existingClasses.push(iconClass);
          currentIcon.className = existingClasses.join(' ');
      }
      // Text is now separate, so no need to update innerHTML for text
      buttonElement.setAttribute('aria-label', `Toggle theme (current: ${theme})`);
  }

  const themeToggleButtons = [];
  // const mainThemeBtn = document.getElementById('theme-toggle'); // Old navbar button ID
  const paletteThemeBtn = document.getElementById('paletteThemeToggle');

  // if (mainThemeBtn) themeToggleButtons.push(mainThemeBtn); // If you ever bring it back
  if (paletteThemeBtn) themeToggleButtons.push(paletteThemeBtn);
  
  if (themeToggleButtons.length === 0) {
      // console.log("No theme toggle buttons found.");
      return;
  }

  const mql = window.matchMedia('(prefers-color-scheme: dark)');

  function rawSet(themeValue) {
    document.documentElement.dataset.theme = themeValue;
  }

  function applyTheme(theme) {
    let effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = mql.matches ? 'dark' : 'light';
    }
    rawSet(effectiveTheme);
    themeToggleButtons.forEach(btn => {
        if (btn) updateButtonIcon(btn, theme);
    }); 
  }

  function loadTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  }

  function saveTheme(themeValue) {
    localStorage.setItem(STORAGE_KEY, themeValue);
  }

  let currentTheme = loadTheme();
  applyTheme(currentTheme); // Apply theme immediately on load

  mql.addEventListener('change', () => {
    if (currentTheme === 'auto') {
      applyTheme('auto'); 
    }
  });

  themeToggleButtons.forEach(btn => {
      if(btn) {
          btn.addEventListener('click', () => {
              currentTheme = THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length];
              saveTheme(currentTheme);
              applyTheme(currentTheme);
          });
      }
  });
})();
// --- Helper: Render App Metadata ---
// Usage: $('#imageMetadata').html(renderAppMetadata(appName, appIconUrl) + otherMetadataHTML);
function renderAppMetadata(appName, appIconUrl) {
  return `
    <div class="metadata-app-info">
      <img src="${appIconUrl}" alt="${appName} icon" class="app-icon" />
      <span class="app-name">${appName}</span>
    </div>
  `;
}

// --- Example: Update image and metadata ---
// If you have a function that updates #imageMetadata, you can use this helper as follows:
function updateImageAndMetadata(timestamp) {
  console.log("Timeline JS: updateImageAndMetadata called for timestamp:", timestamp);
  sliderValueDisplay.textContent = formatTimestampShort(timestamp);

  fetch(`/entry_details/${timestamp}`)
    .then(response => {
      console.log("Timeline JS: Fetch response status:", response.status, "for timestamp:", timestamp);
      if (!response.ok) {
        return response.text().then(text => {
          console.error(`Timeline JS: HTTP error! status: ${response.status}, body: ${text}`);
          throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("Timeline JS: Received data from /entry_details:", data);
      if (data && !data.error) {
        const appName = data.app_name || 'Unknown';
        const appIconUrl = data.app_icon_url || '';

        const otherMetadataHTML = `
          <p><strong>Title:</strong> ${data.title || 'Untitled'}</p>
          <p><strong>Page:</strong> ${data.page_url ? `<a href="${data.page_url}" target="_blank">${data.page_url}</a>` : 'N/A'}</p>
        `;

        $('#imageMetadata').html(
          renderAppMetadata(appName, appIconUrl) + otherMetadataHTML
        );

        if (data.filename) {
          $('#timestampImage').attr('src', `/screenshots_file/${data.filename}`);
          $('#timestampImage').attr('alt', `Screenshot for ${data.timestamp_hr}`);
        } else {
          console.error('Timeline JS: Filename missing in entry_details response for timestamp:', timestamp, data);
          $('#timestampImage').attr('src', '');
          $('#timestampImage').attr('alt', 'Image data unavailable');
        }
      } else {
        const errorMsg = data && data.error ? data.error : "Unknown error loading metadata";
        console.error('Timeline JS: Error in data from /entry_details:', errorMsg, data);
        $('#imageMetadata').html(`<small class="text-danger">Error loading metadata: ${errorMsg}</small>`);
        $('#timestampImage').attr('src', '').attr('alt', 'Image unavailable');
      }
    })
    .catch(error => {
      console.error('Timeline JS: Error fetching or processing metadata for image update:', error);
      $('#imageMetadata').html('<small class="text-danger">Error loading metadata. See console.</small>');
      $('#timestampImage').attr('src', '').attr('alt', 'Image unavailable');
    });
}