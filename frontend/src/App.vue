<script setup>
import ListMods from './components/ListMods.vue'
</script>

<template>
  <div class="app-container">
    <h3>Omega Launcher</h3>
    <ListMods />
    <button class="discover-btn" id="discover-mods-btn">
      Discover mods
    </button>
  </div>
</template>

<style scoped>
h3 {
  font-weight: bold;
  color: rgba(120, 10, 98, 0.763);
  font-size: 4rem;
  margin: 0;
  letter-spacing: 0.1em;
}

.app-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 40%;
  text-align: center;
}

.discover-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.65rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff;
  background: linear-gradient(135deg, rgba(243, 62, 186, 0.85), rgba(180, 30, 60, 0.9));
  border: 1px solid rgba(243, 62, 92, 0.5);
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.discover-btn:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(255, 80, 110, 0.95), rgba(200, 40, 70, 1));
  box-shadow: 0 0 22px rgba(243, 62, 92, 0.65);
}
.discover-btn:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(243, 62, 92, 0.3);
}

</style>