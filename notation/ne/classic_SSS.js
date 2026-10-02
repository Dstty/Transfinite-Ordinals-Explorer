// ============================================================================
//  notation/ne/classic_SSS.js — SSS 系（SSS Hydra 家族）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：SSS 系（SSS Hydra 家族）；ne 分类 id = category-seq-sss
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  SSSS — 参考版 key: SSSS（工厂 3033 字节，原样）
// ---------------------------------------------------------------------------
const factory_SSSS = function(){


  function __limit1Y(k){
    var seq=[];
    for(var i=1;i<=k;i++){ for(var j=i;j>=1;j--) seq.push(j); }
    return seq;
  }

  function __limitSS4(k){
    return [1, k+1];
  }

  function lexCompare(a,b){
    var n=Math.min(a.length,b.length);
    for(var i=0;i<n;i++){ if(a[i]<b[i]) return -1; if(a[i]>b[i]) return 1; }
    if(a.length>b.length) return 1;
    if(a.length<b.length) return -1;
    return 0;
  }
  function bwPart(part){
    if(!part.length) return [];
    var mn=Math.min.apply(null,part);
    if(mn===1) return part.slice();
    return part.map(function(x){return x-(mn-1);});
  }
  function findWhiteRoot(seq){
    if(!seq.length) return null;
    var last=seq[seq.length-1];
    for(var i=seq.length-2;i>=0;i--){ if(seq[i]<last) return i; }
    return null;
  }
  function findPopPoint(seq, wrIdx){
    var curWr=wrIdx, cand=[], k=wrIdx;
    while(true){
      k--;
      if(k<0) break;
      var candGray=seq.slice(k);
      var candBW=bwPart(candGray);
      var curWhite=seq.slice(curWr);
      var curBW=bwPart(curWhite);
      if(lexCompare(candBW,curBW)<0){ cand.push(k); curWr=k; }
    }
    return cand.length>=2 ? cand[1] : null;
  }
  function findBadRoot(seq, popIdx, wrIdx, times){
    var L=seq.length, best=null, sel=null;
    var start=popIdx!==null?popIdx+1:0, end=wrIdx+1;
    for(var m=start;m<end;m++){
      var bad=m<L-1?seq.slice(m,L-1):[];
      var good=seq.slice(0,m);
      var last=seq[L-1];
      var step=last-seq[m]-1;
      var fake=good.slice();
      for(var i=0;i<times;i++){
        var cb=bad.map(function(x){return x+step*i;});
        fake=fake.concat(cb);
      }
      if(best===null||lexCompare(fake,best)>0){ best=fake; sel=m; }
    }
    return sel!==null?sel:wrIdx;
  }
  function expandParts(good,bad,step,times){
    var res=good.slice();
    for(var i=0;i<times;i++){
      var cb=bad.map(function(x){return x+step*i;});
      res=res.concat(cb);
    }
    return res;
  }
  function expandSeq(seq,times){
    if(!seq.length) return [];
    if(seq[seq.length-1]===1) return seq.slice(0,-1);
    var wr=findWhiteRoot(seq);
    if(wr===null) return seq.slice();
    var pop=findPopPoint(seq,wr);
    var br=findBadRoot(seq,pop,wr,times);
    var bad=br<seq.length-1?seq.slice(br,seq.length-1):[];
    var good=seq.slice(0,br);
    var step=seq[seq.length-1]-seq[br]-1;
    return expandParts(good,bad,step,times);
  }
  function parseSeq(s){
    var t=String(s).trim();
    if(t==="") return [];
    var parts=t.split(",");
    var arr=[];
    for(var i=0;i<parts.length;i++){
      var p=parts[i].trim();
      if(p==="") continue;
      if(!/^-?\d+$/.test(p)) return null;
      arr.push(parseInt(p,10));
    }
    return arr;
  }
  var Notation={
    parse: parseSeq,
    format: function(m){ return m.join(","); },
    isSuccessor: function(m){ return m.length===0 || m[m.length-1]===1; },
    generateLimit: function(k){ return __limitSS4(k); },
    expand: function(m,n){ return expandSeq(m,n); },
    compare: lexCompare
  };



return Notation;};
export const def_SSSS = define_classic_notation({
  id: "SSSS",
  name: "SSSS",
  simple_name: "SSSS",
  category_id: "category-seq-sss",
  credit_text_id: 'credit.community',
  create: factory_SSSS,
});
register_notation(def_SSSS);

