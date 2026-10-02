// ============================================================================
//  core/ne/familyInput.js — ne 原生 generator 家族的输入解析
// ============================================================================
//  背景：家族输入解析原本只有一处 —— core/register.js 的 resolveFamilyInput，
//  它只认 window.NOTATION_FAMILIES（远古家族文件在自己的闭包里注册的）。
//  而 ne 原生记号（notation/ne/）的家族由 core/ne/registry.js 的
//  register_category + generator 管理，**两套互不通信**。
//
//  后果：停用远古条目后，输入「超出 initial 档位」的家族成员（如 30MN、9bm-bhm、
//  -1y-30ss）会失效。本模块补上 ne 侧这一环，供 core/register.js 在旧家族
//  未命中时兜底调用（阶段四接线）。
//
//  匹配策略：
//    1. 对每个带 generator 的分类，取 start 档实例的 id 当模板，
//       把其中「唯一的数字序列」换成捕获组，连字符/空格放宽为 [\s-]*，
//       整体大小写不敏感 —— 于是 `30-MN`、`30MN`、`30 mn` 都能命中。
//    2. 模板里数字不唯一的分类（如 GMS 的 `BMS-20260721-v10-...-n-2-P`）跳过，
//       那类记号仍可按完整 id 直接输入。
//    3. 命中后：已注册则直接返回；未注册则从当前档位逐档 generator_increment
//       到目标档（幂等），再返回。
// ============================================================================
import {
  get_notation,
  generator_can_increment,
  generator_current,
  generator_increment,
  list_categories,
} from './registry.js';

/** 取 id 模板的正则。档位取「最后一个数字序列」——`-1y-1ss` 里还有一个 `1y`，
 *  GMS 的 `BMS-20260721-v10-...-n-2-P` 前面更有一串数字，只有最后那个才是档位。 */
function family_matcher(cat) {
  let sampleId;
  try {
    sampleId = cat.generator.create(cat.generator.start).id;
  } catch {
    return null;
  }
  const lastDigit = (sampleId.match(/\d+(?!.*\d)/) || [])[0];
  if (lastDigit === undefined) return null;

  // ⚠ 连字符必须在转义集合里，否则下面 replace(/\\-/g) 匹配不到它（踩过）
  const escaped = sampleId.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const body = escaped
    .replace(/\d+(?!.*\d)/, '(\\d+)') // 最后一个数字 → 捕获组
    .replace(/\\-/g, '[\\s-]*'); // 连字符 → 可选连字符/空格（用户常写 30MN 而非 30-MN）
  return { regex: new RegExp('^' + body + '\\s*', 'i'), sampleId };
}

/** 把模板里最后一个数字换成目标档位，得到该档的 id。 */
function id_for(matcher, n) {
  return matcher.sampleId.replace(/\d+(?!.*\d)/, String(n));
}

/**
 * 尝试把输入解析成 ne generator 家族的成员。
 * @param {string} normalized 原始输入（未归一化也可以，本函数内部按 id 模板匹配）
 * @returns {{notationId: string, notationName: string, rest: string}|null}
 */
export function resolve_ne_family_input(normalized) {
  const input = String(normalized ?? '');
  if (!input.trim()) return null;

  for (const cat of list_categories()) {
    if (!cat.generator) continue;
    const matcher = family_matcher(cat);
    if (!matcher) continue;

    const m = input.match(matcher.regex);
    if (!m) continue;

    const n = parseInt(m[1], 10);
    if (!Number.isFinite(n)) continue;

    const gen = cat.generator;
    const start = gen.start;
    if (n < start) continue; // 交给调用方按原样报错，避免误吞其它输入

    const targetId = id_for(matcher, n);
    const rest = input.slice(m[0].length);

    // 已水合 → 直接用
    const existing = get_notation(targetId);
    if (existing) {
      return { notationId: targetId, notationName: existing.name ?? targetId, rest };
    }

    // 未水合 → 逐档生成到目标（generator_increment 一次一档）
    if (!generator_can_increment(cat.id)) continue;
    let guard = 0;
    while (generator_current(cat.id) < n && generator_can_increment(cat.id) && guard++ < 512) {
      generator_increment(cat.id);
    }

    const made = get_notation(targetId);
    if (made) {
      return { notationId: targetId, notationName: made.name ?? targetId, rest };
    }
  }
  return null;
}
