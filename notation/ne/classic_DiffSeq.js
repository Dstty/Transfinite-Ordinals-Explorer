// ============================================================================
//  notation/ne/classic_DiffSeq.js — 差序列（Buchholz / SPrDSS）
// ============================================================================
//  来源：参考版「自助版NE-4.8.1」（__BUILTIN_FACTORIES）。算法原样保留，
    //  只套 core/ne/classicNotation.js 的适配器接到 ne 接口（下标基数 / 后继式两处
    //  语义差异由适配器统一处理，见该文件注释）。
    //  /list 归属：差序列（Buchholz / SPrDSS）；ne 分类 id = category-seq-diff
//  许可与致谢：这些记号的作者是 googology 社区的各位（见各记号 note）；
//  本项目按与 notation/ne/ 其余移植记号相同的方式搬运并标注出处。
// ============================================================================
import { define_classic_notation } from '../../core/ne/classicNotation.js';
import { register_notation } from '../../core/ne/registry.js';
// ---------------------------------------------------------------------------
//  Buchholz seq — 参考版 key: buchholzSeq（工厂 11668 字节，原样）
// ---------------------------------------------------------------------------
const factory_buchholzSeq = function(){
var lineBreakRegex=/\r?\n/g;
var itemSeparatorRegex=/[\t ]/g;

function dg(s){
  return document.getElementById(s);
}

/**
 * @param {string} s 
 * @returns {number[]}
 */
function parseArray(s){
  return (s[0]=="("&&s[s.length-1]==")"?s.slice(1,-1):s).split(",").map(Number);
}
/**
 * @param {number[]} s 
 * @returns {string}
 */
function stringifyArray(s){
  return "("+s.join(",")+")";
}
/**
 * @param {number[]|string} s 
 * @returns {boolean}
 */
function validIntegerArray(s){
  if (!(s instanceof Array)) s=parseArray(s);
  return s.every(function(x){return x>=0&&Number.isInteger(x);});
}
/**
 * @param {number[]|string} X
 * @param {number[]|string} Y
 * @return {boolean|(t:any)=>boolean}
 */
function equal(X,Y){
  if (!(X instanceof Array)) X=parseArray(X);
  if (arguments.length==1) return function(t){return equal(t,X);};
  if (!(Y instanceof Array)) Y=parseArray(Y);
  return X.every(function(x,i){return x==Y[i];});
}
function notEqual(X,Y){
  if (arguments.length==1) return function(t){return notEqual(t,X);};
  return !equal(X,Y);
}
/**
 * @param {number[]|string} S 
 * @param {number[]|string} T 
 * @returns {boolean}
 */
function lessThan(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!(T instanceof Array)) T=parseArray(T);
  if (!validIntegerArray(S)||!validIntegerArray(T)) throw Error("Invalid argument: "+S+";"+T);
  for (var i=0,minl=Math.min(S.length,T.length);i<minl;i++){
    if (S[i]<T[i]) return true;
    if (S[i]>T[i]) return false;
  }
  return S.length<T.length;
  throw Error("No rule to compare "+S+" and "+T);
}
/** @returns {boolean} */
function lessThanOrEqual(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!(T instanceof Array)) T=parseArray(T);
  return equal(S,T)||lessThan(S,T);
}
/**
 * @param {number[]|string} S 
 * @param {number} T 
 */
function mapAdd(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)||T<0||!Number.isInteger(T)) throw Error("Invalid argument: "+S+";"+T);
  return S.map(function(x){return x+T;});
}
/**
 * @param {number[]|string} S
 * @returns {number[]}
 */
function cod(S){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (S.length==0) return []; //1
  else{ //2
    var cod_rest=cod(S.slice(1));
    if (cod_rest.length==0) return S.slice(); //2.1
    else if (equal(cod_rest,[0])) return [0]; //2.2
    else{ //2.3
      if (lessThan(cod_rest,S)) return cod_rest; //2.3.1
      else{ //2.3.2
        var j=cod_rest.length;
        if (j==1){ //2.3.2.1
          if (cod_rest[0]-S[0]<=1) return [0,1]; //2.3.2.1.1
          else return S.slice(); //2.3.2.1.2
        }else return cod_rest; //2.3.2.2
      }
    }
  }
  throw Error("No rule to compute cod of "+S);
}
/**
 * @param {number[]|string} S
 * @returns {number[]}
 */
