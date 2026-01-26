<script setup lang="ts">
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="headerInner">
        <div class="brand">
          <svg class="brandIcon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="brandGradient" x1="3" y1="3" x2="21" y2="21">
                <stop offset="0" stop-color="#2563eb" />
                <stop offset="1" stop-color="#22c55e" />
              </linearGradient>
            </defs>
            <path
              d="M6.5 4.75h5A1.75 1.75 0 0 1 13.25 6.5v12.25H6.5A1.75 1.75 0 0 1 4.75 17V6.5A1.75 1.75 0 0 1 6.5 4.75Zm6 0h5A1.75 1.75 0 0 1 19.25 6.5V17A1.75 1.75 0 0 1 17.5 18.75h-4.75V6.5A1.75 1.75 0 0 0 12.5 4.75Z"
              fill="url(#brandGradient)"
              fill-rule="evenodd"
              clip-rule="evenodd"
            />
            <path d="M9.25 9.25h2.5" stroke="#0f172a" stroke-width="1.75" stroke-linecap="round" opacity="0.95" />
            <path d="M9.25 12h2.5" stroke="#0f172a" stroke-width="1.75" stroke-linecap="round" opacity="0.95" />
            <path d="M9.25 14.75h2.5" stroke="#0f172a" stroke-width="1.75" stroke-linecap="round" opacity="0.95" />
            <path
              d="M14.75 10l1.5 2-1.5 2"
              stroke="#0f172a"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.95"
            />
          </svg>
          <div class="brandText">文件比对工具</div>
        </div>
        <nav class="nav">
          <RouterLink class="link" to="/">主页</RouterLink>
          <RouterLink class="link" to="/history">历史</RouterLink>
        </nav>
        <div class="spacer" />
        <a class="ext" href="https://github.com/" target="_blank" rel="noreferrer">隐私保护</a>
      </div>
    </header>

    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.78);
  backdrop-filter: blur(10px);
  padding: 12px 0;
}

.headerInner {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.brandIcon {
  flex: none;
}

.brandText {
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.nav {
  display: flex;
  gap: 10px;
}

.link {
  color: #334155;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
}

.link.router-link-active {
  border-color: rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.85);
  color: #0f172a;
}

.spacer {
  flex: 1;
}

.ext {
  color: #64748b;
  font-size: 12px;
}

.main {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 16px 0 26px;
}
</style>
