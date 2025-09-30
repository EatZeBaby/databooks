<script setup lang="ts">
import { ref, watch } from 'vue'
import { readStoredPalette, readStoredScheme, setPalette, setScheme, type ColorPalette, type ColorScheme } from '../lib/theme'

const palettes: { label: string, value: ColorPalette }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Teal', value: 'teal' },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' },
  { label: 'Rose', value: 'rose' },
]

const schemes: { label: string, value: ColorScheme }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
]

const selectedPalette = ref<ColorPalette>(readStoredPalette())
const selectedScheme = ref<ColorScheme>(readStoredScheme())

watch(selectedPalette, (p) => setPalette(p))
watch(selectedScheme, (s) => setScheme(s))
</script>

<template>
  <div class="settings">
    <h1>Appearance</h1>
    <section class="section">
      <h2>Theme</h2>
      <div class="options">
        <label v-for="p in palettes" :key="p.value" class="option">
          <input type="radio" name="palette" :value="p.value" v-model="selectedPalette" />
          <span class="swatch" :style="{ backgroundColor: 'var(--color-primary)' }" :data-palette="p.value"></span>
          <span>{{ p.label }}</span>
        </label>
      </div>
    </section>

    <section class="section">
      <h2>Color scheme</h2>
      <n-radio-group v-model:value="selectedScheme">
        <n-radio v-for="s in schemes" :key="s.value" :value="s.value">{{ s.label }}</n-radio>
      </n-radio-group>
    </section>
  </div>
  
</template>

<style scoped>
.settings { max-width: 720px; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 0 0 1rem 0; }
.section { margin: 1.25rem 0; }
.options { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; }
.option { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; }
.option input { margin: 0; }
.swatch { display: inline-block; width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); }
.swatch[data-palette="default"] { background-color: #FF3621; }
.swatch[data-palette="teal"] { background-color: #0d9488; }
.swatch[data-palette="purple"] { background-color: #7c3aed; }
.swatch[data-palette="orange"] { background-color: #f97316; }
.swatch[data-palette="rose"] { background-color: #e11d48; }
</style>


