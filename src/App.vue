<template>
  <div class="container-wrap" v-bind:class="{ lsqDark: opts.isDark }" @click="_onClickOutside">
    <div class="container-inner shadow-lg" v-if="ready" :style="{ left: left + 'px', top: _top + 'px' }">
      <Item />
    </div>
  </div>
</template>

<script setup lang="ts">

import Item from "./components/SearchPanel.vue";
import { ref, onMounted, provide } from 'vue';

const __debug = false;
let ready = ref(false);
let left = ref(0);
let _top = ref(0);
let opts = ref({
  isDark: false,
});
provide("opts", opts);

onMounted(async () => {
  const c = await logseq.App.getUserConfigs();
  opts.value.isDark = c.preferredThemeMode === "dark";

  logseq.App.onThemeModeChanged(({ mode }) => {
    opts.value.isDark = mode === "dark";
  });

  logseq.once("ui:visible:changed", ({ visible }) => {
    if (visible) ready.value = true;
    document.addEventListener("keyup", onKeyUp); // close on ESC
  });

  logseq.on("ui:visible:changed", async ({ visible }) => {
    if (visible) {
      const cursorPos = (await logseq.Editor.getEditingCursorPosition() || {
        left: 0, top: 0, rect: null
      });
      // console.log(await logseq.Editor.getEditingCursorPosition());

      left.value = cursorPos.left + cursorPos.rect.left
      _top.value = cursorPos.top + cursorPos.rect.top

      let container = document.querySelector('.container-inner');
      container.querySelector('input')?.select()

    }
  });
});
const closePanel = (opts: any = { restoreEditingCursor: true }) => {
  logseq.hideMainUI(opts);
}
const onKeyUp = (e) => {
  if (e.key === "Escape") {
    closePanel();
  }
}

const _onClickOutside = ({ target }) => {
  const inner = target.closest(".container-inner");

  if (!inner) closePanel();
};
</script>

<style >
/* :style="{ left: left + 'px', top: _top + 'px' }" */
.container-wrap {
  position: absolute;
  z-index: 9999;
  width: 620px;
  height: 500px;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: left;
}

.container-inner {
  width: 620px;
  height: 500px;
}
</style>