function dom(S){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (S.length==0) return []; //1
  else{ //2
    var dom_rest=dom(S.slice(1));
    if (dom_rest.length==0) return S.slice(); //2.1
    else if (equal(dom_rest,[0])) return [0]; //2.2
    else{ //2.3
      if (lessThan(dom_rest,S)) return dom_rest; //2.3.1
      else{ //2.3.2
        var j=dom_rest.length;
        if (j==1){ //2.3.2.1
          if (equal(cod(S),[0,1])) return [0,1]; //2.3.2.1.1
          else return S.slice(); //2.3.2.1.2
        }else{ //2.3.2.2
          var delbr=dom_rest[0]-S[0]; //2.3.2.2.1.1
          var cod_rest=cod(S.slice(1));
          var delcp=cod_rest[cod_rest.length-1]-cod_rest[0]; //2.3.2.2.1.2
          if (delbr<delcp) return [0,1]; //2.3.2.2.2
          else return S.slice(); //2.3.2.2.3
        }
      }
    }
  }
  throw Error("No rule to compute dom of "+S);
}
/**
 * @param {number[]|string} S 
 * @param {number} T 
 * @returns {number[]}
 */
function fund(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)||T<0||!Number.isInteger(T)) throw Error("Invalid argument: "+S+";"+T);
  if (S.length==0) return []; //1
  else{ //2
    var i=S.length;
    var S_rest=S.slice(1);
    var dom_rest=dom(S_rest);
    if (dom_rest.length==0){ //2.1
      if (equal(dom(S),[0])) return []; //2.1.1
      else return [T]; //2.1.2
    }else if (equal(dom_rest,[0])) return S.slice(0,S.length-1); //2.2
    else{ //2.3
      if (lessThan(dom_rest,S)) return [S[0]].concat(fund(S_rest,T)); //2.3.1
      else{ //2.3.2
        var fund_S_T_minus_1=null;
        var cod_rest=null;
        var j=dom_rest.length;
        if (j==1){ //2.3.2.1
          if (equal(cod(S),[0,1])){ //2.3.2.1.1
            cod_rest=cod(S_rest);
            if (T!=0&&(fund_S_T_minus_1=fund(S,T-1))[0]==S[0]) return [S[0]].concat(fund(S_rest,cod_rest[cod_rest.length-1]-1),fund_S_T_minus_1.slice(1)); //2.3.2.1.1.1
            else return [S[0]].concat(fund(S_rest,cod_rest[cod_rest.length-1]-1)); //2.3.2.1.1.2
          }else return [S[0]].concat(fund(S_rest,T)); //2.3.2.1.2
        }else{ //2.3.2.2
          cod_rest=cod(S_rest);
          var delbr=dom_rest[0]-S[0]; //2.3.2.2.1.1
          var delcp=cod_rest[cod_rest.length-1]-cod_rest[0]; //2.3.2.2.1.2
          var del=cod_rest[cod_rest.length-1]-S[0]-1; //2.3.2.2.1.3
          if (delbr<delcp){ //2.3.2.2.2
            var br=i-j+1;
            var S_to_br=S.slice(0,br);
            if (T!=0&&equal((fund_S_T_minus_1=fund(S,T-1)).slice(0,br),S_to_br)) return S_to_br.concat(fund(S.slice(br),cod_rest[cod_rest.length-1]-1),mapAdd(fund_S_T_minus_1.slice(br),del-delbr)); //2.3.2.2.2.1
            else return S_to_br.concat(fund(S.slice(br),cod_rest[cod_rest.length-1]-1)); //2.3.2.2.2.2
          }else return [S[0]].concat(fund(S_rest,T)); //2.3.2.2.3
        }
      }
    }
  }
  throw Error("No rule to compute fund of "+S+";"+T);
}
function findOTPath(x,limit){
  if (!(x instanceof Array)) x=parseArray(x);
  if (!validIntegerArray(x)) throw Error("Invalid argument: "+x);
  if (typeof limit=="undefined"||limit==-1) limit=Infinity;
  if (equal(x,[0])){
    return {isStandard:true,path:[[0]],funds:[-1]};
  }else{
    var n=0;
    var t;
    while(n<=limit&&!lessThanOrEqual(x,limitOrd(n))){
      n++;
    };
    if (n>limit) return {isStandard:false,path:[],funds:[]};
    t=limitOrd(n);
    console.log(stringifyArray(t));
    var r={isStandard:false,path:[t],funds:[n]};
    while (!equal(x,t)){
      n=0;
      var nt;
      while (n<=limit&&lessThan(nt=fund(t,n),x)) n++;
      if (n>limit) return r;
      r.path.push(t=nt);
      r.funds.push(n);
      console.log(stringifyArray(nt));
    }
    r.isStandard=true;
    return r;
  }
}
function isStandard(x,limit){
  return findOTPath(x,limit).isStandard;
}
/**
 * @param {number} n 
 * @returns {number[]} (0,1,n)
 */
