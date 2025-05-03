document.addEventListener('DOMContentLoaded', () => {
  updateDisplayBoxes();
  initializeToggles();
});

function updateDisplayBoxes() {
  browser.storage.local.get(["blocklist", "trackerBlocklist", "blockedElements"]).then((result) => {
      let blocklist = result.blocklist || [];
      let trackerBlocklist = result.trackerBlocklist || [];
      let blockedElements = result.blockedElements || [];

      updateBlocklist('domainBlocklist', blocklist, 'blocklist');
      updateBlocklist('trackerBlocklist', trackerBlocklist, 'trackerBlocklist');
      updateBlocklist('elementBlocklist', blockedElements, 'blockedElements');
  }).catch((error) => {
      console.error('Error loading lists:', error);
  });
}

function updateBlocklist(id, list, storageKey) {
  let ul = document.getElementById(id);
  ul.innerHTML = '';
  for (let item of list) {
      let li = document.createElement('li');
      li.textContent = storageKey === 'blockedElements' ? item.selector : item;
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

handleFormSubmission('domainForm', 'domainInput', 'blocklist');
handleFormSubmission('trackerForm', 'trackerInput', 'trackerBlocklist');

document.getElementById('blockListForm').addEventListener('submit', (event) => {
  event.preventDefault();
  let fileInput = document.getElementById('blockListInput');
  let file = fileInput.files[0];
  if (file) {
      let reader = new FileReader();
      reader.onload = (e) => {
          let contents = e.target.result;
          let lines = contents.split('\n').map(line => line.trim()).filter(line => line);
          browser.storage.local.get(['blocklist']).then((result) => {
              let blocklist = result.blocklist || [];
              lines.forEach((line) => {
                  if (!blocklist.includes(line)) {
                      blocklist.push(line);
                  }
              });
              browser.storage.local.set({ blocklist }).then(() => {
                  fileInput.value = '';
                  updateDisplayBoxes();
                  console.log('Blocklist updated from file:', lines);
              }).catch((error) => {
                  console.error('Error saving blocklist from file:', error);
              });
          }).catch((error) => {
              console.error('Error reading blocklist:', error);
          });
      };
      reader.readAsText(file);
  }
});