// ---------------------------------------------------------------------------
//  ISSSS — 参考版 key: ISSSS（工厂 4385 字节，原样）
// ---------------------------------------------------------------------------
const factory_ISSSS = function(){

        function 比较字典序(a, b) {
            let 最小长度 = Math.min(a.length, b.length);
            for (let i = 0; i < 最小长度; i++) {
                if (a[i] < b[i]) return -1;
                else if (a[i] > b[i]) return 1;
            }
            if (a.length > b.length) return 1;
            else if (a.length < b.length) return -1;
            else return 0;
        }

        function 计算黑白部分(部分) {
            if (!部分.length) return [];
            let 最小值 = Math.min(...部分);
            if (最小值 === 1) return 部分.slice();
            else return 部分.map(x => x - (最小值 - 1));
        }

        function 查找白根(序列) {
            if (!序列.length) return null;
            let 最后一项 = 序列[序列.length - 1];
            for (let i = 序列.length - 2; i >= 0; i--) {
                if (序列[i] < 最后一项) return i;
            }
            return null;
        }

        function 查找弹出点(序列, 白根索引) {
            let 当前白根 = 白根索引;
            let 候选弹出点 = [];
            let 左k = 白根索引;
            while (true) {
                左k--;
                if (左k < 0) break;
                let 候选灰部 = 序列.slice(左k);
                let 候选黑白灰部 = 计算黑白部分(候选灰部);
                let 当前白部 = 序列.slice(当前白根);
                let 当前黑白部 = 计算黑白部分(当前白部);
                let 比较结果 = 比较字典序(候选黑白灰部, 当前黑白部);
                if (比较结果 < 0) {
                    候选弹出点.push(左k);
                    当前白根 = 左k;
                }
            }
            if (候选弹出点.length >= 2) return 候选弹出点[1];
            else return null;
        }

        function 查找坏根(序列, 弹出点索引, 白根索引, 展开次数) {
            let 长度 = 序列.length;
            let 最大假序列 = null;
            let 选中索引 = null;
            let 开始 = 弹出点索引 !== null ? 弹出点索引 + 1 : 0;
            let 结束 = 白根索引 + 1;

            for (let m = 开始; m < 结束; m++) {
                let 坏部 = m < 长度 - 1 ? 序列.slice(m, 长度 - 1) : [];
                let 好部 = 序列.slice(0, m);
                let 末项 = 序列[长度 - 1];
                let 公差 = 末项 - 序列[m] - 1;
                let 假序列 = 好部.slice();
                for (let i = 0; i < 展开次数; i++) {
                    let 当前坏部 = 坏部.map(x => x + 公差 * i);
                    假序列.push(...当前坏部);
                }
                if (最大假序列 === null || 比较字典序(假序列, 最大假序列) > 0) {
                    最大假序列 = 假序列;
                    选中索引 = m;
                }
            }

            if (选中索引 !== null) {
                let 坏根值 = 序列[选中索引];
                for (let i = 序列.length - 1; i >= 0; i--) {
                    if (序列[i] === 坏根值) {
                        选中索引 = i;
                        break;
                    }
                }
            }

            return 选中索引 !== null ? 选中索引 : 白根索引;
        }

        function 展开序列(好部, 坏部, 公差, 展开次数) {
            let 展开结果 = 好部.slice();
            for (let i = 0; i < 展开次数; i++) {
                let 当前坏部 = 坏部.map(x => x + 公差 * i);
                展开结果.push(...当前坏部);
            }
            return 展开结果;
        }

        function 展开HSS(序列, 展开次数 = 3) {
            if (!序列.length) return [];
            if (序列[序列.length - 1] === 1) return 序列.slice(0, -1);

            let 原始序列 = 序列.slice();
            let 长度 = 序列.length;

            let 白根索引 = 查找白根(序列);
            if (白根索引 === null) return 序列;

            let 白部 = 序列.slice(白根索引);
            let 黑白部 = 计算黑白部分(白部);

            let 弹出点索引 = 查找弹出点(序列, 白根索引);

            let 坏根索引 = 查找坏根(序列, 弹出点索引, 白根索引, 展开次数);

            let 好部 = 序列.slice(0, 坏根索引);
            let 坏部 = 序列.slice(坏根索引, 长度 - 1);
            let 末项 = 序列[长度 - 1];
            let 公差 = 末项 - 序列[坏根索引] - 1;

            let 展开后的序列 = 展开序列(好部, 坏部, 公差, 展开次数);

            return 展开后的序列;
        }

  function __limit1Y(k){
    var seq=[];
    for(var i=1;i<=k;i++){ for(var j=i;j>=1;j--) seq.push(j); }
    return seq;
  }

  function __limitSS4(k){
    return [1, k+1];
  }

  var Notation={
    parse: function(s){
      var t=String(s).trim(); if(t==="") return [];
      var parts=t.split(","); var arr=[];
      for(var i=0;i<parts.length;i++){ var p=parts[i].trim(); if(p==="") continue; if(!/^-?\d+$/.test(p)) return null; arr.push(parseInt(p,10)); }
      return arr;
    },
    format: function(m){ return m.join(","); },
    isSuccessor: function(m){ return m.length===0 || m[m.length-1]===1; },
    generateLimit: function(k){ return __limitSS4(k); },
    expand: function(m,n){ return 展开HSS(m,n); },
    compare: 比较字典序
  };



return Notation;};
export const def_ISSSS = define_classic_notation({
  id: "ISSSS",
  name: "ISSSS",
  simple_name: "ISSSS",
  category_id: "category-seq-sss",
  credit_text_id: 'credit.community',
  create: factory_ISSSS,
});
register_notation(def_ISSSS);

