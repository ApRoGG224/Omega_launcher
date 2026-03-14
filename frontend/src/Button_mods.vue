<template>
  <button class="mods-button">
    Explore Mods
  </button>
</template>

<style scoped>
.mods-button {
  background: linear-gradient(135deg, #6d0283, #7728d9, #391369);
  color: #2c0548;
  border: none;
  padding: 12px 24px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  margin-top: 20px;
}

.mods-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.mods-button:active {
  transform: translateY(0);
}
</style>