function limitOrd(n){
  return [0,1,n];
}
/**
 * @param {number[]|string} S 
 * @param {number} n 
 * @returns {number}
 */
function FGH(S,n){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (equal(S,"0")) return n+1;
  else if (equal(dom(S),[1])){
    var r=n;
    var X0=fund(S,0);
    for (var i=0;i<n;i++) r=FGH(X0,r);
    return r;
  }else return FGH(fund(S,n),n);
}
/**
 * @param {number} n 
 * @returns {number}
 */
function largeFunction(n){
  if (typeof n!="number") throw Error("Invalid argument");
  return FGH(limitOrd(n),n);
}
function calculateN(){
  var r=1e100;
  for (var i=0;i<1e100;i++) r=largeFunction(r);
  return r;
}

var input="";
var options={
  detail:undefined
}
var last=null;
function compute(){
  if (input==dg("input").value&&options.detail==dg("detail").checked) return;
  var oldinput=input;
  input=dg("input").value;
  options.detail=dg("detail").checked;
  if (oldinput!=input) last=[];
  var output="";
  var lines=input.split(lineBreakRegex);
  for (var l=0;l<lines.length;l++){
    var line=lines[l];
    var args=line.split(itemSeparatorRegex);
    var cmd=args.shift();
    output+=line+"\n";
    var result;
    if (oldinput!=input){
      try{
        if (cmd=="lessThan"||cmd=="<"){
          result=lessThan(args[0],args[1]);
        }else if (cmd=="lessThanOrEqual"||cmd=="<="){
          result=lessThanOrEqual(args[0],args[1]);
        }else if (cmd=="cod"){
          result=cod(args[0]);
        }else if (cmd=="dom"){
          result=dom(args[0]);
        }else if (cmd=="expand"){
          var t=parseArray(args[0]);
          result=[t];
          for (var i=1;i<args.length;i++){
            result.push(t=fund(t,+args[i]));
          }
        }else if (cmd=="isStandard"){
          result=findOTPath(args[0],args[1]||3);
        }else{
          result=null;
        }
      }catch(e){
        result=e;
        console.error(e);
      }
      last[l]=result;
    }else result=last[l];
    if (result instanceof Error){
      output+=result.stack?result.stack:result;
    }else if (cmd=="lessThan"||cmd=="<"){
      output+=result;
    }else if (cmd=="lessThanOrEqual"||cmd=="<="){
      output+=result;
    }else if (cmd=="cod"){
      output+=stringifyArray(result);
    }else if (cmd=="dom"){
      output+=stringifyArray(result);
    }else if (cmd=="expand"){
      if (options.detail){
        for (var i=1;i<result.length;i++){
          output+=stringifyArray(result[i-1])+"["+args[i]+"]="+stringifyArray(result[i])+(i==result.length-1?"":"\n");
        }
      }else{
        output+=stringifyArray(result[result.length-1]);
      }
    }else if (cmd=="isStandard"){
      if (options.detail){
        for (var i=1;i<result.path.length;i++){
          output+=stringifyArray(result.path[i-1])+"["+result.funds[i]+"]="+stringifyArray(result.path[i])+"\n";
        }
        if (result.isStandard) output+=stringifyArray(parseArray(args[0]))+"∈OT";
        else output+=stringifyArray(parseArray(args[0]))+"∉OT limited to n≦"+(args[1]||3);
      }else{
        output+=result.isStandard;
      }
    }else{
      output+="Unknown command "+cmd;
    }
    output+="\n\n";
  }
  dg("output").value=output;
}

