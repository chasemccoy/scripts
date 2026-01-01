#!/usr/bin/env node

/**
 * Arc Browser Tab Organizer
 * Gets all tabs organized by space using AppleScript
 *
 * Usage:
 *   node arc-tabs-organized.js [--json] [--space "Space Name"]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

class ArcTabOrganizer {
  constructor() {
    this.spaces = [];
    this.sidebarPath = path.join(
      os.homedir(),
      'Library/Application Support/Arc/StorableSidebar.json'
    );
  }

  /**
   * Convert Core Foundation Absolute Time to ISO 8601 string
   * CF time is seconds since 2001-01-01 00:00:00 UTC
   */
  convertCFTimeToISO(cfTime) {
    if (!cfTime) return null;
    // CF reference date is 2001-01-01, JS is 1970-01-01
    // Difference is 978307200 seconds
    const jsTimestamp = (cfTime + 978307200) * 1000;
    return new Date(jsTimestamp).toISOString();
  }


  /**
   * Get a specific space by name
   */
  getSpace(spaceName) {
    const spaces = this.getSpaces();
    return spaces.find(s =>
      s.name.toLowerCase() === spaceName.toLowerCase()
    );
  }

  /**
   * Filter tabs across all spaces (or specific space) by various criteria
   * @param {Object} options - Filter options
   * @param {string} [options.spaceName] - Filter to specific space
   * @param {boolean} [options.pinned] - Filter by pinned status (true/false/undefined for all)
   * @param {string} [options.createdAfter] - ISO date string - tabs created after this date
   * @param {string} [options.createdBefore] - ISO date string - tabs created before this date
   * @param {string} [options.lastActiveAfter] - ISO date string - tabs active after this date
   * @param {string} [options.lastActiveBefore] - ISO date string - tabs active before this date
   * @returns {Array} Filtered tabs with space/folder context
   */
  filterTabs(options = {}) {
    const spaces = this.getSpaces();
    const results = [];

    // Parse date filters
    const createdAfter = options.createdAfter ? new Date(options.createdAfter) : null;
    const createdBefore = options.createdBefore ? new Date(options.createdBefore) : null;
    const lastActiveAfter = options.lastActiveAfter ? new Date(options.lastActiveAfter) : null;
    const lastActiveBefore = options.lastActiveBefore ? new Date(options.lastActiveBefore) : null;

    const collectTabs = (items, spaceName, spaceId, folderPath = []) => {
      for (const item of items) {
        if (item.type === 'tab') {
          // Check all filter criteria
          let matches = true;

          // Space filter
          if (options.spaceName && spaceName.toLowerCase() !== options.spaceName.toLowerCase()) {
            matches = false;
          }

          // Pinned filter
          if (options.pinned !== undefined && item.pinned !== options.pinned) {
            matches = false;
          }

          // Date filters
          if (createdAfter && new Date(item.createdAt) < createdAfter) {
            matches = false;
          }
          if (createdBefore && new Date(item.createdAt) > createdBefore) {
            matches = false;
          }
          if (lastActiveAfter && new Date(item.lastActiveAt) < lastActiveAfter) {
            matches = false;
          }
          if (lastActiveBefore && new Date(item.lastActiveAt) > lastActiveBefore) {
            matches = false;
          }

          if (matches) {
            results.push({
              ...item,
              spaceName,
              spaceId,
              folderPath: folderPath.length > 0 ? folderPath.join(' > ') : null
            });
          }
        } else if (item.type === 'folder') {
          const newPath = [...folderPath, item.title || 'Untitled'];
          collectTabs(item.items, spaceName, spaceId, newPath);
        }
      }
    };

    for (const space of spaces) {
      collectTabs(space.items, space.name, space.id);
    }

    return results;
  }

  /**
   * Search tabs across all spaces (recursively searches hierarchical structure)
   */
  searchTabs(query) {
    const spaces = this.getSpaces();
    const results = [];
    const lowerQuery = query.toLowerCase();

    const searchItems = (items, spaceName, spaceId) => {
      for (const item of items) {
        if (item.type === 'tab') {
          if (
            item.title.toLowerCase().includes(lowerQuery) ||
            item.url.toLowerCase().includes(lowerQuery)
          ) {
            results.push({
              ...item,
              spaceName,
              spaceId
            });
          }
        } else if (item.type === 'folder') {
          searchItems(item.items, spaceName, spaceId);
        }
      }
    };

    for (const space of spaces) {
      searchItems(space.items, space.name, space.id);
    }

    return results;
  }

  /**
   * Get tabs by domain (recursively searches hierarchical structure)
   */
  getTabsByDomain(domain) {
    const spaces = this.getSpaces();
    const results = [];

    const searchItems = (items, spaceName, spaceId) => {
      for (const item of items) {
        if (item.type === 'tab') {
          try {
            const url = new URL(item.url);
            if (url.hostname.includes(domain)) {
              results.push({
                ...item,
                spaceName,
                spaceId
              });
            }
          } catch (e) {
            // Invalid URL, skip
          }
        } else if (item.type === 'folder') {
          searchItems(item.items, spaceName, spaceId);
        }
      }
    };

    for (const space of spaces) {
      searchItems(space.items, space.name, space.id);
    }

    return results;
  }

  /**
   * Get all objects recursively from nested JSON
   */
  getAllObjects(obj, result = []) {
    if (typeof obj === 'object' && obj !== null) {
      if (obj.id) {
        result.push(obj);
      }
      for (const key in obj) {
        this.getAllObjects(obj[key], result);
      }
    }
    return result;
  }

  /**
   * Build a map of container IDs to their pinned status
   */
  buildPinnedMap(data) {
    const pinnedMap = new Map();
    const spaceModels = data.firebaseSyncState?.syncData?.spaceModels || [];

    for (const model of spaceModels) {
      if (typeof model !== 'object' || !model.value) continue;

      const containerIDs = model.value.containerIDs || [];
      let isPinned = false;

      for (const containerID of containerIDs) {
        if (containerID === 'pinned') {
          isPinned = true;
        } else if (containerID === 'unpinned') {
          isPinned = false;
        } else {
          // This is a folder/container ID
          pinnedMap.set(containerID, isPinned);
        }
      }
    }

    return pinnedMap;
  }

  /**
   * Determine if a tab is pinned based on its parent chain
   */
  isTabPinned(tab, itemsById, pinnedMap) {
    let currentID = tab.parentID;
    const visited = new Set();

    // Traverse up the parent chain
    while (currentID && !visited.has(currentID)) {
      visited.add(currentID);

      // Check if this ID has a known pinned status
      if (pinnedMap.has(currentID)) {
        return pinnedMap.get(currentID);
      }

      // Move to parent
      const parent = itemsById.get(currentID);
      if (parent && parent.parentID) {
        currentID = parent.parentID;
      } else {
        break;
      }
    }

    // Default to unpinned if we can't determine
    return false;
  }

  /**
   * Get tabs organized by folders
   * Returns a map of folder names to their tabs
   */
  getTabsByFolder() {
    if (!fs.existsSync(this.sidebarPath)) {
      console.error('StorableSidebar.json not found');
      return new Map();
    }

    const data = JSON.parse(fs.readFileSync(this.sidebarPath, 'utf8'));
    const allObjects = this.getAllObjects(data);

    // Build pinned map
    const pinnedMap = this.buildPinnedMap(data);

    // Create maps
    const itemsById = new Map();
    const tabs = [];
    const folders = [];

    // Categorize items
    for (const item of allObjects) {
      if (!item.id) continue;

      itemsById.set(item.id, item);

      if (item.data?.tab) {
        tabs.push(item);
      } else if (item.data?.list) {
        folders.push(item);
      }
    }

    // Determine pinned status for each folder
    const folderPinnedStatus = new Map();
    for (const folder of folders) {
      const isPinned = this.isTabPinned(folder, itemsById, pinnedMap);
      folderPinnedStatus.set(folder.id, isPinned);
    }

    // Map tabs to folders
    const folderMap = new Map();

    for (const tab of tabs) {
      const parentID = tab.parentID;
      if (!parentID) continue;

      const folder = itemsById.get(parentID);
      if (!folder) continue;

      const folderName = folder.title || folder.id;
      const isPinned = folderPinnedStatus.get(folder.id) || false;

      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, {
          id: folder.id,
          title: folder.title,
          parentID: folder.parentID,
          pinned: isPinned,
          createdAt: this.convertCFTimeToISO(folder.createdAt),
          tabs: []
        });
      }

      folderMap.get(folderName).tabs.push({
        id: tab.id,
        title: tab.data.tab.savedTitle,
        url: tab.data.tab.savedURL,
        pinned: isPinned,
        createdAt: this.convertCFTimeToISO(tab.createdAt),
        lastActiveAt: this.convertCFTimeToISO(tab.data.tab.timeLastActiveAt)
      });
    }

    return folderMap;
  }

  /**
   * Get all spaces with hierarchical folder/tab structure
   * Returns array of spaces, each containing items (tabs and folders)
   */
  getSpaces() {
    if (!fs.existsSync(this.sidebarPath)) {
      console.error('StorableSidebar.json not found');
      return [];
    }

    const data = JSON.parse(fs.readFileSync(this.sidebarPath, 'utf8'));
    const allObjects = this.getAllObjects(data);

    // Build pinned map
    const pinnedMap = this.buildPinnedMap(data);

    // Create maps
    const itemsById = new Map();
    const tabs = new Map();
    const folders = new Map();

    // Categorize items
    for (const item of allObjects) {
      if (!item.id) continue;

      itemsById.set(item.id, item);

      if (item.data?.tab) {
        tabs.set(item.id, item);
      } else if (item.data?.list) {
        folders.set(item.id, item);
      }
    }

    // Build folder objects with pinned status
    const buildFolder = (folderId) => {
      const folder = folders.get(folderId);
      if (!folder) return null;

      const isPinned = this.isTabPinned(folder, itemsById, pinnedMap);
      const children = [];

      // Process children
      if (folder.childrenIds) {
        for (const childId of folder.childrenIds) {
          if (tabs.has(childId)) {
            // It's a tab
            const tab = tabs.get(childId);
            children.push({
              type: 'tab',
              id: tab.id,
              title: tab.data.tab.savedTitle,
              url: tab.data.tab.savedURL,
              pinned: isPinned,
              createdAt: this.convertCFTimeToISO(tab.createdAt),
              lastActiveAt: this.convertCFTimeToISO(tab.data.tab.timeLastActiveAt)
            });
          } else if (folders.has(childId)) {
            // It's a nested folder
            const nestedFolder = buildFolder(childId);
            if (nestedFolder) {
              children.push(nestedFolder);
            }
          }
        }
      }

      return {
        type: 'folder',
        id: folder.id,
        title: folder.title,
        pinned: isPinned,
        createdAt: this.convertCFTimeToISO(folder.createdAt),
        items: children
      };
    };

    // Get space models
    const spaceModels = data.firebaseSyncState?.syncData?.spaceModels || [];
    const spaces = [];

    for (const model of spaceModels) {
      if (typeof model !== 'object' || !model.value) continue;

      const space = model.value;
      const items = [];
      const containerIDs = space.containerIDs || [];

      // Process container IDs to build hierarchy
      let isPinned = false;

      for (const containerID of containerIDs) {
        if (containerID === 'pinned') {
          isPinned = true;
          continue;
        } else if (containerID === 'unpinned') {
          isPinned = false;
          continue;
        }

        // Find all items (tabs/folders) that have this container as their parent
        // This handles itemContainer types
        for (const [itemId, item] of [...folders, ...tabs]) {
          if (item.parentID === containerID) {
            if (folders.has(itemId)) {
              const folder = buildFolder(itemId);
              if (folder) {
                items.push(folder);
              }
            } else if (tabs.has(itemId)) {
              const tab = tabs.get(itemId);
              items.push({
                type: 'tab',
                id: tab.id,
                title: tab.data.tab.savedTitle,
                url: tab.data.tab.savedURL,
                pinned: isPinned,
                createdAt: this.convertCFTimeToISO(tab.createdAt),
                lastActiveAt: this.convertCFTimeToISO(tab.data.tab.timeLastActiveAt)
              });
            }
          }
        }
      }

      spaces.push({
        name: space.title,
        id: space.id,
        items: items
      });
    }

    return spaces;
  }

  /**
   * Get a specific folder by name
   */
  getFolder(folderName) {
    const folders = this.getTabsByFolder();
    for (const [name, data] of folders.entries()) {
      if (name.toLowerCase() === folderName.toLowerCase()) {
        return data;
      }
    }
    return null;
  }

  /**
   * Search tabs in folders
   */
  searchTabsInFolders(query) {
    const folders = this.getTabsByFolder();
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [folderName, data] of folders.entries()) {
      for (const tab of data.tabs) {
        if (
          tab.title.toLowerCase().includes(lowerQuery) ||
          tab.url.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            ...tab,
            folderName: folderName,
            folderId: data.id
          });
        }
      }
    }

    return results;
  }

}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const organizer = new ArcTabOrganizer();

  // Parse arguments
  const jsonOutput = args.includes('--json');
  const foldersMode = args.includes('--folders');
  const spaceArg = args.indexOf('--space');
  const folderArg = args.indexOf('--folder');
  const specificSpace = spaceArg !== -1 ? args[spaceArg + 1] : null;
  const specificFolder = folderArg !== -1 ? args[folderArg + 1] : null;

  // Filter arguments
  const pinnedFilter = args.includes('--pinned') ? true : (args.includes('--unpinned') ? false : undefined);
  const createdAfterArg = args.indexOf('--created-after');
  const createdBeforeArg = args.indexOf('--created-before');
  const activeAfterArg = args.indexOf('--active-after');
  const activeBeforeArg = args.indexOf('--active-before');

  const createdAfter = createdAfterArg !== -1 ? args[createdAfterArg + 1] : null;
  const createdBefore = createdBeforeArg !== -1 ? args[createdBeforeArg + 1] : null;
  const activeAfter = activeAfterArg !== -1 ? args[activeAfterArg + 1] : null;
  const activeBefore = activeBeforeArg !== -1 ? args[activeBeforeArg + 1] : null;

  // Check if any filters are specified
  const hasFilters = pinnedFilter !== undefined || createdAfter || createdBefore || activeAfter || activeBefore;

  // Filter mode
  if (hasFilters && !foldersMode) {
    const filterOptions = {
      spaceName: specificSpace,
      pinned: pinnedFilter
    };

    if (createdAfter) filterOptions.createdAfter = createdAfter;
    if (createdBefore) filterOptions.createdBefore = createdBefore;
    if (activeAfter) filterOptions.lastActiveAfter = activeAfter;
    if (activeBefore) filterOptions.lastActiveBefore = activeBefore;

    const results = organizer.filterTabs(filterOptions);

    // Sort by most recently active first
    results.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n=== Filtered tabs ===`);
      console.log(`Found ${results.length} tabs\n`);

      for (const tab of results) {
        const lastActive = new Date(tab.lastActiveAt);
        const daysAgo = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        const timeAgo = daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;

        const pinnedIcon = tab.pinned ? '📌' : '📄';
        console.log(`${pinnedIcon} ${tab.title}`);
        console.log(`   ${tab.url}`);
        console.log(`   Space: ${tab.spaceName}${tab.folderPath ? ' > ' + tab.folderPath : ''}`);
        console.log(`   Last active: ${timeAgo}`);
        console.log(`   Created: ${new Date(tab.createdAt).toLocaleDateString()}`);
        console.log('');
      }
    }
    return;
  }

  // Folders mode
  if (foldersMode) {
    const folders = organizer.getTabsByFolder();

    if (specificFolder) {
      const folder = organizer.getFolder(specificFolder);
      if (folder) {
        if (jsonOutput) {
          console.log(JSON.stringify(folder, null, 2));
        } else {
          const pinnedIcon = folder.pinned ? '📌' : '📄';
          const pinnedLabel = folder.pinned ? '[PINNED]' : '[UNPINNED]';
          console.log(`\n${pinnedIcon} ${folder.title || folder.id} ${pinnedLabel}`);
          console.log(`Tabs: ${folder.tabs.length}\n`);
          for (const tab of folder.tabs) {
            console.log(`  ${tab.title}`);
            console.log(`    ${tab.url}`);
          }
        }
      } else {
        console.error(`Folder "${specificFolder}" not found`);
        const folderNames = Array.from(folders.keys()).filter(name => name !== null);
        console.error(`Available folders: ${folderNames.join(', ')}`);
        process.exit(1);
      }
    } else {
      if (jsonOutput) {
        const output = {};
        for (const [name, data] of folders.entries()) {
          output[name] = data;
        }
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(`\n=== Folders and Tabs ===\n`);
        for (const [name, data] of folders.entries()) {
          const pinnedIcon = data.pinned ? '📌' : '📄';
          console.log(`${pinnedIcon} ${name} (${data.tabs.length} tabs) ${data.pinned ? '[PINNED]' : '[UNPINNED]'}`);
          console.log(`   ID: ${data.id}`);
          if (data.parentID) {
            console.log(`   Parent ID: ${data.parentID}`);
          }
          // Show first 3 tabs
          for (const tab of data.tabs.slice(0, 3)) {
            console.log(`   - ${tab.title}`);
          }
          if (data.tabs.length > 3) {
            console.log(`   ... and ${data.tabs.length - 3} more tabs`);
          }
          console.log('');
        }
        console.log(`Total folders: ${folders.size}`);
        console.log(`Total tabs: ${Array.from(folders.values()).reduce((sum, f) => sum + f.tabs.length, 0)}`);
      }
    }
    return;
  }

  // Spaces mode
  const spaces = organizer.getSpaces();

  // Output
  if (specificSpace) {
    const space = spaces.find(s => s.name.toLowerCase() === specificSpace.toLowerCase());
    if (space) {
      if (jsonOutput) {
        console.log(JSON.stringify(space, null, 2));
      } else {
        console.log(`\n=== ${space.name} ===`);

        const printItems = (items, indent = '') => {
          for (const item of items) {
            if (item.type === 'folder') {
              const icon = item.pinned ? '📌' : '📄';
              console.log(`${indent}${icon} ${item.title} (folder)`);
              printItems(item.items, indent + '  ');
            } else {
              console.log(`${indent}  ${item.title}`);
              console.log(`${indent}    ${item.url}`);
            }
          }
        };

        printItems(space.items);
      }
    } else {
      console.error(`Space "${specificSpace}" not found`);
      console.error(`Available spaces: ${spaces.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
  } else {
    if (jsonOutput) {
      console.log(JSON.stringify(spaces, null, 2));
    } else {
      for (const space of spaces) {
        console.log(`\n=== ${space.name} ===`);

        const printItems = (items, indent = '') => {
          for (const item of items) {
            if (item.type === 'folder') {
              const icon = item.pinned ? '📌' : '📄';
              console.log(`${indent}${icon} ${item.title} (${item.items.length} items)`);
            } else {
              console.log(`${indent}  ${item.title}`);
            }
          }
        };

        printItems(space.items);
        console.log('');
      }
    }
  }
}

module.exports = ArcTabOrganizer;