// ---------------------------------------------------------------------------
//  IUSSS — 参考版 key: IUSSS（工厂 7701 字节，原样）
// ---------------------------------------------------------------------------
const factory_IUSSS = function(){

        function 比较字典序(序列甲, 序列乙) {
            const 最小长度 = Math.min(序列甲.length, 序列乙.length);
            for (let 索引 = 0; 索引 < 最小长度; 索引++) {
                if (序列甲[索引] < 序列乙[索引]) return -1;
                else if (序列甲[索引] > 序列乙[索引]) return 1;
            }
            if (序列甲.length < 序列乙.length) return -1;
            else if (序列甲.length > 序列乙.length) return 1;
            else return 0;
        }

        function 寻找白根(序列) {
            if (!序列.length) return [null, -1];
            const 末项 = 序列[序列.length - 1];
            for (let 索引 = 序列.length - 1; 索引 > 0; 索引--) {
                if (序列[索引 - 1] < 末项) return [序列[索引 - 1], 索引];
            }
            return [null, -1];
        }

        function 计算黑白部(白部) {
            if (!白部.length) return [];
            const 最小值 = Math.min(...白部);
            if (最小值 === 1) return 白部.slice();
            else {
                const 减量 = 最小值 - 1;
                return 白部.map(元素 => 元素 - 减量);
            }
        }

        function 寻找弹出点_情况1(序列, 白根索引, 黑白部) {
            const 候选弹出点列表 = [];
            let 当前起始点 = 白根索引 - 1;
            while (当前起始点 >= 1) {
                const 灰部候选 = 序列.slice(当前起始点 - 1);
                const 灰部最小值 = Math.min(...灰部候选);
                const 候选灰部 = 灰部最小值 === 1 ? 灰部候选.slice() : 灰部候选.map(元素 => 元素 - (灰部最小值 - 1));
                const 比较结果 = 比较字典序(候选灰部, 黑白部);
                console.log(`当前起始点: ${当前起始点}, 候选灰部: ${候选灰部}, 比较结果: ${比较结果}`);
                if (比较结果 >= 0) 当前起始点--;
                else {
                    候选弹出点列表.push(当前起始点);
                    console.log(`待定弹出点: ${当前起始点}, 候选灰部: ${候选灰部}, 比较结果: ${比较结果}`);
                    当前起始点--;
                }
            }
            return 候选弹出点列表.length ? 候选弹出点列表[0] : null;
        }

        function 寻找弹出点_情况2(序列, 白根索引, 黑白部, 白根值) {
            const 候选弹出点列表 = [];
            let 当前白根索引 = 白根索引;
            let 当前白根值 = 白根值;
            let 当前白部 = 序列.slice(当前白根索引 - 1);
            let 当前黑白部 = 计算黑白部(当前白部);
            let 当前起始点 = 当前白根索引 - 1;
            const 白部 = 序列.slice(白根索引 - 1);
            const 白部最小值 = Math.min(...白部);
            const 白部排序 = 白部.slice().sort((a, b) => a - b);
            const 白部最大值 = Math.max(...白部);
            const 末项 = 序列[序列.length - 1];
            while (当前起始点 >= 1) {
                const 灰部候选 = 序列.slice(当前起始点 - 1);
                const 灰部最小值 = Math.min(...灰部候选);
                const 候选灰部 = 灰部最小值 === 1 ? 灰部候选.slice() : 灰部候选.map(元素 => 元素 - (灰部最小值 - 1));
                const 比较结果 = 比较字典序(候选灰部, 当前黑白部);
                const 左侧项值 = 序列[当前起始点 - 1];
                console.log(`当前起始点: ${当前起始点}, 候选灰部: ${候选灰部}, 比较结果: ${比较结果}, 左侧项值: ${左侧项值}, 当前白根值: ${当前白根值}`);
                if (比较结果 >= 0 || (左侧项值 >= 当前白根值 && 白根索引 !== 当前白根索引)) 当前起始点--;
                else {
                    候选弹出点列表.push(当前起始点);
                    console.log(`待定弹出点: ${当前起始点}, 候选灰部: ${候选灰部}, 比较结果: ${比较结果}`);
                    当前白根索引 = 当前起始点;
                    当前白根值 = 序列[当前白根索引 - 1];
                    当前白部 = 序列.slice(当前白根索引 - 1);
                    当前黑白部 = 计算黑白部(当前白部);
                    当前起始点 = 当前白根索引 - 1;
                }
            }
            if (末项 - 当前白根值 === 1 && 候选弹出点列表.length >= 1) return 候选弹出点列表[0];
            if (候选弹出点列表.length >= 2 && 末项 - 当前白根值 !== 1) return 候选弹出点列表[1];
            else return null;
        }

        function 寻找坏根(序列, 弹出点, 白根索引, 白根值, 调试 = false) {
            let 候选坏根列表 = [];
            if (弹出点 !== null) {
                const 起始 = 弹出点 + 1;
                const 结束 = 白根索引 + 1;
                for (let 索引 = 起始; 索引 < 结束; 索引++) {
                    if (序列[索引 - 1] <= 白根值) 候选坏根列表.push(索引);
                }
            } else {
                const 起始 = 0;
                const 结束 = 白根索引 + 1;
                for (let 索引 = 起始; 索引 < 结束; 索引++) {
                    if (序列[索引] <= 白根值) 候选坏根列表.push(索引 + 1);
                }
            }
            if (!候选坏根列表.length) return null;

            let 最大假部 = null;
            let 最大索引 = null;

            for (const 索引 of 候选坏根列表) {
                const 坏根值 = 序列[索引 - 1];
                const 坏部 = 序列.slice(索引 - 1, -1);
                const 好部 = 序列.slice(0, 索引 - 1);
                const 公差 = 序列[序列.length - 1] - 坏根值 - 1;
                let 假部 = 好部.concat(坏部);
                for (let i = 0; i < 3; i++) {
                    假部 = 假部.concat(坏部.map(元素 => 元素 + 公差 * (i + 1)));
                }

                if (最大假部 === null) {
                    最大假部 = 假部;
                    最大索引 = 索引;
                } else {
                    const 比较结果 = 比较字典序(假部, 最大假部);
                    if (比较结果 > 0) {
                        最大假部 = 假部;
                        最大索引 = 索引;
                    }
                }

                if (调试) {
                    console.log(`坏根索引: ${索引}, 假部: ${假部}, 字典序比较结果: ${比较字典序(假部, 最大假部)}`);
                }
            }

            // 新增逻辑：找到值为 n 且离末项最近的项
            const 坏根值 = 序列[最大索引 - 1];
            const 候选坏根 = 候选坏根列表.filter(索引 => 序列[索引 - 1] === 坏根值);
            const 最终坏根索引 = Math.max(...候选坏根);

            if (调试) {
                console.log(`最终选择的坏根索引: ${最终坏根索引}, 最大假部: ${最大假部}`);
            }

            return 最终坏根索引;
        }

        function 超限序数展开(序列, 展开次数 = 3, 调试 = false) {
            const 原始序列 = 序列.slice();
            if (!序列.length) return [];
            if (序列[序列.length - 1] === 1) return 序列.slice(0, -1);
            const 末项 = 序列[序列.length - 1];
            const [白根值, 白根索引] = 寻找白根(序列);
            if (白根索引 === -1) return 序列.slice(0, -1);
            const 白部 = 序列.slice(白根索引 - 1);
            const 黑白部 = 计算黑白部(白部);
            const 白部最小值 = Math.min(...白部);
            const 白部排序 = 白部.slice().sort((a, b) => a - b);
            const 白部最大值 = Math.max(...白部);
            const 白部第二小值 = 白部排序.length > 1 ? 白部排序[1] : null;

            const 弹出点 = 寻找弹出点_情况2(序列, 白根索引, 黑白部, 白根值);
            const 坏根索引 = 寻找坏根(序列, 弹出点, 白根索引, 白根值, 调试);
            if (坏根索引 === null) return 序列.slice(0, -1);
            const 坏部 = 序列.slice(坏根索引 - 1, -1);
            const 好部 = 序列.slice(0, 坏根索引 - 1);
            const 公差 = 末项 - 序列[坏根索引 - 1] - 1;
            let 展开结果 = 好部.slice();
            for (let 次数 = 0; 次数 < 展开次数; 次数++) {
                展开结果 = 展开结果.concat(坏部.map(元素 => 元素 + 公差 * 次数));
            }

            if (调试) {
                console.log(`原序列: ${原始序列}`);
                console.log(`末项: ${末项}`);
                console.log(`白根: 值=${白根值}, 索引=${白根索引}`);
                console.log(`白部: ${白部}`);
                console.log(`黑白部: ${黑白部}`);
                console.log(`弹出点: 索引=${弹出点}`);
                console.log(`坏根: 值=${序列[坏根索引 - 1]}, 索引=${坏根索引}`);
                console.log(`坏部: ${坏部}`);
                console.log(`好部: ${好部}`);
                console.log(`公差: ${公差}`);
                console.log(`展开结果: ${展开结果}`);
            }

            return { 展开结果, 坏根值: 序列[坏根索引 - 1], 坏根索引 };
        }

  function __limit1Y(k){
    var seq=[];
    for(var i=1;i<=k;i++){ for(var j=i;j>=1;j--) seq.push(j); }
    return seq;
  }

  function __limitSS4(k){
    return [1, k+1];
  }

  var Notation={
    parse: function(s){
      var t=String(s).trim(); if(t==="") return [];
      var parts=t.split(","); var arr=[];
      for(var i=0;i<parts.length;i++){ var p=parts[i].trim(); if(p==="") continue; if(!/^-?\d+$/.test(p)) return null; arr.push(parseInt(p,10)); }
      return arr;
    },
    format: function(m){ return m.join(","); },
    isSuccessor: function(m){ return m.length===0 || m[m.length-1]===1; },
    generateLimit: function(k){ return __limitSS4(k); },
    expand: function(m,n){ var r=超限序数展开(m,n); return (r && r.展开结果!==undefined) ? r.展开结果 : r; },
    compare: 比较字典序
  };



return Notation;};
export const def_IUSSS = define_classic_notation({
  id: "IUSSS",
  name: "IUSSS",
  simple_name: "IUSSS",
  category_id: "category-seq-sss",
  credit_text_id: 'credit.community',
  create: factory_IUSSS,
});
register_notation(def_IUSSS);