var handlekey=function(e){}
//console.log=function (s){alert(s)};


var Notation=(function(){
  function __T(s){
    var t=String(s).trim();
    if(t===""||t==="()") return [];
    return parseArray(t);
  }
  function __eq(S,T){
    return S.length===T.length && S.every(function(x,i){ return x===T[i]; });
  }
  function norm(s){
    try {
      var a=(s instanceof Array)?s:__T(s);
      if(!validIntegerArray(a)) return null;
      return stringifyArray(a);
    } catch(e){ return null; }
  }
  return {
    parse: function(s){
      var t=String(s).trim();
      if(t==="") return "()";
      return norm(t);
    },
    format: function(m){ return String(m); },
    isSuccessor: function(m){
      try {
        var S=__T(m);
        var a0=fund(S,0), a1=fund(S,1);
        return __eq(a0,a1) ? true : false;
      } catch(e){ return true; }
    },
    generateLimit: function(k){
      try { return norm(limitOrd(Number(k)|0)); } catch(e){ return "()"; }
    },
    expand: function(m,n){
      try {
        if(!Number.isInteger(n)||n<0) return null;
        if(n>=1 && this.isSuccessor(m)) return null;
        var S=__T(m);
        if(!validIntegerArray(S)) return null;
        var r=norm(fund(S,n));
        if(r===null) return null;
        if(this.compare(r,m)>=0) return null;
        return r;
      } catch(e){ return null; }
    },
    compare: function(a,b){
      try {
        var S=__T(a), T=__T(b);
        if(__eq(S,T)) return 0;
        if(lessThan(S,T)) return -1;
        if(lessThan(T,S)) return 1;
        return 0;
      } catch(e){
        a=String(a); b=String(b);
        return a<b?-1:(a>b?1:0);
      }
    }
  };
})();
return Notation;
};
export const def_buchholzSeq = define_classic_notation({
  id: "buchholzSeq",
  name: "Buchholz sequence",
  simple_name: "Buchholz seq",
  category_id: "category-seq-diff",
  credit_text_id: 'credit.community',
  create: factory_buchholzSeq,
});
register_notation(def_buchholzSeq);

// ---------------------------------------------------------------------------
//  SPrDSS — 参考版 key: SPrDSS（工厂 12410 字节，原样）
// ---------------------------------------------------------------------------
const factory_SPrDSS = function(){
var lineBreakRegex=/\r?\n/g;
var itemSeparatorRegex=/[\t ]/g;

function dg(s){
  return document.getElementById(s);
}

/**
 * @param {string} s 
 * @returns {number[]}
 */
function parseArray(s){
  return (s[0]=="("&&s[s.length-1]==")"?s.slice(1,-1):s).split(",").map(Number);
}
/**
 * @param {number[]} s 
 * @returns {string}
 */
function stringifyArray(s){
  return "("+s.join(",")+")";
}
/**
 * @param {number[]|string} s 
 * @returns {boolean}
 */
function validIntegerArray(s){
  if (!(s instanceof Array)) s=parseArray(s);
  return s.every(function(x){return x>=0&&Number.isInteger(x);});
}
/**
 * @param {number[]|string} X
 * @param {number[]|string} Y
 * @return {boolean|(t:any)=>boolean}
 */
function equal(X,Y){
  if (!(X instanceof Array)) X=parseArray(X);
  if (arguments.length==1) return function(t){return equal(t,X);};
  if (!(Y instanceof Array)) Y=parseArray(Y);
  return X.every(function(x,i){return x==Y[i];});
}
function notEqual(X,Y){
  if (arguments.length==1) return function(t){return notEqual(t,X);};
  return !equal(X,Y);
}
/**
 * @param {number[]|string} S 
 * @param {number[]|string} T 
 * @returns {boolean}
 */
function lessThan(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!(T instanceof Array)) T=parseArray(T);
  if (!validIntegerArray(S)||!validIntegerArray(T)) throw Error("Invalid argument: "+S+";"+T);
  for (var i=0,minl=Math.min(S.length,T.length);i<minl;i++){
    if (S[i]<T[i]) return true;
    if (S[i]>T[i]) return false;
  }
  return S.length<T.length;
  throw Error("No rule to compare "+S+" and "+T);
}
/** @returns {boolean} */
function lessThanOrEqual(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!(T instanceof Array)) T=parseArray(T);
  return equal(S,T)||lessThan(S,T);
}
/**
 * @param {number[]|string} S 
 * @param {number} T 
 */
