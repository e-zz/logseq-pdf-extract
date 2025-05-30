<template>
  <div class="search-box" :class="[opts.isDark ? 'dark' : 'light']">
    <div class="search-header">
      <input id="zotero-input" v-model="searchText" placeholder="Zotero" @input="onInput" @keydown.enter="onEnter"
        @keydown.up.prevent="moveSelection(-1)" @keydown.down.prevent="moveSelection(1)" />
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="search-icon" @click="search" height="18px"
        width="18px">
        <path
          d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l9.4-9.4c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
      </svg>
    </div>

    <DynamicScroller class="search-list-wrap" ref="scrollerRef" :items="items" keyField="key" :min-item-size="54">
      <template #default="{ item, index }">
        <DynamicScrollerItem :item="item">
          <div :key="item.key" class="zotero-list-item" :class="{ 'is-selected': selectedItemIndex === index }"
            @click="event => onClickItem(item.key, event)">
            <div class="title">{{ item.title }}</div>
            <div class="info">{{ item.date }}<span class="authors">{{ formatAuthors(item.creators) }}</span></div>
          </div>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
  </div>
</template>

<script setup lang="ts">
const __debug = false;

import { Zotero } from '../zotero/zotero'
import { ref, onMounted, inject } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import Fuse from 'fuse.js';

const scrollerRef = ref(null);
const searchText = ref('')
let items = ref([])
const selectedItemIndex = ref(0);
// get delay from logseq.settings
const delay = logseq.settings?.search_delay || 100;
const opts = inject('opts')
let lastSearch = searchText.value;
let zotero = new Zotero();

if (__debug) console.log(opts.value.isDark);

// for (let i = 0; i < 800; i++) {
//   items.value.push({
//     key: i,
//     title: 'title' + i,
//     dateModified: '2021-09-01'
//   });
// }

// Create a computed property that returns a new Fuse object with the current value of items
const fuse = (items_list) => new Fuse(items_list.value, {
  keys: [
    {
      name: 'title',
      weight: 0.7
    },
    {
      name: 'creators',
      weight: 0.7
    },
    {
      name: 'tags',
      weight: 0.7
    },
    {
      name: 'itemType',
      weight: 0.7
    },
    {
      name: 'journalAbbreviation',
      weight: 0.7
    },
    {
      name: "doi",
      weight: 0.7
    },
    {
      name: 'date',
      weight: 0.3
    },
    {
      name: 'dateAdded',
      weight: 0.1
    },
    {
      name: 'dateModified',
      weight: 0.1
    }
  ],
  threshold: 1
});

const search = async () => {
  // console.log(searchText.value)
  selectedItemIndex.value = 0;
  let res;
  if (searchText.value === '') {
    items.value = await zotero.api.getRecentModified();
  } else {
    res = await zotero.search(searchText.value)
    // remove attachments or notes
    // TODO ref Zapi: ItemType=-attachment
    items.value = res.filter((item) => !item.parentItem);
    // Use Fuse to sort items
    const result = fuse(items).search(searchText.value);
    items.value = result.map(({ item }) => item);
  }
  
}

const author_format = (creator) => {
  return `${creator.firstName} ${creator.lastName}`;
}

const formatAuthors = (creators) => {
  if (!creators || creators.length === 0) {
    return '';
  }
  if (creators.length <= 2) {
    // [{firstName: "John", lastName: "Doe", creatorType: "author"}, ...]
    return creators.map(author_format).join(', ');
  }
  // return `${[creators[0], creators[1], creators[2]].map(author_format)}, ...${author_format(creators[creators.length - 1])}`;
  return `${creators.slice(0, 2).map(author_format)}, ..., ${author_format(creators[creators.length - 1])}`;
};

onMounted(async () => {
  search();
})


let timeoutId = null;
const onInput = () => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    const newSearch = searchText.value.trim();
    if (lastSearch !== newSearch || newSearch === '') {
      search();
      lastSearch = newSearch;
    }
  }, delay); // 100ms delay
};