// ---------------------------------------------------------------------------
//  LHSS — 参考版 key: LHSS（工厂 3733 字节，原样）
// ---------------------------------------------------------------------------
const factory_LHSS = function(){

        // 比较两个数组的字典序
        function 比较字典序(a, b) {
            const 最小长度 = Math.min(a.length, b.length);
            for (let i = 0; i < 最小长度; i++) {
                if (a[i] < b[i]) return -1;
                if (a[i] > b[i]) return 1;
            }
            if (a.length > b.length) return 1;
            if (a.length < b.length) return -1;
            return 0;
        }

        // 查找白根
        function 查找白根(序列) {
            const 末项 = 序列[序列.length - 1];
            for (let i = 序列.length - 2; i >= 0; i--) {
                if (序列[i] < 末项) return i;
            }
            return null;
        }

        // 查找弹出点
        function 查找弹出点(序列, 白根索引) {
            const 白部 = 序列.slice(白根索引);
            let 弹出候选 = null;
            for (let j = 白根索引 - 1; j >= 0; j--) {
                const 灰候选 = 序列.slice(j);
                if (比较字典序(灰候选, 白部) < 0) {
                    if (弹出候选 === null || j > 弹出候选) {
                        弹出候选 = j;
                    }
                }
            }
            return 弹出候选;
        }

        // 查找坏根
        function 查找坏根(序列, 弹出点索引, 白根索引, 展开次数) {
            const 长度 = 序列.length;
            let 最大假序列 = null;
            let 选中索引 = null;

            // 确定候选范围
            const 开始 = 弹出点索引 === null ? 0 : 弹出点索引 + 1;
            const 结束 = 白根索引 + 1;

            for (let m = 开始; m < 结束; m++) {
                const 坏根值 = 序列[m];
                const 坏部 = m < 长度 - 1 ? 序列.slice(m, 长度 - 1) : [];
                const 好部 = 序列.slice(0, m);
                const 末项 = 序列[长度 - 1];
                const 公差 = 末项 - 坏根值 - 1;
                let 假序列 = 好部.slice();
                for (let i = 0; i < 展开次数; i++) {
                    const 当前坏部 = 坏部.map(x => x + 公差 * i);
                    假序列 = 假序列.concat(当前坏部);
                }
                if (最大假序列 === null || 比较字典序(假序列, 最大假序列) > 0) {
                    最大假序列 = 假序列;
                    选中索引 = m;
                }
            }
            return 选中索引 !== null ? 选中索引 : 白根索引;
        }

        // 展开序列
        function 展开序列(好部, 坏部, 公差, 展开次数) {
            let 展开结果 = 好部.slice();
            for (let i = 0; i < 展开次数; i++) {
                const 当前坏部 = 坏部.map(x => x + 公差 * i);
                展开结果 = 展开结果.concat(当前坏部);
            }
            return 展开结果;
        }

        // 主函数
        function 序列展开(序列, 展开次数 = 4) {
            if (序列.length === 0) return [];
            const 末项 = 序列[序列.length - 1];
            if (末项 === 1) return 序列.slice(0, -1);

            const 白根索引 = 查找白根(序列);
            if (白根索引 === null) return 序列.slice();

            const 弹出点索引 = 查找弹出点(序列, 白根索引);
            const 坏根索引 = 查找坏根(序列, 弹出点索引, 白根索引, 展开次数);
            const 坏根 = 序列[坏根索引];
            const 坏部 = 坏根索引 < 序列.length - 1 ? 序列.slice(坏根索引, 序列.length - 1) : [];
            const 好部 = 序列.slice(0, 坏根索引);
            const 公差 = 末项 - 坏根 - 1;
            const 展开结果 = 展开序列(好部, 坏部, 公差, 展开次数);

            return 展开结果;
        }

        // 运行展开并显示结果

  function __limit1Y(k){
    var seq=[];
    for(var i=1;i<=k;i++){ for(var j=i;j>=1;j--) seq.push(j); }
    return seq;
  }

  function __limitSS4(k){
    return [1, k+1];
  }

  var Notation={
    parse: function(s){
      var t=String(s).trim(); if(t==="") return [];
      var parts=t.split(","); var arr=[];
      for(var i=0;i<parts.length;i++){ var p=parts[i].trim(); if(p==="") continue; if(!/^-?\d+$/.test(p)) return null; arr.push(parseInt(p,10)); }
      return arr;
    },
    format: function(m){ return m.join(","); },
    isSuccessor: function(m){ return m.length===0 || m[m.length-1]===1; },
    generateLimit: function(k){ return __limitSS4(k); },
    expand: function(m,n){ return 序列展开(m,n); },
    compare: 比较字典序
  };



return Notation;};
export const def_LHSS = define_classic_notation({
  id: "LHSS",
  name: "LHSS",
  simple_name: "LHSS",
  category_id: "category-seq-sss",
  credit_text_id: 'credit.community',
  create: factory_LHSS,
});
register_notation(def_LHSS);