function mapAdd(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)||T<0||!Number.isInteger(T)) throw Error("Invalid argument: "+S+";"+T);
  return S.map(function(x){return x+T;});
}
/**
 * @param {number[]|string} S 
 * @param {number} T 
 * @param {number} U 
 * @param {number} V
 */
function ascend(S,T,U,V){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)||T<0||!Number.isInteger(T)||U<0||!Number.isInteger(U)||V<=0||!Number.isInteger(V)) throw Error("Invalid argument: "+S+";"+T+";"+U+";"+V);
  if (S.length==0) return []; //1
  else{ //2
    if(V==1) return mapAdd(S,T+U*V); //2.1
    else return mapAdd(ascend(S,T,U,V-1),T+U*V); //2.2
  }
}
/**
 * @param {number[]|string} S
 * @returns {number[]}
 */
function cod(S){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (S.length==0) return []; //1
  else{ //2
    var cod_rest=cod(S.slice(1));
    if (cod_rest.length==0) return S.slice(); //2.1
    else if (equal(cod_rest,[0])) return [0]; //2.2
    else{ //2.3
      if (lessThan(cod_rest,S)) return cod_rest; //2.3.1
      else{ //2.3.2
        var j=cod_rest.length;
        if (j==1){ //2.3.2.1
          if (cod_rest[0]-S[0]<=1) return [0,1]; //2.3.2.1.1
          else return S.slice(); //2.3.2.1.2
        }else return cod_rest; //2.3.2.2
      }
    }
  }
  throw Error("No rule to compute cod of "+S);
}
/**
 * @param {number[]|string} S
 * @returns {number[]}
 */
function dom(S){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (S.length==0) return []; //1
  else{ //2
    var dom_rest=dom(S.slice(1));
    if (dom_rest.length==0) return S.slice(); //2.1
    else if (equal(dom_rest,[0])) return [0]; //2.2
    else{ //2.3
      if (lessThan(dom_rest,S)) return dom_rest; //2.3.1
      else{ //2.3.2
        var j=dom_rest.length;
        if (j==1){ //2.3.2.1
          if (equal(cod(S),[0,1])) return [0,1]; //2.3.2.1.1
          else return S.slice(); //2.3.2.1.2
        }else{ //2.3.2.2
          var delbr=dom_rest[0]-S[0]; //2.3.2.2.1.1
          var cod_rest=cod(S.slice(1));
          var delcp=cod_rest[cod_rest.length-1]-cod_rest[0]; //2.3.2.2.1.2
          if (delbr<delcp) return [0,1]; //2.3.2.2.2
          else return S.slice(); //2.3.2.2.3
        }
      }
    }
  }
  throw Error("No rule to compute dom of "+S);
}
/**
 * @param {number[]|string} S 
 * @param {number} T 
 * @returns {number[]}
 */