const onEnter = async () => {
  // either import or search again
  const newSearch = searchText.value.trim()
  if (lastSearch == newSearch) {
    if (items.value?.length && items.value?.length > 0) {
      await insert(items.value[selectedItemIndex.value].key);
      //  assume the import and insert is finished. Hide the panel
      logseq.hideMainUI({ restoreEditingCursor: true });
    }
  } else {
    search();
    lastSearch = newSearch;
  }
}

const onClickItem = (key, event) => {
  insert(key);
  if (!event.ctrlKey) {
    // click: insert and then close the UI
    logseq.hideMainUI({ restoreEditingCursor: true });
  } else {
    // ctrl + click: insert, keep the UI open and move the cursor to the next line
    logseq.Editor.insertAtEditingCursor('\n');
  }
}
// TODO better multiple select
const insert = async (key) => {
  if (__debug) console.log("clicked item key=", key);

  let res = await zotero.getByKeys([key,])
  res = await Zotero.safeImportToCursor(res)

}

const moveSelection = (direction) => {
  const scrollTop = scrollerRef.value.$el.scrollTop;
  const clientHeight = scrollerRef.value.$el.clientHeight;
  // TODO better way to determine the active range
  const minItemSize = 54;
  const firstVisibleIndex = Math.floor(scrollTop / minItemSize);
  const lastVisibleIndex = Math.ceil((scrollTop + clientHeight) / minItemSize) - 1;
  const moveUpBound = firstVisibleIndex;
  const moveLowBound = lastVisibleIndex - 1;

  selectedItemIndex.value = Math.max(
    0,
    Math.min(items.value.length - 1, selectedItemIndex.value + direction)
  );
  if (selectedItemIndex.value < moveUpBound) {
    scrollerRef.value.scrollToItem(selectedItemIndex.value);
  } else if (selectedItemIndex.value > moveLowBound) {
    scrollerRef.value.scrollToItem(selectedItemIndex.value - (moveLowBound - moveUpBound));
  }

  // scrollerRef.value.scrollToItem(selectedItemIndex.value);
  if (__debug) console.log(direction, selectedItemIndex.value);

};
</script>

<style scoped lang="scss">
.search-box {
  display: flex;
  flex-direction: column;
  height: 100%;

  .search-list-wrap {
    flex: 1;
    overflow: auto;
  }
}

$dark-background: #1e1e1e;
$light-text: #a3a3a3;
$dark-border: #757575;
$hover-background: #3e3d3d;

.search-box.dark {
  background-color: $dark-background;
  color: $light-text;

  .search-header {
    border-bottom: 1px solid $dark-border;

    #zotero-input {
      background-color: $dark-background !important;
      color: $light-text;
    }
  }

  .search-icon {
    fill: $light-text;
  }

  .zotero-list-item:hover {
    background-color: $hover-background;
  }

  .is-selected {
    background-color: $hover-background;
  }
}

.search-header {
  position: relative;
  /* padding: 20px 0 0; */
  margin: 10px;
}

.search-header input {
  font-size: 16px;
  width: 100%;
  border: none;
  border-bottom: 1px solid #757575;
  outline: none;
  /* padding-bottom: 2px; */
}

.search-header svg {
  position: absolute;
  right: 10px;
  top: 40%;
  width: 18px !important;
  height: 18px !important;
  transform: translateY(-50%);
  cursor: pointer;
}

.search-list-wrap {
  overflow: auto;
  height: 100%;
  // width: 100%;
}

.zotero-list-item {
  display: flex;
  flex-direction: column;
  padding: 10px;
  // border-bottom: 1px solid #757575;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }

  .title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-wrap: ellipsis;
    // width: 100%;
  }

  &.is-selected {
    background-color: #f5f5f5;
  }

  .info {
    font-size: 14px;
    color: #757575;
  }

  .authors {
    margin-left: 15px;
    white-space: nowrap;
  }
}
</style>