// ---------------------------------------------------------------------------
//  SSS Hydra — 参考版 key: SSSHydra（工厂 9369 字节，原样）
// ---------------------------------------------------------------------------
const factory_SSSHydra = function(){
const Hydra = {
  formatMatrix(mat) {
    if (!mat || mat.length === 0) return '∅';
    return mat.map(c => `(${c[0]},${c[1]})`).join('');
  },

  matrixToTree(mat) {
    if (!mat || mat.length === 0) return '';
    const nodes = mat.map((col, i) => ({ idx: i, val: col[1], children: [] }));
    const roots = [];
    for (let i = 0; i < mat.length; i++) {
      const p = this.parent1(mat, i);
      if (p === -1 || p === null) roots.push(nodes[i]);
      else nodes[p].children.push(nodes[i]);
    }
    function build(n) {
      let s = 'p' + n.val;
      if (n.children.length) s += '(' + n.children.map(build).join('+') + ')';
      return s;
    }
    return roots.map(build).join('+');
  },

  treeToMatrix(s) {
    s = String(s).trim();
    if (s === '∅' || s === '') return [];
    var pos = 0;
    function parseForest(level, out){
      for(;;){
        parseTerm(level, out);
        if (s[pos] === '+') { pos++; continue; }
        break;
      }
    }
    function parseTerm(level, out){
      if (s[pos] !== 'p') throw Error('expected p at ' + pos);
      pos++;
      var vs = pos;
      while (pos < s.length && s[pos] >= '0' && s[pos] <= '9') pos++;
      if (pos === vs) throw Error('expected number at ' + pos);
      var val = parseInt(s.slice(vs, pos), 10);
      if (val < 0) throw Error('bad val');
      out.push([level, val]);
      if (s[pos] === '(') { pos++; parseForest(level + 1, out); if (s[pos] !== ')') throw Error('expected ) at ' + pos); pos++; }
    }
    var out = [];
    parseForest(0, out);
    if (pos !== s.length) throw Error('trailing chars');
    return out;
  },

  compare(A, B) {
    if (!A && !B) return 0;
    if (!A) return 1;
    if (!B) return -1;
    const len = Math.min(A.length, B.length);
    for (let i = 0; i < len; i++) {
      if (A[i][0] < B[i][0]) return -1;
      if (A[i][0] > B[i][0]) return 1;
      if (A[i][1] < B[i][1]) return -1;
      if (A[i][1] > B[i][1]) return 1;
    }
    return A.length - B.length;
  },

  isSuccessor(mat) {
    if (!mat || mat.length === 0) return false;
    const l = mat[mat.length - 1];
    return l[0] === 0 && l[1] === 0;
  },

  limit(k) {
    const m = [];
    for (let c = 1; c <= k; c++) m.push([c-1, c-1]);
    return m;
  },

  parent1(mat, colIdx) {
    const target = mat[colIdx][0] - 1;
    for (let i = colIdx - 1; i >= 0; i--) if (mat[i][0] === target) return i;
    return -1;
  },

  ancestors1(mat, colIdx) {
    const res = [colIdx];
    let cur = colIdx;
    while (true) {
      const p = this.parent1(mat, cur);
      if (p === -1) break;
      res.push(p);
      cur = p;
    }
    return res;
  },

  parent2(mat, colIdx, anc1) {
    const target = mat[colIdx][1] - 1;
    let best = -1;
    for (const idx of anc1) if (mat[idx][1] === target && idx > best) best = idx;
    return best;
  },

  ancestors2Set(mat, colIdx) {
    const set = new Set([colIdx]);
    let cur = colIdx;
    for (let i = 0; i < 100; i++) {
      const anc1 = this.ancestors1(mat, cur);
      const p2 = this.parent2(mat, cur, anc1);
      if (p2 === -1 || set.has(p2)) break;
      set.add(p2);
      cur = p2;
    }
    return set;
  },

  pendingRoots(mat) {
    const last = mat.length - 1;
    const e = mat[last][1];
    const anc1 = this.ancestors1(mat, last);
    const roots = [];
    for (const idx of anc1) {
      const d = mat[idx][1];
      if (d < e) {
        if (roots.length === 0) roots.push(idx);
        else {
          const prevD = mat[roots[roots.length-1]][1];
          if (d <= prevD) roots.push(idx);
        }
      }
    }
    return roots;
  },

  testFormula(mat, pr, rights, e) {
    const last = mat.length - 1;
    const c = mat[pr][0];
    const d = mat[pr][1];
    const sub = [];
    const colMap = [];
    for (let i = pr; i <= last; i++) {
      sub.push([mat[i][0] - c, mat[i][1]]);
      colMap.push(i);
    }
    const special = new Set([pr, ...rights]);
    for (let i = 0; i < sub.length; i++) {
      const orig = colMap[i];
      const anc2 = this.ancestors2Set(mat, orig);
      if ([...special].some(s => anc2.has(s))) {
        sub[i][1] += (e - d - 1);
      }
    }
    return sub;
  },

  compareTF(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i][0] !== b[i][0]) return a[i][0] < b[i][0] ? -1 : 1;
      if (a[i][1] !== b[i][1]) return a[i][1] < b[i][1] ? -1 : 1;
    }
    return a.length - b.length;
  },

  findBadRoot(mat, prs) {
    if (prs.length === 0) return null;
    const e = mat[mat.length-1][1];
    const baseline = this.testFormula(mat, prs[0], [], e);
    const small = [];
    for (let i = 0; i < prs.length; i++) {
      const rights = prs.slice(0, i);
      const tf = this.testFormula(mat, prs[i], rights, e);
      if (this.compareTF(tf, baseline) < 0) small.push({ idx: i, col: prs[i] });
    }
    if (small.length > 0) {
      const first = small[0];
      return first.idx > 0 ? prs[first.idx - 1] : prs[prs.length - 1];
    }
    return prs[prs.length - 1];
  },

  expand(mat, n) {
    if (!mat || mat.length === 0) return null;
    const last = mat[mat.length - 1];
    if (last[0] === 0 && last[1] === 0) return mat.slice(0, -1);
    if (last[1] === 0 && last[0] > 0) {
      const fake = this.parent1(mat, mat.length - 1);
      const G = fake >= 0 ? mat.slice(0, fake) : [];
      const B = fake >= 0 ? mat.slice(fake, mat.length - 1) : mat.slice(0, mat.length - 1);
      const res = [...G];
      for (let k = 0; k < n; k++) for (const col of B) res.push([...col]);
      return res;
    }
    const prs = this.pendingRoots(mat);
    if (prs.length === 0) return mat;
    const bad = this.findBadRoot(mat, prs);
    if (bad === null || bad === undefined) return mat;
    const G = mat.slice(0, bad);
    const B = mat.slice(bad, mat.length - 1);
    const delta = last[0] - mat[bad][0];
    const f = last[1] - mat[bad][1] - 1;
    const badIdxInPR = prs.indexOf(bad);
    const rights = badIdxInPR > 0 ? prs.slice(0, badIdxInPR) : [];
    const special = new Set([bad, ...rights]);

    const needF = B.map((_, idx) => {
      const orig = bad + idx;
      const anc2 = this.ancestors2Set(mat, orig);
      return [...special].some(s => anc2.has(s));
    });

    const res = [...G, ...B];
    for (let h = 1; h < n; h++) {
      for (let i = 0; i < B.length; i++) {
        let a1 = B[i][0] + delta * h;
        let a2 = B[i][1];
        if (needF[i]) a2 += f * h;
        res.push([a1, a2]);
      }
    }
    return res;
  }
}

