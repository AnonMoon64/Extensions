document.addEventListener('DOMContentLoaded', () => {
  updateDisplayBoxes();
  initializeToggles();
  setupImportExport();
});

function updateDisplayBoxes() {
  browser.storage.local.get(["blocklist", "trackerBlocklist", "blockedElements"]).then((result) => {
      let blocklist = result.blocklist || [];
      let trackerBlocklist = result.trackerBlocklist || [];
      let blockedElements = result.blockedElements || [];

      updateBlocklist('domainBlocklist', blocklist, 'blocklist');
      updateBlocklist('trackerBlocklist', trackerBlocklist, 'trackerBlocklist');
      updateElementBlocklist('elementBlocklist', blockedElements);
  }).catch((error) => {
      console.error('Error loading lists:', error);
  });
}

function updateBlocklist(id, list, storageKey) {
  let ul = document.getElementById(id);
  ul.innerHTML = '';
  for (let item of list) {
      let li = document.createElement('li');
      li.textContent = item;
      let button = document.createElement('button');
      button.textContent = 'Remove';
      button.addEventListener('click', () => {
          let index = list.indexOf(item);
          if (index !== -1) {
              list.splice(index, 1);
              browser.storage.local.set({ [storageKey]: list }).then(updateDisplayBoxes).catch((error) => {
                  console.error(`Error removing item from ${storageKey}:`, error);
              });
          }
      });
      li.appendChild(button);
      ul.appendChild(li);
  }
}

function updateElementBlocklist(id, elements) {
  let ul = document.getElementById(id);
  ul.innerHTML = '';

  // Group elements by hostname
  const grouped = elements.reduce((acc, item) => {
      if (!acc[item.hostname]) {
          acc[item.hostname] = [];
      }
      acc[item.hostname].push(item.selector);
      return acc;
  }, {});

  for (let hostname in grouped) {
      let li = document.createElement('li');
      let websiteSpan = document.createElement('span');
      websiteSpan.textContent = hostname;
      let removeWebsiteButton = document.createElement('button');
      removeWebsiteButton.textContent = 'Remove Website';
      removeWebsiteButton.addEventListener('click', () => {
          let updatedElements = elements.filter(e => e.hostname !== hostname);
          browser.storage.local.set({ blockedElements: updatedElements }).then(updateDisplayBoxes).catch((error) => {
              console.error('Error removing website elements:', error);
          });
      });
      li.appendChild(websiteSpan);
      li.appendChild(removeWebsiteButton);

      let subUl = document.createElement('ul');
      grouped[hostname].forEach((selector) => {
          let subLi = document.createElement('li');
          subLi.textContent = selector;
          let removeButton = document.createElement('button');
          removeButton.textContent = 'Remove';
          removeButton.addEventListener('click', () => {
              let updatedElements = elements.filter(e => !(e.hostname === hostname && e.selector === selector));
              browser.storage.local.set({ blockedElements: updatedElements }).then(updateDisplayBoxes).catch((error) => {
                  console.error('Error removing element:', error);
              });
          });
          subLi.appendChild(removeButton);
          subUl.appendChild(subLi);
      });
      li.appendChild(subUl);
      ul.appendChild(li);
  }
}

function handleFormSubmission(formId, inputId, storageKey) {
  document.getElementById(formId).addEventListener('submit', (event) => {
      event.preventDefault();
      let inputValue = document.getElementById(inputId).value.trim();
      if (inputValue) {
          browser.storage.local.get([storageKey]).then((result) => {
              let list = result[storageKey] || [];
              if (!list.includes(inputValue)) {
                  list.push(inputValue);
                  browser.storage.local.set({ [storageKey]: list }).then(() => {
                      document.getElementById(inputId).value = '';
                      updateDisplayBoxes();
                      console.log(`Added to ${storageKey}:`, inputValue);
                  }).catch((error) => {
                      console.error(`Error saving to ${storageKey}:`, error);
                  });
              }
          }).catch((error) => {
              console.error(`Error reading ${storageKey}:`, error);
          });
      }
  });
}

function initializeToggles() {
  browser.storage.local.get(['usePredefinedBlocklist', 'usePredefinedTrackers']).then((result) => {
      document.getElementById('usePredefinedBlocklist').checked = result.usePredefinedBlocklist !== false;
      document.getElementById('usePredefinedTrackers').checked = result.usePredefinedTrackers !== false;
  });

  document.getElementById('usePredefinedBlocklist').addEventListener('change', (event) => {
      browser.storage.local.set({ usePredefinedBlocklist: event.target.checked }).catch((error) => {
          console.error('Error saving usePredefinedBlocklist:', error);
      });
  });

  document.getElementById('usePredefinedTrackers').addEventListener('change', (event) => {
      browser.storage.local.set({ usePredefinedTrackers: event.target.checked }).catch((error) => {
          console.error('Error saving usePredefinedTrackers:', error);
      });
  });
}

function setupImportExport() {
  document.getElementById('exportSettings').addEventListener('click', () => {
      browser.storage.local.get(['blocklist', 'trackerBlocklist', 'blockedElements', 'usePredefinedBlocklist', 'usePredefinedTrackers']).then((data) => {
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'phantomguard-settings.json';
          a.click();
          URL.revokeObjectURL(url);
          console.log('Settings exported:', data);
      }).catch((error) => {
          console.error('Error exporting settings:', error);
      });
  });

  document.getElementById('importSettings').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = JSON.parse(e.target.result);
                  const validKeys = ['blocklist', 'trackerBlocklist', 'blockedElements', 'usePredefinedBlocklist', 'usePredefinedTrackers'];
                  const filteredData = {};
                  validKeys.forEach(key => {
                      if (data[key] !== undefined) {
                          filteredData[key] = data[key];
                      }
                  });
                  browser.storage.local.set(filteredData).then(() => {
                      updateDisplayBoxes();
                      event.target.value = '';
                      console.log('Settings imported:', filteredData);
                  }).catch((error) => {
                      console.error('Error importing settings:', error);
                  });
              } catch (error) {
                  console.error('Invalid JSON file:', error);
              }
          };
          reader.readAsText(file);
      }
  });
}

handleFormSubmission('domainForm', 'domainInput', 'blocklist');
handleFormSubmission('trackerForm', 'trackerInput', 'trackerBlocklist');