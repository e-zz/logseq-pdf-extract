<template>
  <div class="search-box" :class="[opts.isDark ? 'dark' : 'light']">
    <div class="search-header">
      <input id="zotero-input" v-model="searchText" placeholder="Zotero" @keydown.enter="search" />
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="search-icon" @click="search" height="18px"
        width="18px">
        <path
          d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l9.4-9.4c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
      </svg>
    </div>

    <DynamicScroller class="search-list-wrap" :items="items" keyField="key" :min-item-size="54">
      <template #default="{ item }">
        <DynamicScrollerItem :item="item">
          <div :key="item.key" class="zotero-list-item" @click="insert(item.key)">
            <div class="title">{{ item.title }}</div>
            <div class="info">{{ item.dateModified }}</div>
          </div>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
  </div>
</template>

<script setup lang="ts">

import { Zotero } from '../zotero/zotero'
import { ref, inject } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';

const searchText = ref('')
let items = ref([])
const opts = inject('opts')
console.log(opts.value.isDark);

// for (let i = 0; i < 800; i++) {
//   items.value.push({
//     key: i,
//     title: 'title' + i,
//     dateModified: '2021-09-01'
//   });
// }

const search = async () => {
  // console.log(searchText.value)
  let res = await Zotero.search(searchText.value)
  // let res = await Zotero.search('quantum')

  // res.forEach((item) => {
  //   if (item.title === undefined) console.log(item)
  // })

  items.value = res.filter((item) => !item.parentItem);

  // await nextTick()
  console.log(res[0]);

}
// TODO multiple select
const insert = async (key) => {
  console.log("clicked item key=", key);
  let res = await Zotero.getByKeys([key,])
  res = await Zotero.safeImportToCursor(res)
}
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

  .info {
    font-size: 14px;
    color: #757575;
  }
}
</style>