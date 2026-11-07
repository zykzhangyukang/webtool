// 将 JSON 对象转换为 Java 类。嵌套对象生成内部静态类,数组取首个非空元素推断类型。

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'null', 'true', 'false',
])

const words = (s) => s.split(/[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean)
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1)

export function toClassName(key) {
  const name = words(key).map(cap).join('')
  return /^[A-Za-z_]/.test(name) ? cap(name) : `Item${cap(name)}`
}

export function toFieldName(key) {
  const w = words(key)
  let name = w.map((x, i) => (i === 0 ? x.charAt(0).toLowerCase() + x.slice(1) : cap(x))).join('')
  if (!/^[A-Za-z_$]/.test(name)) name = `_${name}`
  return JAVA_KEYWORDS.has(name) ? `${name}Value` : name
}

/**
 * @param {*} value 已解析的 JSON
 * @param {{ rootName?: string, style?: 'lombok' | 'getset' | 'record', jackson?: boolean }} opt
 */
export function jsonToJava(value, opt = {}) {
  const { rootName = 'Root', style = 'lombok', jackson = true } = opt
  const classes = [] // { name, fields: [{ key, field, type }] }

  function typeOf(v, hint) {
    if (v === null || v === undefined) return 'Object'
    if (typeof v === 'string') return 'String'
    if (typeof v === 'boolean') return 'Boolean'
    if (typeof v === 'number') return Number.isInteger(v) ? (Math.abs(v) > 2147483647 ? 'Long' : 'Integer') : 'Double'
    if (Array.isArray(v)) {
      const first = v.find((x) => x !== null && x !== undefined)
      return `List<${first === undefined ? 'Object' : boxed(first, hint)}>`
    }
    return buildClass(hint, v)
  }

  const boxed = (v, hint) => typeOf(v, hint)

  function buildClass(name, obj) {
    // 同名类重复出现时加数字后缀
    let unique = name
    for (let i = 2; classes.some((c) => c.name === unique); i++) unique = `${name}${i}`
    const cls = { name: unique, fields: [] }
    classes.push(cls)
    for (const [key, v] of Object.entries(obj)) {
      cls.fields.push({ key, field: toFieldName(key), type: typeOf(v, toClassName(key)) })
    }
    return unique
  }

  const root = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : { value }
  buildClass(toClassName(rootName), Array.isArray(value) ? { items: value } : root)

  const imports = new Set()
  const allTypes = classes.flatMap((c) => c.fields.map((f) => f.type)).join(' ')
  if (allTypes.includes('List<')) imports.add('java.util.List')
  if (jackson) imports.add('com.fasterxml.jackson.annotation.JsonProperty')
  if (style === 'lombok') imports.add('lombok.Data')

  const render = (cls, indent) => {
    const p = ' '.repeat(indent)
    const ann = (f) => (jackson && f.key !== f.field ? `${p}    @JsonProperty("${f.key}")\n` : '')
    if (style === 'record') {
      const comps = cls.fields
        .map((f) => `${p}    ${jackson && f.key !== f.field ? `@JsonProperty("${f.key}") ` : ''}${f.type} ${f.field}`)
        .join(',\n')
      return `${p}public record ${cls.name}(\n${comps}\n${p}) {}`
    }
    const fields = cls.fields.map((f) => `${ann(f)}${p}    private ${f.type} ${f.field};`).join('\n\n')
    if (style === 'lombok') return `${p}@Data\n${p}public static class ${cls.name} {\n${fields}\n${p}}`
    const accessors = cls.fields
      .map((f) => {
        const N = f.field.charAt(0).toUpperCase() + f.field.slice(1)
        return (
          `${p}    public ${f.type} get${N}() {\n${p}        return ${f.field};\n${p}    }\n\n` +
          `${p}    public void set${N}(${f.type} ${f.field}) {\n${p}        this.${f.field} = ${f.field};\n${p}    }`
        )
      })
      .join('\n\n')
    return `${p}public static class ${cls.name} {\n${fields}\n\n${accessors}\n${p}}`
  }

  const [main, ...inner] = classes
  const head = [...imports].sort().map((i) => `import ${i};`).join('\n')
  const mainRendered = render(main, 0).replace('public static class', 'public class').replace('public record', 'public record')
  const innerRendered = inner.map((c) => render(c, 4)).join('\n\n')
  // 把内部类放进主类/record 的末尾
  let body = mainRendered
  if (innerRendered) {
    body =
      style === 'record'
        ? mainRendered.replace(/\) \{\}$/, `) {\n\n${innerRendered}\n}`)
        : mainRendered.replace(/\n\}$/, `\n\n${innerRendered}\n}`)
  }
  return `${head ? head + '\n\n' : ''}${body}\n`
}
