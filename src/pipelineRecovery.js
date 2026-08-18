const RETRYABLE=new Set(['timeout','rate_limit','temporary','network']);
export function recoveryAction(error={}){const kind=String(error.kind||'unknown');if(RETRYABLE.has(kind))return {action:'retry',preserve:true};if(kind==='invalid_input')return {action:'fix_input',preserve:true};return {action:'review',preserve:true};}
