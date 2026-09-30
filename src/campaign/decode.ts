/** Small typed decoders: every result is constructed from checked input, never JSON-cast. */
export type Decoder<T>=(value:unknown,path:string)=>T;
export function fail(path:string,message:string):never {throw new Error(`${path}: ${message}`);}
export function record(value:unknown,path:string):Record<string,unknown>{
  if(typeof value!=='object'||value===null||Array.isArray(value))return fail(path,'expected object');
  return Object.fromEntries(Object.entries(value));
}
export const text:Decoder<string>=(value,path)=>typeof value==='string'&&value.trim().length>0?value:fail(path,'expected non-empty string');
export const boolean:Decoder<boolean>=(value,path)=>typeof value==='boolean'?value:fail(path,'expected boolean');
export function integer(min=0,max=Number.MAX_SAFE_INTEGER):Decoder<number>{return(value,path)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max?value:fail(path,`expected integer ${min}..${max}`);}
export function oneOf<const T extends readonly (string|number)[]>(values:T):Decoder<T[number]>{
  return(value,path)=>{for(const option of values)if(value===option)return option;return fail(path,`expected ${values.join('|')}`);};
}
export function nullable<T>(decode:Decoder<T>):Decoder<T|null>{return(value,path)=>value===null?null:decode(value,path);}
export function array<T>(decode:Decoder<T>,min=0,max=10000):Decoder<T[]>{return(value,path)=>{
  if(!Array.isArray(value)||value.length<min||value.length>max)return fail(path,`expected array length ${min}..${max}`);
  return value.map((item,index)=>decode(item,`${path}[${index}]`));
};}
export function pair<T>(decode:Decoder<T>):Decoder<[T,T]>{return(value,path)=>{const items=array(decode,2,2)(value,path);return[items[0]!,items[1]!];};}
export function object<T>(fields:{[K in keyof T]-?:Decoder<T[K]>}):Decoder<T>{return(value,path)=>{
  const input=record(value,path),output:Partial<T>={};
  for(const key of Object.keys(input))if(!Object.prototype.hasOwnProperty.call(fields,key))fail(`${path}.${key}`,'unknown field');
  // Keys are from the declared decoder shape, and every assignment uses that field's decoder.
  for(const key of Object.keys(fields) as (keyof T)[])output[key]=fields[key](input[String(key)],`${path}.${String(key)}`);
  return output as T;
};}
export function union<T>(key:string,variants:Record<string,Decoder<T>>):Decoder<T>{return(value,path)=>{
  const input=record(value,path),tag=input[key];
  if(typeof tag!=='string'||!Object.prototype.hasOwnProperty.call(variants,tag))return fail(`${path}.${key}`,'unknown discriminator');
  return variants[tag]!(value,path);
};}
