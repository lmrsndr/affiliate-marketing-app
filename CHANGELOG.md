# Changelog

## 1.0.0 (2025-09-07)


### Features

* **2fa:** add /setup-2fa UI (send + verify + redirect) and envs ([e71e466](https://github.com/lmrsndr/affiliate-marketing-app/commit/e71e4666e62a33b6ca450a2b794e74da53ec25e1))
* **2fa:** add /setup-2fa UI (send + verify + redirect) and envs ([711d143](https://github.com/lmrsndr/affiliate-marketing-app/commit/711d14387a52619407631dee5d73caa61433b8f7))
* **auth-2fa:** add otpOrRefresh middleware and dev email fallback ([9fb45aa](https://github.com/lmrsndr/affiliate-marketing-app/commit/9fb45aa02a3c7c8131215ff90b7d085adead2433))
* **auth-2fa:** add otpOrRefresh middleware and dev email fallback ([9a11027](https://github.com/lmrsndr/affiliate-marketing-app/commit/9a1102730e155890aef5e24cbdc2db4454444ec4))
* **backend:** add /api/health and /api/ready endpoints ([394351d](https://github.com/lmrsndr/affiliate-marketing-app/commit/394351da412e14ac8e69a047d24293134bd030b8))
* **backend:** add /api/health and /api/ready endpoints ([e0b6ad7](https://github.com/lmrsndr/affiliate-marketing-app/commit/e0b6ad7cac0307ac191641f19847809d1c7fabe2))
* **frontend:** add light.css and dark.css theme overrides ([54cdf35](https://github.com/lmrsndr/affiliate-marketing-app/commit/54cdf3525909158f1010fcc2cdc0fcfc1bd9a5b7))
* **frontend:** replace favicon pack and update index.html to use PWA icons ([f0c989b](https://github.com/lmrsndr/affiliate-marketing-app/commit/f0c989b4812aa4770a91af41563510697494f569))
* **frontend:** update favicon pack and web manifest; set brand meta in index.html ([3b6ad1f](https://github.com/lmrsndr/affiliate-marketing-app/commit/3b6ad1f3ff129ba7507435d71502d11d81832ce0))
* **router:** wire accounting routes and admin menu ([3aea74e](https://github.com/lmrsndr/affiliate-marketing-app/commit/3aea74edf9b63c7c7e8c81eee606be098c1757e4))
* secure auth/2FA updates; skip frontend.zip (2025-09-07) ([2b2a517](https://github.com/lmrsndr/affiliate-marketing-app/commit/2b2a517f1de8119af626cdc9fdedf6472d163fee))


### Bug Fixes

* **2fa:** disable native validation, use [0-9]{6}, sanitize digits, string payload ([ca49717](https://github.com/lmrsndr/affiliate-marketing-app/commit/ca497174650378939a034366049f6601702d1ec6))
* **auth:** enforce pre-2FA flow, add otpOrRefreshMiddleware, rotate c… ([b13a165](https://github.com/lmrsndr/affiliate-marketing-app/commit/b13a165d3edf1469a2d5b82daa13fd49ae9d9094))
* **auth:** enforce pre-2FA flow, add otpOrRefreshMiddleware, rotate cookies after 2FA verification ([19408b7](https://github.com/lmrsndr/affiliate-marketing-app/commit/19408b72fb332b6e34b8d8906830456e90651803))
* **backend:** add compression dependency (resolve peer deps via legac… ([a09a7f9](https://github.com/lmrsndr/affiliate-marketing-app/commit/a09a7f97a86ed294b0d769521b270e348c07f84d))
* **backend:** add compression dependency (resolve peer deps via legacy mode) ([fc8c21c](https://github.com/lmrsndr/affiliate-marketing-app/commit/fc8c21c4e6dbde84cf91b2112e7030fe0fad102a))
* **frontend:** correct CSS import paths to src/css in App.vue ([919d102](https://github.com/lmrsndr/affiliate-marketing-app/commit/919d10292d07289477fdfef94b4521f88ddcdea9))
* **frontend:** replace legacy /logo512.png reference with /android-chrome-512x512.png ([e9cfa5f](https://github.com/lmrsndr/affiliate-marketing-app/commit/e9cfa5fdf99175bd39c132d8a8fb5fcb4ea20597))
* replace Verify2FA.vue with working 6-digit input + otpTicket flow ([d2090e6](https://github.com/lmrsndr/affiliate-marketing-app/commit/d2090e6f901ae7657af1586bdf95c8f0090b71cb))
* update PWA icons and references ([82fa02f](https://github.com/lmrsndr/affiliate-marketing-app/commit/82fa02f1dd9d2641e262730747b61f8b48a6f081))
* update PWA icons and references (HomeView, manifest, index.html) ([046d757](https://github.com/lmrsndr/affiliate-marketing-app/commit/046d75769e339b2ccb097c451d2baee56cda0469))
