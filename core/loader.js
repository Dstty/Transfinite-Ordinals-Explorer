// ============================================================================
//  core/loader.js — 清单驱动的记号加载器（深度整理）
// ============================================================================
//  取代 index.html 里手写的 70+ 个 <script> 标签：
//    - 读取 core/notation-manifest.js 设置的 window.NOTATION_MANIFEST；
//    - 按 dependsOn 做拓扑排序（缺失依赖 / 循环依赖会报错但不中断）；
//    - 同步链式注入记号 <script>（保持全局 register.push 的执行顺序）；
//    - 全部完成后注入 <script type="module" src="ui/app.js"> 启动应用。
//
//  依赖约定：本文件必须在 notation-manifest.js 之后、且作为普通 script 加载
//  （不能是 module，因为要保证在 ui/app.js 之前完成所有记号注册）。
// ============================================================================
(function () {
  'use strict';

  var manifest = window.NOTATION_MANIFEST || [];
  if (!manifest.length) {
    console.error('[loader] window.NOTATION_MANIFEST 为空：请确认 core/notation-manifest.js 已先加载。');
    return;
  }

  // --------------------------------------------------------------------------
  //  拓扑排序：DFS 后序，按 manifest 顺序作为稳定基线。
  //  缺失依赖 / 循环依赖仅告警，不中断（与旧版手写顺序崩溃行为相比更宽容）。
  // --------------------------------------------------------------------------
  function topoSort(list) {
    var byFile = {};
    list.forEach(function (item) { byFile[item.file] = item; });

    var visited = {};
    var done = {};
    var result = [];
    var cycle = null;

    function visit(item) {
      if (done[item.file]) return;
      if (visited[item.file]) {
        if (!cycle) cycle = item.file;
        return;
      }
      visited[item.file] = true;
      (item.dependsOn || []).forEach(function (dep) {
        var depItem = byFile[dep];
        if (depItem) visit(depItem);
        else console.warn('[loader] 清单依赖未列出: ' + dep + '（被 ' + item.file + ' 引用）');
      });
      visited[item.file] = false;
      done[item.file] = true;
      result.push(item);
    }

    list.forEach(visit);
    if (cycle) console.error('[loader] 清单存在循环依赖，涉及文件: ' + cycle);
    return result;
  }

  var order = topoSort(manifest);

  // --------------------------------------------------------------------------
  //  顺序加载：onload 链保证严格顺序；onerror 记录后继续，避免单文件卡死整页。
  // --------------------------------------------------------------------------
  var index = 0;
  var failed = [];

  function loadNext() {
    if (index >= order.length) {
      if (failed.length) {
        console.warn('[loader] 以下记号文件加载失败（页面可能缺少部分记号）:\n  ' + failed.join('\n  '));
      }
      startApp();
      return;
    }
    var item = order[index++];
    var script = document.createElement('script');
    script.src = item.file;
    script.onload = loadNext;
    script.onerror = function () {
      console.error('[loader] 记号文件加载失败: ' + item.file);
      failed.push(item.file);
      loadNext();
    };
    // 优先注入 <body>（<head> 解析期 document.body 可能为 null，兜底到 <head>）
    (document.body || document.head).appendChild(script);
  }

  // --------------------------------------------------------------------------
  //  启动应用：注入 ui/app.js（ES Module，依赖 React CDN 与 register 已就绪）
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

  loadNext();
})();