var Notation=(function(){
  var H=Hydra;
function __colsToHydra(matrix){
  if (matrix.length === 0) return '';
  const n = matrix.length;
  const parent = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const a = matrix[i][0];
    if (a > 0) {
      for (let j = i - 1; j >= 0; j--) {
        if (matrix[j][0] === a - 1) { parent[i] = j; break; }
      }
    }
  }
  const nodes = matrix.map((col) => ({ b: col[1], children: [] }));
  const roots = [];
  for (let i = 0; i < n; i++) {
    if (parent[i] === -1) roots.push(nodes[i]);
    else nodes[parent[i]].children.push(nodes[i]);
  }
  const nodeStr = (node) => {
    let s = 'p' + node.b;
    if (node.children.length > 0) s += '(' + node.children.map(nodeStr).join('+') + ')';
    return s;
  };
  return roots.map(nodeStr).join('+');
}
function __hydraToCols(str){
  if (!str) return [];
  const s = String(str).replace(/\s/g, '');
  let pos = 0; const len = s.length;
  const parseNumber = () => { let num = ''; while (pos < len && s[pos] >= '0' && s[pos] <= '9') num += s[pos++]; if (num === '') throw new Error('缺少数字'); return parseInt(num, 10); };
  const parseExpr = (depth) => {
    const cols = [];
    const one = () => {
      if (pos >= len || s[pos] !== 'p') throw new Error('期望 p');
      pos++;
      const b = parseNumber();
      cols.push([depth, b]);
      if (pos < len && s[pos] === '(') {
        pos++;
        if (pos < len && s[pos] !== ')') cols.push(...parseExpr(depth + 1));
        if (pos >= len || s[pos] !== ')') throw new Error('缺少右括号');
        pos++;
      }
    };
    one();
    while (pos < len && s[pos] === '+') { pos++; one(); }
    return cols;
  };
  const matrix = parseExpr(0);
  if (pos !== len) throw new Error('解析未完成');
  return matrix;
}

  function parse(s){
    var t=String(s).trim();
    if(t==="∅"||t==="") return [];
    if(!/^(\(\d+,\d+\))*$/.test(t)) return null;
    var cols=[]; var re=/\((\d+),(\d+)\)/g, m;
    while((m=re.exec(t))!==null) cols.push([parseInt(m[1],10),parseInt(m[2],10)]);
    return cols;
  }
  return {
    parse: parse,
    format: function(m){ return H.formatMatrix(m); },
    isSuccessor: function(m){ return H.isSuccessor(m); },
    generateLimit: function(k){ return H.limit(k); },
    expand: function(m,n){ return H.expand(m,n); },
    compare: function(a,b){ return H.compare(a,b); },
    equivalentForms: function(m){
      return { default:"原表示", forms:{
        "原表示":{ display:function(x){return H.formatMatrix(x);}, parse:parse },
        "树状形式":{ display:function(x){return H.matrixToTree(x);}, parse:function(s){ return H.treeToMatrix(s); } },
        "hydra树状":{ display:function(x){ try { return __colsToHydra(x); } catch(e){ return H.formatMatrix(x); } }, parse:function(s){ try { if (s === '\u2205') return []; return __hydraToCols(s); } catch(e){ return null; } } }
      } };
    }
  };
})();



return Notation;};
export const def_SSSHydra = define_classic_notation({
  id: "SSSHydra",
  name: "SSS Hydra",
  simple_name: "SSS Hydra",
  category_id: "category-seq-sss",
  credit_text_id: 'credit.community',
  create: factory_SSSHydra,
});
register_notation(def_SSSHydra);
