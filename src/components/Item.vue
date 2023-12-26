<template>
  <div>
    <input v-model="searchText" placeholder="Zotero" />
    <button @click="search">search</button>
  </div>
</template>

<script setup lang="ts">

import { ref, defineComponent } from 'vue'

const searchText = ref('')

const search = () => {
  console.log(searchText.value)
}

</script>