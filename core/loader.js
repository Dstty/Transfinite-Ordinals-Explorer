// ============================================================================
//  core/loader.js — 清单驱动的记号加载器（分层并行）
// ============================================================================
//  与旧版的唯一差别是**等待方式**，不是加载内容：
//    旧版：script.onload 串行链 —— 一个文件下完才发下一个请求。
//    新版：按清单 dependsOn **分层**，同层一次性全部注入（浏览器并行 / HTTP/2
//          多路复用），层间再等。
//  为什么改：清单 207 条，旧版在 GitHub Pages 上等于 207 次串行往返（实测
//  ~330ms/个 → 约 68s 才出首屏）。同层条目本来就互相无依赖，没有理由排队。
//
//  依赖语义不变：仍以清单里的 dependsOn 为准（跨文件全局如 window.NEUTILS、
//  sequence_display 都靠它排序）。层内顺序不保证，所以**同层文件之间不允许有
//  未声明的依赖** —— 新增记号若依赖别的文件，必须在清单里写 dependsOn。
//
//  单文件失败仍只告警并继续（与旧版一致），不卡整页。
// ============================================================================
(function () {
  'use strict';

  var manifest = window.NOTATION_MANIFEST || [];
  if (!manifest.length) {
    console.error('[loader] window.NOTATION_MANIFEST 为空：请确认 core/notation-manifest.js 已先加载。');
    window.__dshLoaderDone = Promise.resolve();
    return;
  }

  var byFile = {};
  manifest.forEach(function (item) {
    byFile[item.file] = item;
  });

  // --------------------------------------------------------------------------
  //  分层：只有 dependsOn 全部落在更早层的条目，才能进当前层。
  //  层内顺序沿用清单顺序（便于复现），但执行先后不做保证。
  // --------------------------------------------------------------------------
  function toLayers(list) {
    var doneLayer = {};
    var pending = list.slice();
    var layers = [];
    while (pending.length) {
      var layer = [];
      var rest = [];
      pending.forEach(function (item) {
        var deps = item.dependsOn || [];
        var ready = deps.every(function (dep) {
          if (doneLayer[dep]) return true;
          if (!byFile[dep]) {
            console.warn('[loader] 清单依赖未列出: ' + dep + '（被 ' + item.file + ' 引用）');
            return true;
          }
          return false;
        });
        (ready ? layer : rest).push(item);
      });
      if (!layer.length) {
        // 循环依赖：整批并行，至少不卡死；旧版靠 onload 链硬试同样会乱序。
        console.error(
          '[loader] 清单存在循环依赖，涉及: ' + rest.map(function (i) { return i.file; }).join(', '),
        );
        layer = rest;
        rest = [];
      }
      layer.forEach(function (item) {
        doneLayer[item.file] = true;
      });
      layers.push(layer);
      pending = rest;
    }
    return layers;
  }

  // 分层：bootstrap 条目（分类骨架）单独成第 0 层。
  // 它没有 dependsOn，分层时本来会跟 ne 记号挤进同一层；而 register_notation 若
  // 先于 register_category 执行，注册表会去自动补分类，生成器元信息会丢。
  var bootItems = manifest.filter(function (item) { return item.bootstrap; });
  var restItems = manifest.filter(function (item) { return !item.bootstrap; });
  var layers = bootItems.length ? [bootItems] : [];
  layers = layers.concat(toLayers(restItems));
  var failed = [];

  // 供自检脚本断言分层结果（scripts/verify-loader.mjs）
  window.__dshLoaderLayers = layers.map(function (layer) {
    return layer.map(function (item) {
      return item.file;
    });
  });

  function inject(item) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = item.file;
      // ne 原生风格记号是 ES module（自行 import core/ne 运行时）；旧记号是普通
      // script（IIFE + 全局 register.push）。两者可以同层并行：module 的 onload
      // 在它自己的依赖图执行完后才触发，因此不会出现「module 还没跑就启动 app.js」。
      if (item.module) script.type = 'module';
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        console.error('[loader] 记号文件加载失败: ' + item.file);
        failed.push(item.file);
        resolve(); // 单个失败不中断整页
      };
      // 优先注入 <body>（<head> 解析期 document.body 可能为 null，兜底到 <head>）
      (document.body || document.head).appendChild(script);
    });
  }

  // --------------------------------------------------------------------------
  //  启动应用：注入 ui/app.js（ES Module，依赖 React CDN 与记号注册表已就绪）
  // --------------------------------------------------------------------------
  function startApp() {
    if (document.querySelector('script[data-dsh-app-entry]')) return;
    var entry = document.createElement('script');
    entry.type = 'module';
    entry.src = 'ui/app.js';
    entry.setAttribute('data-dsh-app-entry', '');
    entry.onerror = function () {
      console.error('[loader] 应用入口 ui/app.js 加载失败。');
    };
    (document.body || document.head).appendChild(entry);
  }

  function run() {
    var chain = Promise.resolve();
    layers.forEach(function (layer) {
      chain = chain.then(function () {
        return Promise.all(
          layer.map(function (item) {
            return inject(item);
          }),
        );
      });
    });
    return chain.then(function () {
      if (failed.length) {
        console.warn('[loader] 以下记号文件加载失败（页面可能缺少部分记号）:\n  ' + failed.join('\n  '));
      }
      startApp();
    });
  }

  // 自检脚本用：await window.__dshLoaderDone 就能等到全部注入完成
  window.__dshLoaderDone = run();
})();
