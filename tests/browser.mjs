// 測試共用的瀏覽器啟動（不是測試檔；檔名不以 .test.mjs 結尾，node --test 不會單獨跑它）：WebGL 一律走顯示卡（D3D11）。
// 不帶這三個旗標時，headless Chromium 用 CPU 模擬 WebGL（SwiftShader）：glb-loader 的 W＋W2 要 9.3 核，走顯示卡 1.6 核（2026-11-23 實測）。
// tests/ 裡的測試一律用這支開瀏覽器；真的只在 CPU 繪圖下才成立的，直接啟動並在上一行寫「// 不走顯示卡：<理由>」（tests/browser-launch-scan.test.mjs 會掃）。
export const launchGpu = (chromium) => chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
