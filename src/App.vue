<template>
  <div class="container-wrap" v-bind:class="{ lspdark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: top + 'px' }">


    </div>
  </div>
</template>

<script setup lang="ts">
const __debug = false;



import { ref, onMounted } from 'vue';

const ready = ref(false);
const left = ref(0);
const top = ref(0);
const opts = ref({
  isDark: false,
});

onMounted(async () => {
  const c = await logseq.App.getUserConfigs();
  opts.value.isDark = c.preferredThemeMode === "dark";

  logseq.App.onThemeModeChanged(({ mode }) => {
    opts.value.isDark = mode === "dark";
  });

  logseq.once("ui:visible:changed", ({ visible }) => {
    if (visible) ready.value = true;
  });
});

const _onClickOutside = ({ target }) => {
  const inner = target.closest(".container-inner");

  if (!inner) logseq.hideMainUI();
};
</script>
