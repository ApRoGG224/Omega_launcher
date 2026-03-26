<template>
  <nav class="navbar-notch">
    <div class="logo">
      <img src="@/assets/icon.png" alt="Omega" class="logo-img" />
    </div>
    <div class="menu">
      <a href="#" class="item active">Home</a>
      <a href="#" class="item">Library</a>
      <a href="#" class="item">Store</a>
    </div>
    <div class="actions">
      <button class="login-btn">Login</button>

    </div>
  </nav>
</template>
<style scoped>
.navbar-notch {
  position: fixed;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 90%;
  max-width: 1100px;
  height: 64px;
  padding: 0 24px;
  background-color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  background: rgba(13, 13, 18, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 0 1px rgba(255, 255, 255, 0.2) inset;
    display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo-img {
  height: 42px;
  width: auto;
  filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
  transition: transform 0.3s;
}
.logo-img:hover {
  transform: scale(1.1);
}
/* Стили меню */
.menu {
  display: flex;
  gap: 30px;
}
.item {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.3s, text-shadow 0.3s;
}
.item:hover, .item.active {
  color: #fff;
}
.item.active {
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.login-btn {
  padding: 8px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #db2777);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}
.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5);
  filter: brightness(1.1);
}
</style>