function fund(S,T){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)||T<0||!Number.isInteger(T)) throw Error("Invalid argument: "+S+";"+T);
  if (S.length==0) return []; //1
  else{ //2
    var i=S.length;
    var S_rest=S.slice(1);
    var dom_rest=dom(S_rest);
    if (dom_rest.length==0){ //2.1
      if (equal(dom(S),[0])) return []; //2.1.1
      else return [T]; //2.1.2
    }else if (equal(dom_rest,[0])) return S.slice(0,S.length-1); //2.2
    else{ //2.3
      if (lessThan(dom_rest,S)) return [S[0]].concat(fund(S_rest,T)); //2.3.1
      else{ //2.3.2
        var fund_S_T_minus_1=null;
        var cod_rest=null;
        var j=dom_rest.length;
        if (j==1){ //2.3.2.1
          if (equal(cod(S),[0,1])){ //2.3.2.1.1
            cod_rest=cod(S_rest);
            if (T!=0&&(fund_S_T_minus_1=fund(S,T-1))[0]==S[0]) return [S[0]].concat(fund(S_rest,cod_rest[cod_rest.length-1]-1),fund_S_T_minus_1.slice(1)); //2.3.2.1.1.1
            else return [S[0]].concat(fund(S_rest,cod_rest[cod_rest.length-1]-1)); //2.3.2.1.1.2
          }else return [S[0]].concat(fund(S_rest,T)); //2.3.2.1.2
        }else{ //2.3.2.2
          cod_rest=cod(S_rest);
          var delbr=dom_rest[0]-S[0]; //2.3.2.2.1.1
          var delcp=cod_rest[cod_rest.length-1]-cod_rest[0]; //2.3.2.2.1.2
          var del=cod_rest[cod_rest.length-1]-S[0]-1; //2.3.2.2.1.3
          var deldel=delcp-delbr-1; //2.3.2.2.1.4
          if (delbr<delcp){ //2.3.2.2.2
            var br=i-j+1;
            var S_to_br=S.slice(0,br);
            var fund_S_0;
            if (T!=0&&equal((fund_S_T_minus_1=fund(S,T-1)).slice(0,br),S_to_br)&&equal((fund_S_0=fund(S,0)).slice(0,br),S_to_br)) return fund_S_T_minus_1.concat(ascend(fund_S_0.slice(br),del-delbr,deldel,T)); //2.3.2.2.2.1
            else return S_to_br.concat(fund(S.slice(br),cod_rest[cod_rest.length-1]-1)); //2.3.2.2.2.2
          }else return [S[0]].concat(fund(S_rest,T)); //2.3.2.2.3
        }
      }
    }
  }
  throw Error("No rule to compute fund of "+S+";"+T);
}
function findOTPath(x,limit){
  if (!(x instanceof Array)) x=parseArray(x);
  if (!validIntegerArray(x)) throw Error("Invalid argument: "+x);
  if (typeof limit=="undefined"||limit==-1) limit=Infinity;
  if (equal(x,[0])){
    return {isStandard:true,path:[[0]],funds:[-1]};
  }else{
    var n=0;
    var t;
    while(n<=limit&&!lessThanOrEqual(x,limitOrd(n))){
      n++;
    };
    if (n>limit) return {isStandard:false,path:[],funds:[]};
    t=limitOrd(n);
    console.log(stringifyArray(t));
    var r={isStandard:false,path:[t],funds:[n]};
    while (!equal(x,t)){
      n=0;
      var nt;
      while (n<=limit&&lessThan(nt=fund(t,n),x)) n++;
      if (n>limit) return r;
      r.path.push(t=nt);
      r.funds.push(n);
      console.log(stringifyArray(nt));
    }
    r.isStandard=true;
    return r;
  }
}
function isStandard(x,limit){
  return findOTPath(x,limit).isStandard;
}
/**
 * @param {number} n 
 * @returns {number[]} (0,1,n)
 */
function limitOrd(n){
  return [0,1,n];
}
/**
 * @param {number[]|string} S 
 * @param {number} n 
 * @returns {number}
 */
function FGH(S,n){
  if (!(S instanceof Array)) S=parseArray(S);
  if (!validIntegerArray(S)) throw Error("Invalid argument: "+S);
  if (equal(S,"0")) return n+1;
  else if (equal(dom(S),[1])){
    var r=n;
    var X0=fund(S,0);
    for (var i=0;i<n;i++) r=FGH(X0,r);
    return r;
  }else return FGH(fund(S,n),n);
}
/**
 * @param {number} n 
 * @returns {number}
 */
function largeFunction(n){
  if (typeof n!="number") throw Error("Invalid argument");
  return FGH(limitOrd(n),n);
}
function calculateN(){
  var r=1e100;
  for (var i=0;i<1e100;i++) r=largeFunction(r);
  return r;
}

