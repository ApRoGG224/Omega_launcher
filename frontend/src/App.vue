<script setup lang="ts">
import Button_mods from "./Button_mods.vue";
</script>

<template>
  <div class="main-container">
    <div class="content">
      <h1 class="hero-title">The place for Minecraft mods</h1>
      <Button_mods />
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 98vw;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.hero-title {
  font-size: 4rem; 
  color: #bfc0d1;
  text-align: center;
  font-family: sans-serif;
  font-weight: bold;
}
</style>