var input="";
var options={
  detail:undefined
}
var last=null;
function compute(){
  if (input==dg("input").value&&options.detail==dg("detail").checked) return;
  var oldinput=input;
  input=dg("input").value;
  options.detail=dg("detail").checked;
  if (oldinput!=input) last=[];
  var output="";
  var lines=input.split(lineBreakRegex);
  for (var l=0;l<lines.length;l++){
    var line=lines[l];
    var args=line.split(itemSeparatorRegex);
    var cmd=args.shift();
    output+=line+"\n";
    var result;
    if (oldinput!=input){
      try{
        if (cmd=="lessThan"||cmd=="<"){
          result=lessThan(args[0],args[1]);
        }else if (cmd=="lessThanOrEqual"||cmd=="<="){
          result=lessThanOrEqual(args[0],args[1]);
        }else if (cmd=="ascend"){
          result=ascend(args[0],+args[1],+args[2],+args[3]);
        }else if (cmd=="cod"){
          result=cod(args[0]);
        }else if (cmd=="dom"){
          result=dom(args[0]);
        }else if (cmd=="expand"){
          var t=parseArray(args[0]);
          result=[t];
          for (var i=1;i<args.length;i++){
            result.push(t=fund(t,+args[i]));
          }
        }else if (cmd=="isStandard"){
          result=findOTPath(args[0],args[1]||3);
        }else{
          result=null;
        }
      }catch(e){
        result=e;
        console.error(e);
      }
      last[l]=result;
    }else result=last[l];
    if (result instanceof Error){
      output+=result.stack?result.stack:result;
    }else if (cmd=="lessThan"||cmd=="<"){
      output+=result;
    }else if (cmd=="lessThanOrEqual"||cmd=="<="){
      output+=result;
    }else if (cmd=="ascend"){
      output+=stringifyArray(result);
    }else if (cmd=="cod"){
      output+=stringifyArray(result);
    }else if (cmd=="dom"){
      output+=stringifyArray(result);
    }else if (cmd=="expand"){
      if (options.detail){
        for (var i=1;i<result.length;i++){
          output+=stringifyArray(result[i-1])+"["+args[i]+"]="+stringifyArray(result[i])+(i==result.length-1?"":"\n");
        }
      }else{
        output+=stringifyArray(result[result.length-1]);
      }
    }else if (cmd=="isStandard"){
      if (options.detail){
        for (var i=1;i<result.path.length;i++){
          output+=stringifyArray(result.path[i-1])+"["+result.funds[i]+"]="+stringifyArray(result.path[i])+"\n";
        }
        if (result.isStandard) output+=stringifyArray(parseArray(args[0]))+"∈OT";
        else output+=stringifyArray(parseArray(args[0]))+"∉OT limited to n≦"+(args[1]||3);
      }else{
        output+=result.isStandard;
      }
    }else{
      output+="Unknown command "+cmd;
    }
    output+="\n\n";
  }
  dg("output").value=output;
}

var handlekey=function(e){}
//console.log=function (s){alert(s)};


var Notation=(function(){
  function __T(s){
    var t=String(s).trim();
    if(t===""||t==="()") return [];
    return parseArray(t);
  }
  function __eq(S,T){
    return S.length===T.length && S.every(function(x,i){ return x===T[i]; });
  }
  function norm(s){
    try {
      var a=(s instanceof Array)?s:__T(s);
      if(!validIntegerArray(a)) return null;
      return stringifyArray(a);
    } catch(e){ return null; }
  }
  return {
    parse: function(s){
      var t=String(s).trim();
      if(t==="") return "()";
      return norm(t);
    },
    format: function(m){ return String(m); },
    isSuccessor: function(m){
      try {
        var S=__T(m);
        var a0=fund(S,0), a1=fund(S,1);
        return __eq(a0,a1) ? true : false;
      } catch(e){ return true; }
    },
    generateLimit: function(k){
      try { return norm(limitOrd(Number(k)|0)); } catch(e){ return "()"; }
    },
    expand: function(m,n){
      try {
        if(!Number.isInteger(n)||n<0) return null;
        if(n>=1 && this.isSuccessor(m)) return null;
        var S=__T(m);
        if(!validIntegerArray(S)) return null;
        var r=norm(fund(S,n));
        if(r===null) return null;
        if(this.compare(r,m)>=0) return null;
        return r;
      } catch(e){ return null; }
    },
    compare: function(a,b){
      try {
        var S=__T(a), T=__T(b);
        if(__eq(S,T)) return 0;
        if(lessThan(S,T)) return -1;
        if(lessThan(T,S)) return 1;
        return 0;
      } catch(e){
        a=String(a); b=String(b);
        return a<b?-1:(a>b?1:0);
      }
    }
  };
})();
return Notation;
};
export const def_SPrDSS = define_classic_notation({
  id: "SPrDSS",
  name: "Subspecies primitive difference sequence",
  simple_name: "SPrDSS",
  category_id: "category-seq-diff",
  credit_text_id: 'credit.community',
  create: factory_SPrDSS,
});
register_notation(def_SPrDSS);
